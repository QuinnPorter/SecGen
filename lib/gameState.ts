import { create } from 'zustand'
import countriesData from '../data/countries.json'
import { applyPassiveChanges, handleEscalationSideEffects } from './turnEngine'
import { simulateMemberVotes } from './voteSimulator'
import { checkAdversaryReactions } from './adversaryReactions'
import { checkVictoryConditions, type VictoryResult } from './victoryConditions'
import { saveGame } from './persistence'
import { checkForScenarios, SCENARIOS } from './scenarios'
import { PC_COST_ENGAGE, PC_COST_DIALOGUE, PC_COST_ADVANCE_ACCESSION } from './constants'
export type { VictoryResult }

export interface Country {
  id: string
  name: string
  alignment: 'nato' | 'neutral' | 'adversary' | 'candidate'
  region: string
  readiness: number          // 0–100, NATO members only
  fiscalPressure: number     // 0–100
  allianceSatisfaction: number // 0–100
  threatLevel: number        // 0–100
  gdpDefencePercent: number  // e.g. 1.8 for 1.8%
  population: number         // millions
  notes: string
  accessionScore?: number    // 0–100, candidates only; drives Phase 3 accession pipeline
  inAccessionProcess?: boolean // true while an AccessionProcess is active for this country
  highFiscalTurns?: number        // consecutive turns with fiscalPressure > 72
  turnsWithoutEngagement?: number // consecutive turns without memberEngagement
}

export interface BudgetAllocation {
  troopReadiness: number
  RAndD: number
  cyberDefence: number
  partnerAid: number
  communications: number
}

export interface BudgetState {
  totalPoliticalCapital: number
  spentThisTurn: number
  allocation: BudgetAllocation
  memberEngagements: Record<string, number> // ISO code → turns remaining
  turkeyEngaged: boolean                    // set permanently once TUR is engaged
}

export type ViewMode = 'world' | 'nato-area'
export type Difficulty = 'diplomat' | 'normal' | 'crisis'

export type AccessionStage =
  | 'none'
  | 'dialogue'
  | 'map'
  | 'invitation'
  | 'acceding'

export type CrisisType =
  | 'budget_cut'
  | 'foreign_threat'
  | 'withdrawal_threat'
  | 'adversary_reaction'
  | 'hybrid_attack'
  | 'political_instability'
  | 'energy_crisis'
  | 'article5'

export type CrisisStatus = 'pending' | 'active' | 'resolved' | 'escalated' | 'ignored'

export interface CrisisOption {
  id: string
  label: string
  description: string
  capitalCost: number
  consequences: {
    immediate: string
    delayed: string
  }
  effects: Partial<Record<string, number>>
  // keys: stat names on affectedCountry (allianceSatisfaction, fiscalPressure, readiness,
  //   threatLevel, gdpDefencePercent) or special globals: 'approvalRating', 'adversaryTension'
}

export interface Crisis {
  id: string
  type: CrisisType
  status: CrisisStatus
  affectedCountryId: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  turnsUntilActive: number  // countdown before it becomes active
  turnsActive: number       // how long it has been active (or turns since resolution for delay tracking)
  turnsToResolve: number    // turns before auto-escalation if still active
  options: CrisisOption[]
  chosenOptionId: string | null
  delayedEffectApplied: boolean
  resolvedAtTurn?: number
}

export type NotificationType = 'delayed_effect' | 'crisis_escalation' | 'strategic_crisis' | 'accession_update' | 'info'

export interface Notification {
  id: string
  text: string
  turn: number
  type: NotificationType
}

export interface TurnSummaryData {
  prevQuarter: 1 | 2 | 3 | 4
  prevYear: number
  readinessDelta: number
  pcReplenished: number
  delayedEffects: string[]
  accessionChanges: Array<{ countryName: string; scoreDelta: number }>
  alignmentChanges: Array<{ countryName: string; from: string; to: string }>
  upcomingCrises: number
}

export interface PendingEffect {
  id: string
  crisisId: string
  turnsRemaining: number
  affectedCountryId: string
  effects: Partial<Record<string, number>>
  flavourText: string  // shown in sidebar when it fires
  applied: boolean
}

export interface AccessionProcess {
  countryId: string
  stage: AccessionStage
  score: number               // 0–100, synced from country.accessionScore each turn
  turnsInStage: number        // turns elapsed at current stage
  memberVotes: Record<string, 'yes' | 'no' | 'abstain' | 'pending'>
  adversaryReactionTriggered: boolean
  partnerFrustration: number  // accumulates +5/turn after 8 turns stuck in MAP
  pendingVoteSnapshot?: Record<string, 'yes' | 'no' | 'abstain'> // computed when entering acceding; votes reveal from here
}

