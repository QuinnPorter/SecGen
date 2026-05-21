import type { GameState, AccessionProcess, PendingEffect } from './gameState'
import { buildCrisis } from './crisisDefinitions'

// ── Types ─────────────────────────────────────────────────────────────────────

// effects is a pure state-transform rather than () => void so the store can
// apply it inside set() without a circular runtime import of useGameStore.
export interface ScenarioChoice {
  id: string
  label: string
  description: string
  consequences: string
  effects: (state: GameState) => Partial<GameState>
}

// ScenarioEvent is the display-facing shape stored / passed around the UI.
// triggered is always true once a scenario has fired.
export interface ScenarioEvent {
  id: string
  turn: number
  title: string
  briefing: string
  triggered: boolean
  choices: ScenarioChoice[]
}

// ScenarioDefinition adds a runtime condition to ScenarioEvent.
export interface ScenarioDefinition extends ScenarioEvent {
  condition: (state: GameState) => boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function makeAccession(
  countryId: string,
  stage: AccessionProcess['stage'],
  score: number,
  adversaryReactionTriggered = false,
): AccessionProcess {
  return {
    countryId,
    stage,
    score,
    turnsInStage: 0,
    memberVotes: {},
    adversaryReactionTriggered,
    partnerFrustration: 0,
  }
}

// Countries that would celebrate Nordic accession
const NORDIC_CELEBRANTS = ['EST', 'LVA', 'LTU', 'POL', 'NOR', 'DNK']

// ── SCENARIO: The Nordic Question ─────────────────────────────────────────────

const nordicQuestion: ScenarioDefinition = {
  id: 'nordic_question',
  turn: 4,
  triggered: false,
  title: 'Finland and Sweden Signal Interest in NATO Membership',
  briefing:
    'Following a significant shift in public opinion and regional security concerns, both Finland and Sweden have privately indicated willingness to discuss NATO membership. ' +
    'This would be the most significant expansion in a generation, bringing two highly capable militaries into the alliance. ' +
    'Moscow has already signalled it views any expansion in the Nordic theatre as a red line. ' +
    'How do you wish to proceed?',

  condition: (state) =>
    state.scenarioMode === 'alternate' &&
    state.countries['FIN']?.alignment !== 'nato' &&
    state.countries['SWE']?.alignment !== 'nato',

  choices: [
    // ── A ──────────────────────────────────────────────────────────────────
    {
      id: 'fast_track',
      label: 'Fast-track both simultaneously',
      description:
        'Invite Finland and Sweden to begin accession talks immediately, accelerating both to MAP stage in parallel.',
      consequences:
        'A historic moment for the alliance — but Moscow will react swiftly and the Baltic flank will face heightened pressure.',
      effects: (state) => {
        const countries = { ...state.countries }

        if (countries['FIN']) {
          countries['FIN'] = { ...countries['FIN'], alignment: 'candidate', inAccessionProcess: true }
        }
        if (countries['SWE']) {
          countries['SWE'] = { ...countries['SWE'], alignment: 'candidate', inAccessionProcess: true }
        }

        // Baltic / Eastern members celebrate the historic step
        for (const id of NORDIC_CELEBRANTS) {
          if (countries[id]?.alignment === 'nato') {
            countries[id] = {
              ...countries[id],
              allianceSatisfaction: clamp(countries[id].allianceSatisfaction + 20, 0, 100),
            }
          }
        }

        const stateSnapshot = { ...state, countries }
        const crises = [
          ...state.crises,
          buildCrisis('adversary_reaction', 'FIN', stateSnapshot),
          buildCrisis('adversary_reaction', 'SWE', stateSnapshot),
        ]

        return {
          countries,
          accessionProcesses: {
            ...state.accessionProcesses,
            FIN: makeAccession('FIN', 'map', 70, true),
            SWE: makeAccession('SWE', 'map', 70, true),
          },
          crises,
          adversaryTension: clamp(state.adversaryTension + 25, 0, 100),
        }
      },
    },

    // ── B ──────────────────────────────────────────────────────────────────
    {
      id: 'finland_first',
      label: 'Invite Finland first, Sweden to follow',
      description:
        'Prioritise Finland — whose border with Russia is longest — for immediate MAP talks, while encouraging Sweden to begin dialogue.',
      consequences:
        'Sequenced accession reduces adversary pressure slightly, but Sweden may feel deprioritised.',
      effects: (state) => {
        const countries = { ...state.countries }

        if (countries['FIN']) {
          countries['FIN'] = { ...countries['FIN'], alignment: 'candidate', inAccessionProcess: true }
        }
        if (countries['SWE']) {
          countries['SWE'] = { ...countries['SWE'], alignment: 'candidate', inAccessionProcess: true }
        }

        const stateSnapshot = { ...state, countries }
        const crises = [
          ...state.crises,
          buildCrisis('adversary_reaction', 'FIN', stateSnapshot),
        ]

        return {
          countries,
          accessionProcesses: {
            ...state.accessionProcesses,
            FIN: makeAccession('FIN', 'map', 70, true),
            SWE: makeAccession('SWE', 'dialogue', 50, false),
          },
          crises,
          adversaryTension: clamp(state.adversaryTension + 15, 0, 100),
        }
      },
    },

    // ── C ──────────────────────────────────────────────────────────────────
    {
      id: 'encourage_quietly',
      label: 'Encourage but maintain distance publicly',
      description:
        'Open informal dialogue with both countries while avoiding public statements that could provoke an adversary response.',
      consequences:
        'Lowest immediate risk, but the process will be slow — and both capitals will notice the hesitation.',
      effects: (state) => {
        const countries = { ...state.countries }

        if (countries['FIN']) {
          countries['FIN'] = { ...countries['FIN'], alignment: 'candidate', inAccessionProcess: true }
        }
        if (countries['SWE']) {
          countries['SWE'] = { ...countries['SWE'], alignment: 'candidate', inAccessionProcess: true }
        }

        const pendingEffects: PendingEffect[] = [
          ...state.pendingEffects,
          {
            id: crypto.randomUUID(),
            crisisId: 'scenario_nordic_question',
            turnsRemaining: 3,
            affectedCountryId: 'FIN',
            effects: { allianceSatisfaction: 10 },
            flavourText:
              "Finland's quiet diplomatic engagement has steadily improved its relationship with the alliance.",
            applied: false,
          },
          {
            id: crypto.randomUUID(),
            crisisId: 'scenario_nordic_question',
            turnsRemaining: 3,
            affectedCountryId: 'SWE',
            effects: { allianceSatisfaction: 10 },
            flavourText:
              "Sweden's measured approach to closer ties has strengthened mutual confidence with NATO partners.",
            applied: false,
          },
        ]

        return {
          countries,
          accessionProcesses: {
            ...state.accessionProcesses,
            FIN: makeAccession('FIN', 'dialogue', 40, false),
            SWE: makeAccession('SWE', 'dialogue', 40, false),
          },
          pendingEffects,
          adversaryTension: clamp(state.adversaryTension + 8, 0, 100),
        }
      },
    },

    // ── D ──────────────────────────────────────────────────────────────────
    {
      id: 'advise_against',
      label: 'Advise against membership at this time',
      description:
        'Communicate privately that the alliance is not in a position to extend membership discussions, citing regional stability concerns.',
      consequences:
        'Adversaries read hesitation as weakness. Both Nordic capitals are left exposed and will remember this moment.',
      effects: (state) => {
        const countries = { ...state.countries }

        if (countries['FIN']) {
          countries['FIN'] = {
            ...countries['FIN'],
            fiscalPressure: clamp(countries['FIN'].fiscalPressure + 10, 0, 100),
          }
        }
        if (countries['SWE']) {
          countries['SWE'] = {
            ...countries['SWE'],
            fiscalPressure: clamp(countries['SWE'].fiscalPressure + 10, 0, 100),
          }
        }

        return {
          countries,
          adversaryTension: clamp(state.adversaryTension + 5, 0, 100),
          approvalRating:   clamp(state.approvalRating - 8, 0, 100),
        }
      },
    },
  ],
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const SCENARIOS: ScenarioDefinition[] = [
  nordicQuestion,
]

// ── Turn checker ──────────────────────────────────────────────────────────────
// Returns IDs of scenarios that should fire this turn.
// Called from advanceTurn with the post-increment turn number.

export function checkForScenarios(state: GameState): string[] {
  const triggered: string[] = []
  for (const scenario of SCENARIOS) {
    if (
      state.turn === scenario.turn &&
      !state.triggeredScenarios.includes(scenario.id) &&
      scenario.condition(state)
    ) {
      triggered.push(scenario.id)
    }
  }
  return triggered
}
