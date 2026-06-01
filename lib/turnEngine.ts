import {
  type Country,
  type Crisis,
  type CrisisPhase,
  type CrisisPhaseMode,
  type GameState,
  type AccessionProcess,
  type Notification,
  type NotificationType,
  type PendingEffect,
} from './gameState'
import { computeReadinessDelta, computeSatisfactionDelta, computeThreatDelta } from './budgetHelpers'
import { computeAccessionScore } from './accessionHelpers'
import { simulateMemberVotes } from './voteSimulator'
import { checkAdversaryReactions } from './adversaryReactions'
import { checkForNewCrises } from './crisisTriggers'
import { buildCrisis } from './crisisDefinitions'
import { hasTrait } from './countryTraits'
import { generateElectionNews } from './electionNews'

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// RAndD produces a multiplier used in Phase 4 crisis resolution.
// It is computed on demand rather than stored: 1 + allocation.RAndD / 100
// (e.g. allocation 50 → 1.5×, allocation 100 → 2×)
export function rdMultiplier(rAndDAllocation: number): number {
  return 1 + rAndDAllocation / 100
}

// Difficulty helpers (local copy — no import needed)
function adjustTurnsToResolve(base: number, difficulty: string): number {
  if (difficulty === 'diplomat') return base + 1
  if (difficulty === 'crisis')   return Math.max(1, base - 1)
  return base
}

// ── Crisis phase Markov machine ───────────────────────────────────────────────
// Transitions when turnsRemaining hits 0. Storm column biases up when adversary
// tension or IW pressure is elevated. Returns the next phase plus an optional
// notification to surface the transition to the player.

const PHASE_TRANSITIONS: Record<CrisisPhaseMode, Record<CrisisPhaseMode, number>> = {
  calm:   { calm: 0.50, normal: 0.40, storm: 0.10 },
  normal: { calm: 0.25, normal: 0.55, storm: 0.20 },
  storm:  { calm: 0.10, normal: 0.40, storm: 0.50 },
}

// Tunable scalars — exposed by name so the public/explainers/phase-machine.html
// balance explainer can round-trip them via a paste-back config.
const STORM_BIAS_AMOUNT       = 0.15  // shift toward storm column when tension is elevated
const BIAS_TRIGGER_THRESHOLD  = 70    // adversaryTension or IW pressure above this biases toward storm
const PHASE_DURATION_MIN      = 3     // inclusive lower bound (turns) for a new phase
const PHASE_DURATION_MAX      = 6     // inclusive upper bound (turns) for a new phase

const PHASE_TRANSITION_TEXT: Record<CrisisPhaseMode, string> = {
  calm:   'Geopolitical tensions easing — analysts expect a calm period ahead.',
  normal: 'Pressure normalising — situation room returns to standard tempo.',
  storm:  'Multiple flashpoints emerging — expect elevated crisis tempo.',
}

function rollPhaseTransition(from: CrisisPhaseMode, biasStorm: boolean): CrisisPhaseMode {
  const base = { ...PHASE_TRANSITIONS[from] }
  if (biasStorm) {
    // Shift toward storm, proportionally subtracted from calm & normal.
    const shift = STORM_BIAS_AMOUNT
    const giveup = base.calm + base.normal
    if (giveup > 0) {
      const calmCut = (base.calm / giveup) * shift
      const normalCut = (base.normal / giveup) * shift
      base.calm   = Math.max(0, base.calm - calmCut)
      base.normal = Math.max(0, base.normal - normalCut)
      base.storm  = Math.min(1, base.storm + shift)
    }
  }
  const r = Math.random()
  let acc = 0
  for (const mode of ['calm', 'normal', 'storm'] as CrisisPhaseMode[]) {
    acc += base[mode]
    if (r <= acc) return mode
  }
  return 'normal'
}