export interface GameState {
  turn: number
  year: number
  quarter: 1 | 2 | 3 | 4
  approvalRating: number
  selectedCountry: string | null
  viewMode: ViewMode
  countries: Record<string, Country>
  budgetState: BudgetState
  accessionProcesses: Record<string, AccessionProcess>
  crises: Crisis[]
  adversaryTension: number    // 0–100, global adversary tension, starts at 30
  article5Active: boolean     // true while an article5 crisis is active or pending
  pendingEffects: PendingEffect[]
  resolvedCrises: Crisis[]
  notifications: Notification[]
  lowReadinessTurns: number    // consecutive turns allianceReadiness < 20
  lowApprovalTurns: number     // consecutive turns approvalRating < 15
  gameOutcome: VictoryResult | null
  initialMemberCount: number   // NATO member count at game start
  withdrawnMembers: string[]   // country IDs that withdrew during play
  totalPCSpent: number         // cumulative political capital spent across all turns
  totalEngagements: number     // total engageMember calls
  countriesInDialogue: number  // unique countries where dialogue was initiated
  turnsWithHighReadiness: number // turns where allianceReadiness > 70
  scenarioMode: 'historical' | 'alternate'
  difficulty: Difficulty
  triggeredScenarios: string[] // scenario IDs that have fired (ever)
  activeScenarios: string[]    // scenario IDs awaiting player choice
  showTurnSummary: boolean
  turnSummaryData: TurnSummaryData | null

  selectCountry: (id: string | null) => void
  dismissTurnSummary: () => void
  setViewMode: (mode: ViewMode) => void
  setAllocation: (key: keyof BudgetAllocation, value: number) => void
  setFullAllocation: (allocation: BudgetAllocation) => void
  engageMember: (countryId: string) => void
  replenishCapital: () => void
  advanceTurn: () => void
  registerCountry: (country: Country) => void
  initiateDialogue: (countryId: string) => void
  advanceAccession: (countryId: string) => void
  finaliseAccession: (countryId: string) => void
  resolveCrisis: (crisisId: string, optionId: string) => void
  ignoreCrisis: (crisisId: string) => void
  escalateCrisis: (crisisId: string) => void
  applyScenarioChoice: (scenarioId: string, choiceId: string) => void
  startNewGame: (config: { scenarioMode: 'historical' | 'alternate'; difficulty: Difficulty }) => void
  resetGame: () => void
}

// ── Crisis helpers ────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

const COUNTRY_STAT_KEYS = new Set<string>([
  'allianceSatisfaction', 'fiscalPressure', 'readiness', 'threatLevel', 'gdpDefencePercent',
])

// Penalties applied to the affected country when a crisis escalates, keyed by severity.
// 'approvalRating' is a global effect handled separately.
const ESCALATION_PENALTIES: Record<string, Partial<Record<string, number>>> = {
  low:      { allianceSatisfaction: -5,  fiscalPressure: 5 },
  medium:   { allianceSatisfaction: -10, fiscalPressure: 8 },
  high:     { allianceSatisfaction: -15, fiscalPressure: 12, readiness: -5 },
  critical: { allianceSatisfaction: -20, fiscalPressure: 15, readiness: -10, threatLevel: 10 },
}

// Applies a CrisisOption's effects dict to the relevant country/global stats.
// Returns new countries map, updated approvalRating, and updated adversaryTension.
function applyCrisisEffects(
  effects: Partial<Record<string, number>>,
  affectedCountryId: string,
  ctx: { countries: Record<string, Country>; approvalRating: number; adversaryTension: number },
): { countries: Record<string, Country>; approvalRating: number; adversaryTension: number } {
  let { countries, approvalRating, adversaryTension } = ctx

  for (const [key, delta] of Object.entries(effects)) {
    if (!delta) continue
    if (key === 'approvalRating') {
      approvalRating = clamp(approvalRating + delta, 0, 100)
      continue
    }
    if (key === 'adversaryTension') {
      adversaryTension = clamp(adversaryTension + delta, 0, 100)
      continue
    }
    if (key === '_allMemberSatisfaction') {
      const updated: Record<string, Country> = {}
      for (const [cId, c] of Object.entries(countries)) {
        if (c.alignment === 'nato') {
          updated[cId] = { ...c, allianceSatisfaction: clamp(c.allianceSatisfaction + delta, 0, 100) }
        }
      }
      countries = { ...countries, ...updated }
      continue
    }
    if (!COUNTRY_STAT_KEYS.has(key)) continue
    const country = countries[affectedCountryId]
    if (!country) continue
    const current = country[key as keyof Country]
    if (typeof current !== 'number') continue
    countries = {
      ...countries,
      [affectedCountryId]: { ...country, [key]: clamp(current + delta, 0, 100) },
    }
  }

  return { countries, approvalRating, adversaryTension }
}

