import { type Country, type GameState, type PendingEffect } from './gameState'

// ── Election news flavor system ───────────────────────────────────────────────
// Periodically fires per-country election headlines into the notification feed
// and turn summary. Most are pure flavor; ~30% nudge a single stat by ±3–5.

// Per-country election cadence (turns between elections). NATO-style 4-year
// cycles map to ~16 turns at quarterly cadence; parliamentary states with
// snap-vote tendencies are shorter. Countries not listed default to 16.
const CADENCE: Record<string, number> = {
  USA: 16, GBR: 20, FRA: 20, DEU: 16, ITA: 12, ESP: 16,
  POL: 16, NLD: 16, BEL: 20, PRT: 16, DNK: 16, NOR: 16,
  CZE: 16, HUN: 16, ROU: 16, BGR: 12, SVK: 16, SVN: 16,
  HRV: 16, ALB: 16, MNE: 16, MKD: 16, LUX: 20, ISL: 16,
  EST: 16, LVA: 16, LTU: 16, GRC: 16, TUR: 20, CAN: 16,
  // Candidates / neutrals occasionally produce news too
  UKR: 20, GEO: 16, BIH: 16, MDA: 16, SWE: 16, FIN: 16,
}

// Hash a country id + a salt into a stable [0, mod) value so each country's
// election turns are deterministic relative to the save (no separate RNG state).
function stableSeed(countryId: string, mod: number): number {
  let h = 2166136261
  for (let i = 0; i < countryId.length; i++) {
    h ^= countryId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % mod
}

// True when `turn` is an election turn for `countryId`.
function isElectionTurn(countryId: string, turn: number): boolean {
  const cadence = CADENCE[countryId] ?? 16
  const offset  = stableSeed(countryId, cadence)
  // First election after turn 3 to avoid noise in opening turns.
  if (turn < 4) return false
  return ((turn - offset) % cadence) === 0
}

interface Template {
  name: string
  weight: number
  headline: (country: Country) => string
  // Returns the stat effect to apply, or {} for pure flavor.
  // 70%/30% flavor/nudge split is enforced in the picker, not here.
  effects: (country: Country) => Partial<Record<string, number>>
}

const TEMPLATES: Template[] = [
  {
    name: 'incumbent_holds',
    weight: 3,
    headline: (c) => `${c.name}: governing coalition retains majority — continuity expected.`,
    effects: () => ({}),
  },
  {
    name: 'opposition_wins',
    weight: 3,
    headline: (c) => `${c.name}: opposition wins parliamentary majority — moderate platform shift.`,
    // Mild fiscal pressure shift; sometimes nothing.
    effects: () => Math.random() < 0.5 ? { fiscalPressure: 3 } : {},
  },
  {
    name: 'coalition_shuffle',
    weight: 2,
    headline: (c) => `${c.name}: coalition reshuffled after snap vote — defence portfolio reassigned.`,
    effects: () => Math.random() < 0.5 ? { fiscalPressure: -3 } : {},
  },
  {
    name: 'far_right_gain',
    weight: 1,
    headline: (c) => `${c.name}: far-right party gains seats — pressure on defence consensus.`,
    effects: () => ({ allianceSatisfaction: -4 }),
  },
  {
    name: 'far_left_gain',
    weight: 1,
    headline: (c) => `${c.name}: leftward shift in coalition — defence budget reviews announced.`,
    effects: () => ({ gdpDefencePercent: -0.1 }),
  },
  {
    name: 'technocrat_government',
    weight: 1,
    headline: (c) => `${c.name}: caretaker technocrat government formed — alliance posture steady.`,
    effects: () => ({}),
  },
  {
    name: 'low_turnout',
    weight: 1,
    headline: (c) => `${c.name}: record-low turnout — political legitimacy concerns surface.`,
    effects: () => Math.random() < 0.4 ? { allianceSatisfaction: -3 } : {},
  },
]

function pickTemplate(): Template {
  const total = TEMPLATES.reduce((s, t) => s + t.weight, 0)
  let r = Math.random() * total
  for (const t of TEMPLATES) {
    r -= t.weight
    if (r <= 0) return t
  }
  return TEMPLATES[0]
}

// Public API: returns a batch of PendingEffects (with notificationType: 'info')
// for every country whose election turn equals state.turn + 1 (so they fire
// next turn via the standard pending-effects tick).
export function generateElectionNews(state: GameState): PendingEffect[] {
  const out: PendingEffect[] = []
  // Fire elections "next turn" so the player sees them in the turn summary.
  const fireTurn = state.turn + 1
  for (const c of Object.values(state.countries)) {
    // Only NATO members, candidates with established politics, or neutrals
    // surface elections. Skip adversaries.
    if (c.alignment === 'adversary') continue
    if (!isElectionTurn(c.id, fireTurn)) continue

    const tpl = pickTemplate()
    // 70/30 flavor split: even if the template returned a nudge, drop it 70% of
    // the time so most headlines stay flavor-only.
    const rawEffects = tpl.effects(c)
    const keepEffects = Math.random() < 0.30
    const effects = keepEffects ? rawEffects : {}

    out.push({
      id: crypto.randomUUID(),
      crisisId: '',                       // election news is not tied to a crisis
      turnsRemaining: 1,                  // fire next turn
      affectedCountryId: c.id,
      effects,
      flavourText: tpl.headline(c),
      applied: false,
      notificationType: 'info',
    })
  }
  return out
}