function tickCrisisPhase(state: GameState): { phase: CrisisPhase; note: Notification | null } {
  const prev = state.crisisPhase ?? { mode: 'normal' as CrisisPhaseMode, turnsRemaining: 4 }
  const tr   = prev.turnsRemaining - 1
  if (tr > 0) {
    return { phase: { mode: prev.mode, turnsRemaining: tr }, note: null }
  }
  // Time to roll. Bias toward storm if tension or IW pressure is elevated.
  const biasStorm =
    state.adversaryTension > BIAS_TRIGGER_THRESHOLD ||
    (state.informationWarfare?.pressure ?? 0) > BIAS_TRIGGER_THRESHOLD
  const nextMode  = rollPhaseTransition(prev.mode, biasStorm)
  const span      = PHASE_DURATION_MAX - PHASE_DURATION_MIN + 1
  const duration  = PHASE_DURATION_MIN + Math.floor(Math.random() * span)
  const note: Notification | null = nextMode !== prev.mode
    ? {
        id: crypto.randomUUID(),
        text: PHASE_TRANSITION_TEXT[nextMode],
        turn: state.turn + 1,
        type: 'info' as NotificationType,
      }
    : null
  return { phase: { mode: nextMode, turnsRemaining: duration }, note }
}

export function applyPassiveChanges(
  state: GameState,
): Partial<GameState> & {
  phaseTransitionNote?: Notification
  voteRevealNotes?: Notification[]
  newElectionEffects?: PendingEffect[]
} {
  const updatedCountries = { ...state.countries }
  const { allocation, memberEngagements } = state.budgetState
  const difficulty = state.difficulty ?? 'normal'

  // ── Crisis phase tick ──────────────────────────────────────────────────────
  const phaseTick = tickCrisisPhase(state)
  const voteRevealNotes: Notification[] = []

  // ── Information warfare pressure tick ──────────────────────────────────────
  // Climbs with adversaryTension, drained by combined cyberDefence + comms.
  // High pressure also bleeds satisfaction from cyber_target members.
  const iwGain   = state.adversaryTension / 40
  const iwDrain  = (allocation.cyberDefence + allocation.communications) / 30
  const iwBefore = state.informationWarfare?.pressure ?? 20
  const iwAfter  = clamp(iwBefore + iwGain - iwDrain, 0, 100)
  const iwSatBleed = iwAfter > 70 ? 0.5 : 0

  for (const id of Object.keys(updatedCountries)) {
    const c = updatedCountries[id]

    // --- Candidates: partnerAid grows accession score ---
    if (c.alignment === 'candidate') {
      const gain = allocation.partnerAid / 100
      if (gain > 0) {
        const current = c.accessionScore ?? 0
        updatedCountries[id] = { ...c, accessionScore: clamp(current + gain, 0, 100) }
      }
      continue
    }

    if (c.alignment !== 'nato') continue

    const next: Partial<Country> = {}

    // Under-spenders accumulate domestic fiscal pressure (10% faster in crisis mode)
    if (c.gdpDefencePercent < 2.0) {
      const fiscalIncrement = difficulty === 'crisis' ? 2 * 1.1 : 2
      next.fiscalPressure = clamp(c.fiscalPressure + fiscalIncrement, 0, 100)
    }

    // partnerAid: eases fiscal pressure for stretched members
    if (c.fiscalPressure > 40) {
      const fiscalReduction = allocation.partnerAid / 60
      const fiscalBefore = next.fiscalPressure ?? c.fiscalPressure
      next.fiscalPressure = clamp(fiscalBefore - fiscalReduction, 0, 100)
    }

    // Readiness: GDP drift + budget allocation drift (via shared helper)
    const readinessDelta = computeReadinessDelta(c, allocation)
    if (readinessDelta !== 0) next.readiness = clamp(c.readiness + readinessDelta, 0, 100)

    // Threat: cyber defence reduction (via shared helper)
    const threatDelta = computeThreatDelta(c, allocation)
    if (threatDelta !== 0) next.threatLevel = clamp(c.threatLevel + threatDelta, 5, 100)

    // Satisfaction: threat boost + peace dividend + communications (via shared helper)
    const isEngaged = (memberEngagements[id] ?? 0) > 0
    const satDelta = computeSatisfactionDelta(c, allocation, isEngaged, state.turn)
    if (satDelta !== 0) {
      next.allianceSatisfaction = clamp(c.allianceSatisfaction + satDelta, 0, 100)
    }

    // IW bleed: cyber_target members lose satisfaction while IW pressure is high
    if (iwSatBleed > 0 && hasTrait(id, 'cyber_target', c.runtimeTraits)) {
      const base = next.allianceSatisfaction ?? c.allianceSatisfaction
      next.allianceSatisfaction = clamp(base - iwSatBleed, 0, 100)
    }

    // Track consecutive high-fiscal turns and turns without engagement for crisis triggers
    next.highFiscalTurns = c.fiscalPressure > 72 ? (c.highFiscalTurns ?? 0) + 1 : 0
    next.turnsWithoutEngagement = isEngaged ? 0 : (c.turnsWithoutEngagement ?? 0) + 1

    if (Object.keys(next).length > 0) {
      updatedCountries[id] = { ...c, ...next }
    }
  }

  // ── Global recalculations ─────────────────────────────────────────────────

  // Population-weighted readiness across all NATO members
  const natoMembers = Object.values(updatedCountries).filter((c) => c.alignment === 'nato')
  const totalPop = natoMembers.reduce((sum, c) => sum + c.population, 0)
  const weightedReadiness =
    totalPop > 0
      ? natoMembers.reduce((sum, c) => sum + c.readiness * c.population, 0) / totalPop
      : 0

  // Approval rating: cumulative delta each turn
  // In diplomat mode the unhappy-member penalty is halved; normal/crisis unchanged
  const unhappyCount   = natoMembers.filter((c) => c.allianceSatisfaction < 40).length
  const unhappyPenalty = difficulty === 'diplomat' ? 1 : 2
  const approvalDelta  = (weightedReadiness > 70 ? 1 : 0) - unhappyCount * unhappyPenalty
  const approvalRating = clamp(state.approvalRating + approvalDelta, 0, 100)

  // ── Accession processing ──────────────────────────────────────────────────
  // Work on a mutable copy of crises so adversary reactions can append.
  let nextCrises = [...state.crises]

  // We also need a mutable countries reference for adversary-reaction side-effects.
  // updatedCountries is already a shallow copy — we'll update it in-place below.

  const nextAccessionProcesses: Record<string, AccessionProcess> = {}

  for (const [id, proc] of Object.entries(state.accessionProcesses)) {
    const country = updatedCountries[id]
    if (!country) {
      nextAccessionProcesses[id] = proc
      continue
    }

    // 1. Score drift: move stored score toward computeAccessionScore target by ≤5/turn
    const target = computeAccessionScore(country, state)
    const diff   = target - proc.score
    const step   = diff > 0 ? Math.min(5, diff) : Math.max(-5, diff)
    let updatedProc: AccessionProcess = {
      ...proc,
      score: clamp(Math.round(proc.score + step), 0, 100),
    }

    // 2. Auto-advance dialogue → map (score ≥ 80, ≥ 3 turns in stage)
    if (
      updatedProc.stage === 'dialogue' &&
      updatedProc.score >= 80 &&
      updatedProc.turnsInStage >= 3
    ) {
      updatedProc = { ...updatedProc, stage: 'map', turnsInStage: 0 }

      // Run adversary reaction check using a snapshot of the mid-turn state
      const midState: GameState = {
        ...state,
        countries: updatedCountries,
        crises: nextCrises,
        accessionProcesses: { ...state.accessionProcesses, [id]: updatedProc },
      }
      const reacted = checkAdversaryReactions(id, 'map', midState)
      // Merge back: overwrite countries and crises with reaction results
      Object.assign(updatedCountries, reacted.countries)
      nextCrises = reacted.crises
      updatedProc = reacted.accessionProcesses[id] ?? updatedProc
    }

    // 3. Partner frustration: +5/turn when stuck in MAP beyond 8 turns
    if (updatedProc.stage === 'map' && updatedProc.turnsInStage > 8) {
      updatedProc = {
        ...updatedProc,
        partnerFrustration: updatedProc.partnerFrustration + 5,
      }
    }

    // 4. Vote resolution: reveal 3 pending votes per turn from the snapshot.
    //    Any 'no' vote revealed this turn surfaces as a notification so the
    //    player understands why ratification stalls.
    if (updatedProc.stage === 'acceding' && updatedProc.pendingVoteSnapshot) {
      const snapshot  = updatedProc.pendingVoteSnapshot
      const votes     = { ...updatedProc.memberVotes }
      const pendingIds = Object.keys(votes).filter((k) => votes[k] === 'pending')
      const toResolve = pendingIds.slice(0, 3)
      for (const memberId of toResolve) {
        votes[memberId] = snapshot[memberId]
        if (snapshot[memberId] === 'no') {
          const voterName = updatedCountries[memberId]?.name ?? memberId
          const candidateName = updatedCountries[id]?.name ?? id
          voteRevealNotes.push({
            id: crypto.randomUUID(),
            text: `${voterName} votes NO on ${candidateName} accession — ratification stalled (unanimous consent required).`,
            turn: state.turn + 1,
            type: 'accession_update' as NotificationType,
          })
        }
      }
      updatedProc = { ...updatedProc, memberVotes: votes }
    }

    nextAccessionProcesses[id] = updatedProc
  }

  // Check for newly triggered crises based on current game state (using updated IW + phase)
  const triggeredCrises = checkForNewCrises({
    ...state,
    countries: updatedCountries,
    crises: nextCrises,
    accessionProcesses: nextAccessionProcesses,
    approvalRating,
    informationWarfare: { pressure: iwAfter },
    crisisPhase: phaseTick.phase,
  })
  if (triggeredCrises.length > 0) {
    nextCrises = [...nextCrises, ...triggeredCrises]
  }

  // ── Election news flavor ──────────────────────────────────────────────────
  // Generate any per-country election headlines that should fire next turn.
  const newElectionEffects = generateElectionNews(state)

  return {
    countries:          updatedCountries,
    approvalRating,
    accessionProcesses: nextAccessionProcesses,
    crises:             nextCrises,
    informationWarfare: { pressure: iwAfter },
    crisisPhase:        phaseTick.phase,
    ...(phaseTick.note ? { phaseTransitionNote: phaseTick.note } : {}),
    ...(voteRevealNotes.length > 0 ? { voteRevealNotes } : {}),
    ...(newElectionEffects.length > 0 ? { newElectionEffects } : {}),
  }
}

