import { type CrisisType } from './gameState'

// ── Trait definitions ─────────────────────────────────────────────────────────
// Each NATO/candidate state can carry 0–3 traits that bias which crises hit it
// and how its situation feels mechanically. Traits are the single source of
// truth replacing the older STRATEGIC_ANCHORS / ADVERSARY_BORDER_MEMBERS /
// HIGH_ENERGY_DEPENDENCY hardcoded sets scattered across the engine.

export type CountryTrait =
  | 'frontline'        // shares an adversary land border
  | 'fiscal_hawk'      // tight defence spending; budget pressure prone
  | 'cyber_target'     // hybrid_attack lightning rod
  | 'energy_dependent' // structural energy dependency on adversary supply
  | 'kingmaker'        // crises here hit approvalRating 2× harder
  | 'eurosceptic'      // baseline alliance satisfaction drifts toward 50 not 60

// Probability multipliers applied per trait per crisis type. >1 increases
// frequency, <1 decreases. Composes multiplicatively when a country has
// multiple traits affecting the same crisis type.
export const TRAIT_TRIGGER_MOD: Record<CountryTrait, Partial<Record<CrisisType, number>>> = {
  frontline:        { foreign_threat: 1.4, withdrawal_threat: 0.7 },
  fiscal_hawk:      { budget_cut: 1.4, political_instability: 1.2 },
  cyber_target:     { hybrid_attack: 1.5 },
  energy_dependent: { energy_crisis: 1.3 },
  kingmaker:        {},
  eurosceptic:      { withdrawal_threat: 1.5, political_instability: 1.2 },
}

// Per-country trait assignments. Most members get 0–2 traits.
// Order matters only for display; trigger math is order-independent.
export const TRAITS_BY_COUNTRY: Record<string, CountryTrait[]> = {
  // North American anchors
  USA: ['kingmaker'],
  CAN: ['fiscal_hawk'],

  // Western European anchors
  GBR: ['kingmaker'],
  FRA: ['kingmaker'],
  DEU: ['kingmaker', 'fiscal_hawk'],
  ITA: ['fiscal_hawk'],
  ESP: ['fiscal_hawk'],

  // Eastern flank — frontline + cyber + energy exposure
  POL: ['frontline'],
  EST: ['frontline', 'cyber_target', 'energy_dependent'],
  LVA: ['frontline', 'cyber_target', 'energy_dependent'],
  LTU: ['frontline', 'cyber_target', 'energy_dependent'],

  // Nordic frontline
  NOR: ['frontline'],
  FIN: ['frontline'],

  // Strategic anchor (southern flank)
  TUR: ['kingmaker'],

  // Energy-dependent central/southeast
  HUN: ['energy_dependent', 'eurosceptic'],
  SVK: ['energy_dependent', 'eurosceptic'],
  BGR: ['energy_dependent'],

  // Candidates with energy exposure
  MDA: ['energy_dependent'],
}

export function traitsFor(countryId: string): readonly CountryTrait[] {
  return TRAITS_BY_COUNTRY[countryId] ?? []
}

export function hasTrait(countryId: string, trait: CountryTrait): boolean {
  return (TRAITS_BY_COUNTRY[countryId] ?? []).includes(trait)
}

// Compose trigger multipliers across all traits a country has for a crisis type.
export function traitTriggerMultiplier(countryId: string, crisisType: CrisisType): number {
  let mult = 1
  for (const trait of TRAITS_BY_COUNTRY[countryId] ?? []) {
    const traitMods = TRAIT_TRIGGER_MOD[trait]
    const m = traitMods[crisisType]
    if (m !== undefined) mult *= m
  }
  return mult
}

// ── Display metadata (UI chips on CountryPanel) ────────────────────────────────

export const TRAIT_DISPLAY: Record<CountryTrait, { label: string; color: string; description: string }> = {
  frontline:        { label: 'Frontline',        color: '#dc2626', description: 'Shares an adversary border — heightened threat exposure.' },
  fiscal_hawk:      { label: 'Fiscal Hawk',      color: '#d97706', description: 'Tight defence spending — prone to budget pressure.' },
  cyber_target:     { label: 'Cyber Target',     color: '#0d9488', description: 'Frequent target of hybrid attacks and disinformation campaigns.' },
  energy_dependent: { label: 'Energy Dependent', color: '#7c3aed', description: 'Structural energy dependency on adversary supply routes.' },
  kingmaker:        { label: 'Kingmaker',        color: '#f59e0b', description: 'Crises here hit alliance approval twice as hard.' },
  eurosceptic:      { label: 'Eurosceptic',      color: '#6b7280', description: 'Skeptical of deeper alliance integration; baseline satisfaction drifts lower.' },
}
