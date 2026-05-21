import {
  type Country,
  type Crisis,
  type GameState,
  type AccessionProcess,
  type Notification,
  type NotificationType,
} from './gameState'
import { computeReadinessDelta, computeSatisfactionDelta, computeThreatDelta } from './budgetHelpers'
import { computeAccessionScore } from './accessionHelpers'
import { simulateMemberVotes } from './voteSimulator'
import { checkAdversaryReactions } from './adversaryReactions'
import { checkForNewCrises } from './crisisTriggers'
import { buildCrisis } from './crisisDefinitions'
import { hasTrait } from './countryTraits'

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

export function applyPassiveChanges(state: GameState): Partial<GameState> {
  const updatedCountries = { ...state.countries }
  const { allocation, memberEngagements } = state.budgetState
  const difficulty = state.difficulty ?? 'normal'

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
    if (iwSatBleed > 0 && hasTrait(id, 'cyber_target')) {
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

    // 4. Vote resolution: reveal 3 pending votes per turn from the snapshot
    if (updatedProc.stage === 'acceding' && updatedProc.pendingVoteSnapshot) {
      const snapshot  = updatedProc.pendingVoteSnapshot
      const votes     = { ...updatedProc.memberVotes }
      const pendingIds = Object.keys(votes).filter((k) => votes[k] === 'pending')
      const toResolve = pendingIds.slice(0, 3)
      for (const memberId of toResolve) {
        votes[memberId] = snapshot[memberId]
      }
      updatedProc = { ...updatedProc, memberVotes: votes }
    }

    nextAccessionProcesses[id] = updatedProc
  }

  // Check for newly triggered crises based on current game state (using updated IW)
  const triggeredCrises = checkForNewCrises({
    ...state,
    countries: updatedCountries,
    crises: nextCrises,
    accessionProcesses: nextAccessionProcesses,
    approvalRating,
    informationWarfare: { pressure: iwAfter },
  })
  if (triggeredCrises.length > 0) {
    nextCrises = [...nextCrises, ...triggeredCrises]
  }

  return {
    countries:          updatedCountries,
    approvalRating,
    accessionProcesses: nextAccessionProcesses,
    crises:             nextCrises,
    informationWarfare: { pressure: iwAfter },
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
    if (hasTrait(crisis.affectedCountryId, 'kingmaker')) {
      newNotifications.push({
        id: crypto.randomUUID(),
        text: `STRATEGIC CRISIS: ${countryName} has suspended NATO commitments — alliance cohesion at risk.`,
        turn: nextTurn,
        type: 'strategic_crisis' as NotificationType,
      })
    }
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
        .filter((c) => c.alignment === 'nato' && hasTrait(c.id, 'frontline') && !hasActiveForeignThreat(c.id))
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