// ── Budget helpers ─────────────────────────────────────────────────────────────

const ALLOCATION_KEYS: Array<keyof BudgetAllocation> = [
  'troopReadiness', 'RAndD', 'cyberDefence', 'partnerAid', 'communications',
]

const INITIAL_ALLOCATION: BudgetAllocation = {
  troopReadiness: 40,
  RAndD:          15,
  cyberDefence:   20,
  partnerAid:     15,
  communications: 10,
}

const INITIAL_BUDGET: BudgetState = {
  totalPoliticalCapital: 100,
  spentThisTurn: 0,
  allocation: INITIAL_ALLOCATION,
  memberEngagements: {},
  turkeyEngaged: false,
}

// ── Difficulty helpers ────────────────────────────────────────────────────────

export function adjustTurnsToResolve(base: number, difficulty: string): number {
  if (difficulty === 'diplomat') return base + 1
  if (difficulty === 'crisis')   return Math.max(1, base - 1)
  return base
}

// ── Scenario-mode helpers ─────────────────────────────────────────────────────

const DEFAULT_SCENARIO_MODE: 'historical' | 'alternate' = 'alternate'

// In 'alternate' mode FIN and SWE begin as neutral so "The Nordic Question"
// scenario can fire.  In 'historical' they start as full NATO members.
function makeInitialCountries(
  mode: 'historical' | 'alternate',
): Record<string, Country> {
  const base = countriesData as Record<string, Country>
  if (mode !== 'alternate') return base
  return {
    ...base,
    FIN: { ...base['FIN'], alignment: 'neutral' },
    SWE: { ...base['SWE'], alignment: 'neutral' },
  }
}

const INITIAL_COUNTRIES = makeInitialCountries(DEFAULT_SCENARIO_MODE)
const INITIAL_MEMBER_COUNT = Object.values(INITIAL_COUNTRIES).filter(
  (c) => c.alignment === 'nato',
).length