// ── Escalation side effects ───────────────────────────────────────────────────
// Trait lookups (kingmaker, frontline) are the single source of truth here —
// the previous STRATEGIC_ANCHORS / ADVERSARY_BORDER_MEMBERS sets have moved
// into lib/countryTraits.ts.

interface EscalationResult {
  newCrises: Crisis[]
  newNotifications: Notification[]
  countries: Record<string, Country>
  article5Active: boolean
  informationWarfareDelta: number
}

export function handleEscalationSideEffects(
  crisis: Crisis,
  countries: Record<string, Country>,
  article5Active: boolean,
  nextTurn: number,
  allCurrentCrises: Crisis[],
  baseState: GameState,
): EscalationResult {
  const difficulty = baseState.difficulty ?? 'normal'
  const newCrises: Crisis[] = []
  const newNotifications: Notification[] = []
  let updatedCountries = countries
  let updatedArticle5  = article5Active
  let iwDelta = 0

  // Hybrid attack escalation pumps IW pressure upward
  if (crisis.type === 'hybrid_attack') {
    iwDelta += 8
  }

  const country     = countries[crisis.affectedCountryId]
  const countryName = country?.name ?? crisis.affectedCountryId

  // FOREIGN THREAT → Article 5 when threat exceeds 80 post-escalation
  if (crisis.type === 'foreign_threat') {
    if ((country?.threatLevel ?? 0) > 80 && !updatedArticle5) {
      updatedArticle5 = true
      const snap: GameState = { ...baseState, countries }
      newCrises.push(buildCrisis('article5', crisis.affectedCountryId, snap))
    }
  }

  // WITHDRAWAL THREAT → strategic_crisis notification for anchor (kingmaker) members
  if (crisis.type === 'withdrawal_threat') {
    if (hasTrait(crisis.affectedCountryId, 'kingmaker', countries[crisis.affectedCountryId]?.runtimeTraits)) {
      newNotifications.push({
        id: crypto.randomUUID(),
        text: `STRATEGIC CRISIS: ${countryName} has suspended NATO commitments — alliance cohesion at risk.`,
        turn: nextTurn,
        type: 'strategic_crisis' as NotificationType,
      })
    }
  }

  // NON-ALIGNED ELECTION → permanently mark eurosceptic; flip to neutral if morale collapsed
  if (crisis.type === 'non_aligned_election' && country) {
    const existingTraits = country.runtimeTraits ?? []
    const nextTraits = existingTraits.includes('eurosceptic')
      ? existingTraits
      : ([...existingTraits, 'eurosceptic'] as typeof existingTraits)
    let updatedCountry: Country = { ...country, runtimeTraits: nextTraits }
    // If satisfaction has collapsed and the country isn't a kingmaker, alignment flips.
    if (
      country.allianceSatisfaction < 30 &&
      !hasTrait(country.id, 'kingmaker', existingTraits)
    ) {
      updatedCountry = { ...updatedCountry, alignment: 'neutral' }
      newNotifications.push({
        id: crypto.randomUUID(),
        text: `${countryName} suspends NATO participation following election results.`,
        turn: nextTurn,
        type: 'strategic_crisis' as NotificationType,
      })
    } else {
      newNotifications.push({
        id: crypto.randomUUID(),
        text: `${countryName}'s alliance posture cools further — country now structurally eurosceptic.`,
        turn: nextTurn,
        type: 'info' as NotificationType,
      })
    }
    updatedCountries = { ...updatedCountries, [crisis.affectedCountryId]: updatedCountry }
  }

  // BUDGET CUT → GDP -0.4; if readiness < 45, cascade FOREIGN THREAT to most-exposed border member
  if (crisis.type === 'budget_cut' && country) {
    const newGdp = Math.max(0, country.gdpDefencePercent - 0.4)
    updatedCountries = {
      ...updatedCountries,
      [crisis.affectedCountryId]: { ...country, gdpDefencePercent: newGdp },
    }
    const natoMembers = Object.values(updatedCountries).filter((c) => c.alignment === 'nato')
    const avgReadiness =
      natoMembers.length > 0
        ? natoMembers.reduce((sum, c) => sum + c.readiness, 0) / natoMembers.length
        : 100
    if (avgReadiness < 45) {
      const hasActiveForeignThreat = (id: string) =>
        allCurrentCrises.some(
          (c) =>
            c.type === 'foreign_threat' &&
            c.affectedCountryId === id &&
            (c.status === 'active' || c.status === 'pending'),
        )
      const target = Object.values(updatedCountries)
        .filter((c) => c.alignment === 'nato' && hasTrait(c.id, 'frontline', c.runtimeTraits) && !hasActiveForeignThreat(c.id))
        .sort((a, b) => b.threatLevel - a.threatLevel)[0]
      if (target) {
        const snap: GameState = { ...baseState, countries: updatedCountries }
        newCrises.push(buildCrisis('foreign_threat', target.id, snap))
      }
    }
  }

  // Apply difficulty modifier to turnsToResolve on every spawned crisis
  const adjustedCrises = newCrises.map((c) => ({
    ...c,
    turnsToResolve: adjustTurnsToResolve(c.turnsToResolve, difficulty),
  }))
  return {
    newCrises: adjustedCrises,
    newNotifications,
    countries: updatedCountries,
    article5Active: updatedArticle5,
    informationWarfareDelta: iwDelta,
  }
}