// ─────────────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>((set, get) => ({
  turn: 1,
  year: 2024,
  quarter: 1 as const,
  approvalRating: 65,
  selectedCountry: null,
  viewMode: 'world',
  countries: INITIAL_COUNTRIES,
  budgetState: INITIAL_BUDGET,
  accessionProcesses: {},
  crises: [],
  adversaryTension: 30,
  article5Active: false,
  pendingEffects: [],
  notifications: [],
  resolvedCrises: [],
  lowReadinessTurns: 0,
  lowApprovalTurns: 0,
  gameOutcome: null,
  initialMemberCount: INITIAL_MEMBER_COUNT,
  withdrawnMembers: [],
  totalPCSpent: 0,
  totalEngagements: 0,
  countriesInDialogue: 0,
  turnsWithHighReadiness: 0,
  scenarioMode: DEFAULT_SCENARIO_MODE,
  difficulty: 'normal' as Difficulty,
  triggeredScenarios: [],
  activeScenarios: [],
  showTurnSummary: false,
  turnSummaryData: null,

  selectCountry: (id) => set({ selectedCountry: id }),
  dismissTurnSummary: () => set({ showTurnSummary: false }),
  setViewMode: (mode) => set({ viewMode: mode }),

  registerCountry: (country) =>
    set((state) => {
      if (state.countries[country.id]) return state
      return { countries: { ...state.countries, [country.id]: country } }
    }),

  setAllocation: (key, value) =>
    set((state) => {
      const alloc = state.budgetState.allocation
      const clamped = Math.max(0, Math.min(100, value))
      const others = ALLOCATION_KEYS.filter((k) => k !== key)
      const otherSum = others.reduce((sum, k) => sum + alloc[k], 0)
      const allowedOtherSum = 100 - clamped

      let newAlloc: BudgetAllocation

      if (otherSum === 0 || otherSum <= allowedOtherSum) {
        // Others fit within budget — just update the target key
        newAlloc = { ...alloc, [key]: clamped }
      } else {
        // Scale others down proportionally with floor, then distribute remainder
        const scale = allowedOtherSum / otherSum
        const floored: Partial<BudgetAllocation> = {}
        let flouredSum = 0
        for (const k of others) {
          floored[k] = Math.floor(alloc[k] * scale)
          flouredSum += floored[k]!
        }
        // Give rounding remainder to the other with the highest original value
        const remainder = allowedOtherSum - flouredSum
        if (remainder > 0) {
          const largest = others.reduce((a, b) => (alloc[a] >= alloc[b] ? a : b))
          floored[largest] = floored[largest]! + remainder
        }
        newAlloc = { ...alloc, [key]: clamped, ...floored }
      }

      return { budgetState: { ...state.budgetState, allocation: newAlloc } }
    }),

  setFullAllocation: (allocation) =>
    set((state) => ({
      budgetState: { ...state.budgetState, allocation },
    })),

  engageMember: (countryId) =>
    set((state) => {
      const { totalPoliticalCapital, spentThisTurn, memberEngagements } = state.budgetState
      if (totalPoliticalCapital < PC_COST_ENGAGE) return state // insufficient capital
      return {
        totalEngagements: state.totalEngagements + 1,
        budgetState: {
          ...state.budgetState,
          totalPoliticalCapital: totalPoliticalCapital - PC_COST_ENGAGE,
          spentThisTurn: spentThisTurn + PC_COST_ENGAGE,
          memberEngagements: { ...memberEngagements, [countryId]: 3 },
          turkeyEngaged: countryId === 'TUR' ? true : state.budgetState.turkeyEngaged,
        },
      }
    }),

  replenishCapital: () =>
    set((state) => ({
      budgetState: {
        ...state.budgetState,
        totalPoliticalCapital: Math.min(100, state.budgetState.totalPoliticalCapital + 10),
      },
    })),

  initiateDialogue: (countryId) =>
    set((state) => {
      const country = state.countries[countryId]
      if (!country) return state
      if (country.alignment !== 'candidate' && country.alignment !== 'neutral') return state
      if (state.accessionProcesses[countryId]) return state // already in process
      if (state.budgetState.totalPoliticalCapital < PC_COST_DIALOGUE) return state
      const process: AccessionProcess = {
        countryId,
        stage: 'dialogue',
        score: country.accessionScore ?? 0,
        turnsInStage: 0,
        memberVotes: {},
        adversaryReactionTriggered: false,
        partnerFrustration: 0,
      }
      return {
        countriesInDialogue: state.countriesInDialogue + 1,
        budgetState: {
          ...state.budgetState,
          totalPoliticalCapital: state.budgetState.totalPoliticalCapital - PC_COST_DIALOGUE,
          spentThisTurn: state.budgetState.spentThisTurn + PC_COST_DIALOGUE,
        },
        accessionProcesses: { ...state.accessionProcesses, [countryId]: process },
        countries: {
          ...state.countries,
          [countryId]: { ...country, inAccessionProcess: true },
        },
      }
    }),

  advanceAccession: (countryId) =>
    set((state) => {
      const process = state.accessionProcesses[countryId]
      if (!process) return state
      if (state.budgetState.totalPoliticalCapital < PC_COST_ADVANCE_ACCESSION) return state

      const { stage, score } = process

      // map → invitation requires score >= 80
      if (stage === 'map' && score < 80) return state

      const NEXT_STAGE: Partial<Record<AccessionStage, AccessionStage>> = {
        dialogue:   'map',
        map:        'invitation',
        invitation: 'acceding',
      }
      const nextStage = NEXT_STAGE[stage]
      if (!nextStage) return state // already acceding or none

      // invitation → acceding: simulate all votes up-front and store as a snapshot,
      // but mark every vote 'pending' so they reveal gradually each turn via turnEngine.
      let memberVotes = process.memberVotes
      let pendingVoteSnapshot = process.pendingVoteSnapshot
      if (stage === 'invitation') {
        const snapshot = simulateMemberVotes(countryId, state)
        pendingVoteSnapshot = snapshot
        memberVotes = Object.fromEntries(
          Object.keys(snapshot).map((k) => [k, 'pending' as const])
        )
      }

      const updatedProcess: AccessionProcess = {
        ...process,
        stage: nextStage,
        turnsInStage: 0,
        memberVotes,
        pendingVoteSnapshot,
      }

      const updatedBudget: BudgetState = {
        ...state.budgetState,
        totalPoliticalCapital: state.budgetState.totalPoliticalCapital - PC_COST_ADVANCE_ACCESSION,
        spentThisTurn: state.budgetState.spentThisTurn + PC_COST_ADVANCE_ACCESSION,
      }
      const updatedAccession = { ...state.accessionProcesses, [countryId]: updatedProcess }

      // dialogue → map: run adversary reaction check on a full-state snapshot
      if (nextStage === 'map') {
        const snapshot: GameState = {
          ...state,
          budgetState: updatedBudget,
          accessionProcesses: updatedAccession,
        }
        const reacted = checkAdversaryReactions(countryId, 'map', snapshot)
        return {
          countries:          reacted.countries,
          crises:             reacted.crises,
          accessionProcesses: reacted.accessionProcesses,
          budgetState:        updatedBudget,
        }
      }

      return {
        budgetState:        updatedBudget,
        accessionProcesses: updatedAccession,
      }
    }),

  finaliseAccession: (countryId) =>
    set((state) => {
      const process = state.accessionProcesses[countryId]
      if (!process || process.stage !== 'acceding') return state

      // All votes must be resolved (no pending) and unanimous (no 'no' votes)
      const votes = Object.values(process.memberVotes)
      if (votes.some((v) => v === 'pending') || votes.some((v) => v === 'no')) return state

      const updatedCountry: Country = {
        ...state.countries[countryId],
        alignment: 'nato',
        allianceSatisfaction: 70,
        inAccessionProcess: false,
      }
      const { [countryId]: _, ...remainingProcesses } = state.accessionProcesses

      return {
        countries: { ...state.countries, [countryId]: updatedCountry },
        accessionProcesses: remainingProcesses,
      }
    }),

  resolveCrisis: (crisisId, optionId) =>
    set((state) => {
      const crisis = state.crises.find((c) => c.id === crisisId)
      if (!crisis || crisis.status !== 'active') return state
      const option = crisis.options.find((o) => o.id === optionId)
      if (!option) return state
      if (state.budgetState.totalPoliticalCapital < option.capitalCost) return state

      // Apply immediate effects
      const { countries, approvalRating, adversaryTension } = applyCrisisEffects(
        option.effects,
        crisis.affectedCountryId,
        { countries: state.countries, approvalRating: state.approvalRating, adversaryTension: state.adversaryTension },
      )

      // Archive resolved crisis immediately — it leaves crises[]
      const archivedCrisis: Crisis = {
        ...crisis,
        status: 'resolved' as CrisisStatus,
        chosenOptionId: optionId,
        turnsActive: 0,
        resolvedAtTurn: state.turn,
      }
      const crises = state.crises.filter((c) => c.id !== crisisId)

      // Queue delayed effects — fire 3 turns after resolution
      const pendingEffect: PendingEffect = {
        id: crypto.randomUUID(),
        crisisId,
        turnsRemaining: 3,
        affectedCountryId: crisis.affectedCountryId,
        effects: option.effects,
        flavourText: option.consequences.delayed,
        applied: false,
      }

      return {
        countries,
        approvalRating,
        adversaryTension,
        crises,
        resolvedCrises: [...state.resolvedCrises, archivedCrisis].slice(-50),
        pendingEffects: [...state.pendingEffects, pendingEffect],
        budgetState: {
          ...state.budgetState,
          totalPoliticalCapital: state.budgetState.totalPoliticalCapital - option.capitalCost,
          spentThisTurn: state.budgetState.spentThisTurn + option.capitalCost,
        },
      }
    }),

  ignoreCrisis: (crisisId) =>
    set((state) => {
      const crisis = state.crises.find((c) => c.id === crisisId)
      if (!crisis || crisis.status !== 'active') return state

      const newTurnsActive = crisis.turnsActive + 1
      const shouldEscalate = newTurnsActive >= crisis.turnsToResolve

      if (shouldEscalate) {
        const penalties = ESCALATION_PENALTIES[crisis.severity] ?? {}
        const { countries, approvalRating, adversaryTension } = applyCrisisEffects(
          { ...penalties, approvalRating: -8 },
          crisis.affectedCountryId,
          { countries: state.countries, approvalRating: state.approvalRating, adversaryTension: state.adversaryTension },
        )
        const archivedCrisis: Crisis = {
          ...crisis,
          turnsActive: newTurnsActive,
          status: 'escalated' as CrisisStatus,
          resolvedAtTurn: state.turn,
        }
        return {
          countries,
          approvalRating,
          adversaryTension,
          crises: state.crises.filter((c) => c.id !== crisisId),
          resolvedCrises: [...state.resolvedCrises, archivedCrisis].slice(-50),
        }
      }

      return {
        crises: state.crises.map((c) =>
          c.id === crisisId ? { ...c, turnsActive: newTurnsActive } : c,
        ),
      }
    }),

  escalateCrisis: (crisisId) =>
    set((state) => {
      const crisis = state.crises.find((c) => c.id === crisisId)
      if (!crisis) return state

      const penalties = ESCALATION_PENALTIES[crisis.severity] ?? {}
      const { countries, approvalRating, adversaryTension } = applyCrisisEffects(
        { ...penalties, approvalRating: -8 },
        crisis.affectedCountryId,
        { countries: state.countries, approvalRating: state.approvalRating, adversaryTension: state.adversaryTension },
      )

      const archivedCrisis: Crisis = { ...crisis, status: 'escalated' as CrisisStatus, resolvedAtTurn: state.turn }
      return {
        countries,
        approvalRating,
        adversaryTension,
        crises: state.crises.filter((c) => c.id !== crisisId),
        resolvedCrises: [...state.resolvedCrises, archivedCrisis].slice(-50),
      }
    }),

  applyScenarioChoice: (scenarioId, choiceId) =>
    set((state) => {
      const def    = SCENARIOS.find((s) => s.id === scenarioId)
      if (!def) return {}
      const choice = def.choices.find((c) => c.id === choiceId)
      if (!choice) return {}
      const effects = choice.effects(state)
      // Apply difficulty modifier to any new crises spawned by the scenario
      const difficulty = state.difficulty ?? 'normal'
      if (effects.crises) {
        const existingIds = new Set(state.crises.map((c) => c.id))
        effects.crises = effects.crises.map((c) =>
          existingIds.has(c.id)
            ? c
            : { ...c, turnsToResolve: adjustTurnsToResolve(c.turnsToResolve, difficulty) },
        )
      }
      return {
        ...effects,
        activeScenarios: state.activeScenarios.filter((id) => id !== scenarioId),
      }
    }),

  startNewGame: ({ scenarioMode, difficulty }) =>
    set(() => {
      const countries = makeInitialCountries(scenarioMode)
      const memberCount = Object.values(countries).filter((c) => c.alignment === 'nato').length
      return {
        turn: 1, year: 2024, quarter: 1 as const,
        approvalRating: 65, selectedCountry: null, viewMode: 'world' as ViewMode,
        countries,
        budgetState: INITIAL_BUDGET,
        accessionProcesses: {},
        crises: [],
        adversaryTension: difficulty === 'crisis' ? 50 : 30,
        article5Active: false,
        pendingEffects: [],
        notifications: [],
        resolvedCrises: [],
        lowReadinessTurns: 0, lowApprovalTurns: 0,
        gameOutcome: null,
        initialMemberCount: memberCount,
        withdrawnMembers: [],
        totalPCSpent: 0, totalEngagements: 0,
        countriesInDialogue: 0, turnsWithHighReadiness: 0,
        scenarioMode,
        difficulty,
        triggeredScenarios: [],
        activeScenarios: [],
        showTurnSummary: false,
        turnSummaryData: null,
      }
    }),

  advanceTurn: () => {
    set((state) => {
      // Don't advance once the game is over
      if (state.gameOutcome !== null) return state

      const nextQ = state.quarter + 1
      const rollYear = nextQ > 4
      const passive = applyPassiveChanges(state)

      // Replenish capital, reset spend, tick down engagement counters
      const prevBudget = state.budgetState
      const nextEngagements: Record<string, number> = {}
      for (const [id, turns] of Object.entries(prevBudget.memberEngagements)) {
        if (turns - 1 > 0) nextEngagements[id] = turns - 1
      }
      const PC_REPLENISH: Record<string, number> = { diplomat: 15, normal: 10, crisis: 8 }
      const pcPerTurn = PC_REPLENISH[state.difficulty] ?? 10
      const nextBudget: BudgetState = {
        ...prevBudget,
        totalPoliticalCapital: Math.min(100, prevBudget.totalPoliticalCapital + pcPerTurn),
        spentThisTurn: 0,
        memberEngagements: nextEngagements,
      }

      // Tick turnsInStage on top of scores already drifted by applyPassiveChanges
      const baseAccession = passive.accessionProcesses ?? state.accessionProcesses
      const nextAccession: Record<string, AccessionProcess> = {}
      for (const [id, proc] of Object.entries(baseAccession)) {
        nextAccession[id] = { ...proc, turnsInStage: proc.turnsInStage + 1 }
      }

      // ── Crisis tick ────────────────────────────────────────────────────────
      // Start from the countries/approval passive already returned (which may include
      // accession auto-advance side-effects), then layer crisis effects on top.
      let workingCountries = passive.countries ?? state.countries
      let workingApproval  = passive.approvalRating ?? state.approvalRating
      let workingTension   = state.adversaryTension

      const baseCrises = passive.crises ?? state.crises
      const nextNotifications: Notification[] = [...state.notifications]
      let workingArticle5Active = state.article5Active
      const extraCrises: Crisis[] = []
      const nextCrises: Crisis[] = []
      const newlyArchived: Crisis[] = []

      for (const crisis of baseCrises) {
        // Pending: count down until it becomes active
        if (crisis.status === 'pending') {
          const tta = crisis.turnsUntilActive - 1
          nextCrises.push({
            ...crisis,
            turnsUntilActive: Math.max(0, tta),
            status: tta <= 0 ? ('active' as CrisisStatus) : crisis.status,
          })
          continue
        }

        // Active: increment counter; auto-escalate if patience has run out
        if (crisis.status === 'active') {
          const ta = crisis.turnsActive + 1
          if (ta >= crisis.turnsToResolve) {
            const penalties = ESCALATION_PENALTIES[crisis.severity] ?? {}
            const r = applyCrisisEffects(
              { ...penalties, approvalRating: -8 },
              crisis.affectedCountryId,
              { countries: workingCountries, approvalRating: workingApproval, adversaryTension: workingTension },
            )
            workingCountries = r.countries
            workingApproval  = r.approvalRating
            workingTension   = r.adversaryTension
            nextNotifications.push({
              id: crypto.randomUUID(),
              text: `${crisis.title} has escalated — inaction has consequences.`,
              turn: state.turn + 1,
              type: 'crisis_escalation',
            })
            // Type-specific escalation side effects
            const esc = handleEscalationSideEffects(
              crisis,
              workingCountries,
              workingArticle5Active,
              state.turn + 1,
              [...baseCrises, ...extraCrises],
              state,
            )
            workingCountries    = esc.countries
            workingArticle5Active = esc.article5Active
            extraCrises.push(...esc.newCrises)
            nextNotifications.push(...esc.newNotifications)
            newlyArchived.push({ ...crisis, turnsActive: ta, status: 'escalated' as CrisisStatus, resolvedAtTurn: state.turn + 1 })
            continue
          }
          nextCrises.push({ ...crisis, turnsActive: ta })
          continue
        }

        nextCrises.push(crisis)
      }

      const finalCrises = [...nextCrises, ...extraCrises]

      // ── Pending effects tick ───────────────────────────────────────────────
      const nextPendingEffects: PendingEffect[] = []
      const firedDelayedEffects: string[] = []
      for (const pe of state.pendingEffects) {
        const remaining = pe.turnsRemaining - 1
        if (remaining <= 0) {
          const r = applyCrisisEffects(
            pe.effects,
            pe.affectedCountryId,
            { countries: workingCountries, approvalRating: workingApproval, adversaryTension: workingTension },
          )
          workingCountries = r.countries
          workingApproval  = r.approvalRating
          workingTension   = r.adversaryTension
          firedDelayedEffects.push(pe.flavourText)
          nextNotifications.push({
            id: crypto.randomUUID(),
            text: pe.flavourText,
            turn: state.turn + 1,
            type: 'delayed_effect',
          })
          // Drop applied effects from the array — they're done
        } else {
          nextPendingEffects.push({ ...pe, turnsRemaining: remaining })
        }
      }

      // Derive article5Active from the final crisis list
      const nextArticle5Active = finalCrises.some(
        (c) => c.type === 'article5' && (c.status === 'active' || c.status === 'pending'),
      ) || workingArticle5Active

      // ── Victory / defeat tracking ──────────────────────────────────────────
      // Detect countries that withdrew this turn (nato → neutral transition)
      const nextWithdrawnMembers = [
        ...state.withdrawnMembers,
        ...Object.values(workingCountries)
          .filter((c) => c.alignment === 'neutral' && state.countries[c.id]?.alignment === 'nato')
          .map((c) => c.id),
      ]

      // Consecutive low-readiness and low-approval counters
      const natoMembersPost = Object.values(workingCountries).filter((c) => c.alignment === 'nato')
      const postReadiness = natoMembersPost.length > 0
        ? Math.round(natoMembersPost.reduce((sum, c) => sum + c.readiness, 0) / natoMembersPost.length)
        : 0
      const nextLowReadinessTurns = postReadiness < 20 ? state.lowReadinessTurns + 1 : 0
      const nextLowApprovalTurns  = workingApproval < 15 ? state.lowApprovalTurns + 1 : 0

      const nextResolvedCrises = [...state.resolvedCrises, ...newlyArchived].slice(-50)
      const nextTurn = state.turn + 1

      // ── Turn summary computation ───────────────────────────────────────────
      const preNatoMembers = Object.values(state.countries).filter((c) => c.alignment === 'nato')
      const preReadiness = preNatoMembers.length > 0
        ? Math.round(preNatoMembers.reduce((sum, c) => sum + c.readiness, 0) / preNatoMembers.length)
        : 0
      const readinessDelta = postReadiness - preReadiness

      const summaryAccessionChanges: Array<{ countryName: string; scoreDelta: number }> = []
      for (const [id, nextProc] of Object.entries(nextAccession)) {
        const prevProc = state.accessionProcesses[id]
        if (prevProc) {
          const delta = nextProc.score - prevProc.score
          if (Math.abs(delta) > 5) {
            summaryAccessionChanges.push({
              countryName: state.countries[id]?.name ?? id,
              scoreDelta: Math.round(delta),
            })
          }
        }
      }

      const summaryAlignmentChanges: Array<{ countryName: string; from: string; to: string }> = []
      for (const [id, country] of Object.entries(workingCountries)) {
        const prev = state.countries[id]
        if (prev && prev.alignment !== country.alignment) {
          summaryAlignmentChanges.push({
            countryName: country.name,
            from: prev.alignment,
            to: country.alignment,
          })
        }
      }

      const upcomingCrisesCount = finalCrises.filter((c) => c.status === 'pending').length
      const hasSummaryContent =
        Math.abs(readinessDelta) >= 1 ||
        firedDelayedEffects.length > 0 ||
        summaryAccessionChanges.length > 0 ||
        summaryAlignmentChanges.length > 0 ||
        upcomingCrisesCount > 0

      const builtTurnSummaryData: TurnSummaryData = {
        prevQuarter: state.quarter,
        prevYear: state.year,
        readinessDelta,
        pcReplenished: pcPerTurn,
        delayedEffects: firedDelayedEffects,
        accessionChanges: summaryAccessionChanges,
        alignmentChanges: summaryAlignmentChanges,
        upcomingCrises: upcomingCrisesCount,
      }

      const gameOutcome = checkVictoryConditions({
        ...state,
        turn:               nextTurn,
        countries:          workingCountries,
        approvalRating:     workingApproval,
        adversaryTension:   workingTension,
        article5Active:     nextArticle5Active,
        crises:             finalCrises,
        resolvedCrises:     nextResolvedCrises,
        lowReadinessTurns:  nextLowReadinessTurns,
        lowApprovalTurns:   nextLowApprovalTurns,
        withdrawnMembers:   nextWithdrawnMembers,
      })

      // ── Scenario triggers ──────────────────────────────────────────────────
      const newScenarioIds = checkForScenarios({
        ...state,
        turn:              nextTurn,
        countries:         workingCountries,
        approvalRating:    workingApproval,
        triggeredScenarios: state.triggeredScenarios,
        activeScenarios:    state.activeScenarios,
      })
      const nextActiveScenarios     = [...state.activeScenarios,    ...newScenarioIds]
      const nextTriggeredScenarios  = [...state.triggeredScenarios, ...newScenarioIds]

      return {
        ...passive,
        countries:          workingCountries,
        approvalRating:     workingApproval,
        adversaryTension:   workingTension,
        article5Active:     nextArticle5Active,
        turn:               nextTurn,
        quarter:            (rollYear ? 1 : nextQ) as 1 | 2 | 3 | 4,
        year:               rollYear ? state.year + 1 : state.year,
        budgetState:        nextBudget,
        accessionProcesses: nextAccession,
        crises:             finalCrises,
        resolvedCrises:     nextResolvedCrises,
        pendingEffects:     nextPendingEffects,
        notifications:      nextNotifications.slice(-20),
        lowReadinessTurns:      nextLowReadinessTurns,
        lowApprovalTurns:       nextLowApprovalTurns,
        withdrawnMembers:       nextWithdrawnMembers,
        gameOutcome,
        totalPCSpent:           state.totalPCSpent + prevBudget.spentThisTurn,
        turnsWithHighReadiness: state.turnsWithHighReadiness + (postReadiness > 70 ? 1 : 0),
        activeScenarios:        nextActiveScenarios,
        triggeredScenarios:     nextTriggeredScenarios,
        showTurnSummary:   hasSummaryContent && gameOutcome === null,
        turnSummaryData:   hasSummaryContent && gameOutcome === null ? builtTurnSummaryData : null,
      }
    })
    // Autosave at the end of every completed turn (skip if game already ended)
    const next = get()
    if (next.gameOutcome === null) saveGame(next)
  },
  resetGame: () =>
    set({
      turn: 1,
      year: 2024,
      quarter: 1 as const,
      approvalRating: 65,
      selectedCountry: null,
      viewMode: 'world',
      countries: INITIAL_COUNTRIES,
      budgetState: INITIAL_BUDGET,
      accessionProcesses: {},
      crises: [],
      adversaryTension: 30,
      article5Active: false,
      pendingEffects: [],
      notifications: [],
      resolvedCrises: [],
      lowReadinessTurns: 0,
      lowApprovalTurns: 0,
      gameOutcome: null,
      initialMemberCount: INITIAL_MEMBER_COUNT,
      withdrawnMembers: [],
      totalPCSpent: 0,
      totalEngagements: 0,
      countriesInDialogue: 0,
      turnsWithHighReadiness: 0,
      scenarioMode: DEFAULT_SCENARIO_MODE,
      difficulty: 'normal' as Difficulty,
      triggeredScenarios: [],
      activeScenarios: [],
      showTurnSummary: false,
      turnSummaryData: null,
    }),
}))

export function selectAllianceReadiness(countries: Record<string, Country>): number {
  const members = Object.values(countries).filter((c) => c.alignment === 'nato')
  if (members.length === 0) return 0
  return Math.round(members.reduce((sum, c) => sum + c.readiness, 0) / members.length)
}
