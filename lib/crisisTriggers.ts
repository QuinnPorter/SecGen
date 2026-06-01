import { type Crisis, type GameState } from './gameState'
import { buildCrisis } from './crisisDefinitions'
import { hasTrait, traitTriggerMultiplier } from './countryTraits'

function adjustTurnsToResolve(base: number, difficulty: string): number {
  if (difficulty === 'diplomat') return base + 1
  if (difficulty === 'crisis')   return Math.max(1, base - 1)
  return base
}

// Hard cap on simultaneously active+pending crises spawned from passive triggers.
// Article 5 cascades from handleEscalationSideEffects are exempt and bypass this cap.
export const MAX_CONCURRENT_CRISES = 4

// Global probability multiplier applied to every passive-trigger roll.
// Combined with per-category/per-trait modifiers, this lets the player suppress
// crisis frequency through targeted budget investment.
export const GLOBAL_TRIGGER_MOD = 0.9

// Phase-mode probability multipliers. The phase machine ticks in turnEngine and
// makes the game feel bursty: long calm stretches punctuated by storms.
export const PHASE_MOD: Record<string, number> = {
  calm:   0.45,
  normal: 1.0,
  storm:  1.6,
}

// Cyber allocation at which hybrid-attack frequency is "neutral" (multiplier 1.0).
// Below this, the multiplier rises above 1 (starving cyber invites attacks);
// above it, investment suppresses frequency. Matches the default cyber slider.
export const CYBER_NEUTRAL_ALLOC = 20

function roll(probability: number): boolean {
  return Math.random() < probability
}

export function checkForNewCrises(gameState: GameState): Crisis[] {
  const { countries, crises, turn, adversaryTension, budgetState } = gameState
  const { memberEngagements, allocation } = budgetState
  const difficulty = gameState.difficulty ?? 'normal'

  // ── Concurrent-crisis cap ──────────────────────────────────────────────────
  // Count only crises that compete for player attention (active + pending).
  const concurrentCount = crises.filter(
    (c) => c.status === 'active' || c.status === 'pending',
  ).length
  if (concurrentCount >= MAX_CONCURRENT_CRISES) return []
  const remainingSlots = MAX_CONCURRENT_CRISES - concurrentCount

  const newCrises: Crisis[] = []
  function atCap(): boolean {
    return newCrises.length >= remainingSlots
  }

  function hasActiveCrisis(countryId: string, type: string): boolean {
    return crises.some(
      (c) =>
        c.affectedCountryId === countryId &&
        c.type === type &&
        (c.status === 'active' || c.status === 'pending'),
    )
  }

  function hasAnyCrisis(type: string): boolean {
    return crises.some(
      (c) => c.type === type && (c.status === 'active' || c.status === 'pending'),
    )
  }

  const highTensionBonus = adversaryTension > 80 ? 0.2 : 0
  const phaseMod = PHASE_MOD[gameState.crisisPhase?.mode ?? 'normal'] ?? 1.0

  // ── Per-category trigger modifiers ─────────────────────────────────────────
  // Each budget slider suppresses one or two crisis types. Multipliers compose
  // with GLOBAL_TRIGGER_MOD inside the existing roll() calls.
  // Cyber pivots around a neutral allocation: starving it pushes the multiplier
  // above 1 (more hybrid attacks), heavy investment pushes it well below 1.
  const cyberMod   = 1 - (allocation.cyberDefence - CYBER_NEUTRAL_ALLOC) / 150  // hybrid_attack (and adversary_reaction)
  const commsMod   = 1 - allocation.communications / 250  // political_instability, withdrawal_threat, non_aligned_election
  const readyMod   = 1 - allocation.troopReadiness / 300  // foreign_threat
  const partnerMod = 1 - allocation.partnerAid     / 250  // budget_cut, energy_crisis

  // Compute alliance readiness once (used by FOREIGN THREAT check)
  const natoMembers = Object.values(countries).filter((c) => c.alignment === 'nato')
  const allianceReadiness =
    natoMembers.length > 0
      ? natoMembers.reduce((sum, c) => sum + c.readiness, 0) / natoMembers.length
      : 100

  for (const country of natoMembers) {
    if (atCap()) break
    const isEngaged = (memberEngagements[country.id] ?? 0) > 0

    // ── BUDGET CUT ────────────────────────────────────────────────────────────
    // Triggers when a member has sustained high fiscal pressure with low GDP spending and no engagement
    if (
      !atCap() &&
      !hasActiveCrisis(country.id, 'budget_cut') &&
      (country.highFiscalTurns ?? 0) >= 2 &&
      country.gdpDefencePercent < 2.2 &&
      !isEngaged &&
      roll(0.85 * GLOBAL_TRIGGER_MOD * phaseMod * partnerMod * traitTriggerMultiplier(country.id, 'budget_cut', country.runtimeTraits))
    ) {
      const crisis = buildCrisis('budget_cut', country.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }

    // ── FOREIGN THREAT ────────────────────────────────────────────────────────
    // Triggers when a frontline member faces elevated threat while alliance readiness is low
    if (
      !atCap() &&
      !hasActiveCrisis(country.id, 'foreign_threat') &&
      country.threatLevel > 65 &&
      hasTrait(country.id, 'frontline', country.runtimeTraits) &&
      allianceReadiness < 65 &&
      roll((0.70 + highTensionBonus) * GLOBAL_TRIGGER_MOD * phaseMod * readyMod * traitTriggerMultiplier(country.id, 'foreign_threat', country.runtimeTraits))
    ) {
      const crisis = buildCrisis('foreign_threat', country.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }

    // ── WITHDRAWAL THREAT ─────────────────────────────────────────────────────
    // Triggers after the game is established when a member's satisfaction and fiscal health collapse
    if (
      !atCap() &&
      !hasActiveCrisis(country.id, 'withdrawal_threat') &&
      country.allianceSatisfaction < 35 &&
      country.fiscalPressure > 60 &&
      turn > 8 &&
      roll(0.60 * GLOBAL_TRIGGER_MOD * phaseMod * commsMod * traitTriggerMultiplier(country.id, 'withdrawal_threat', country.runtimeTraits))
    ) {
      const crisis = buildCrisis('withdrawal_threat', country.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }

    // ── POLITICAL INSTABILITY ─────────────────────────────────────────────────
    // Triggers when a neglected member's domestic politics begin to fracture
    if (
      !atCap() &&
      !hasActiveCrisis(country.id, 'political_instability') &&
      country.allianceSatisfaction < 45 &&
      country.fiscalPressure > 55 &&
      (country.turnsWithoutEngagement ?? 0) > 6 &&
      roll(0.50 * GLOBAL_TRIGGER_MOD * phaseMod * commsMod * traitTriggerMultiplier(country.id, 'political_instability', country.runtimeTraits))
    ) {
      const crisis = buildCrisis('political_instability', country.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }

    // ── ENERGY CRISIS ─────────────────────────────────────────────────────────
    // Triggers for energy-dependent members when adversary pressure or tension is elevated
    if (
      !atCap() &&
      !hasActiveCrisis(country.id, 'energy_crisis') &&
      hasTrait(country.id, 'energy_dependent', country.runtimeTraits) &&
      turn > 6 &&
      (hasAnyCrisis('adversary_reaction') || adversaryTension > 60) &&
      roll(0.55 * GLOBAL_TRIGGER_MOD * phaseMod * partnerMod * traitTriggerMultiplier(country.id, 'energy_crisis', country.runtimeTraits))
    ) {
      const crisis = buildCrisis('energy_crisis', country.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }

    // ── NON-ALIGNED ELECTION ──────────────────────────────────────────────────
    // Members with low satisfaction or eurosceptic posture can elect a skeptic
    // leader. Rare base rate (0.18) is amplified by traits + phaseMod.
    if (
      !atCap() &&
      !hasActiveCrisis(country.id, 'non_aligned_election') &&
      turn > 6 &&
      (country.allianceSatisfaction < 55 || hasTrait(country.id, 'eurosceptic', country.runtimeTraits)) &&
      roll(0.18 * GLOBAL_TRIGGER_MOD * phaseMod * commsMod * traitTriggerMultiplier(country.id, 'non_aligned_election', country.runtimeTraits))
    ) {
      const crisis = buildCrisis('non_aligned_election', country.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }
  }

  // ── HYBRID ATTACK ─────────────────────────────────────────────────────────
  // One at a time. Targets cyber_target trait members preferentially, else highest-threat.
  // Information warfare pressure raises both frequency and severity.
  const iwPressure = gameState.informationWarfare?.pressure ?? 20
  const iwBoost    = 1 + Math.max(0, iwPressure - 50) / 100   // +0.5× at pressure 100
  const iwForceSpawn = iwPressure > 85

  if (
    !atCap() &&
    !hasAnyCrisis('hybrid_attack') &&
    turn > 4 &&
    Object.values(countries).some((c) => c.alignment === 'adversary')
  ) {
    const cyberTargets = natoMembers.filter((c) => hasTrait(c.id, 'cyber_target', c.runtimeTraits))
    const candidates   = (cyberTargets.length > 0 ? cyberTargets : natoMembers).slice().sort((a, b) => b.threatLevel - a.threatLevel)
    const target = candidates[0]
    if (target) {
      const targetMod = traitTriggerMultiplier(target.id, 'hybrid_attack', target.runtimeTraits)
      // iwForceSpawn (pressure > 85) ignores phaseMod — it's an emergency override.
      const baseProb  = (0.40 + highTensionBonus) * GLOBAL_TRIGGER_MOD * phaseMod * cyberMod * targetMod * iwBoost
      if (iwForceSpawn || roll(baseProb)) {
        const crisis = buildCrisis('hybrid_attack', target.id, gameState)
        // Force high severity when IW pressure is critical
        const finalCrisis = iwForceSpawn ? { ...crisis, severity: 'high' as const } : crisis
        newCrises.push({ ...finalCrisis, turnsUntilActive: 1 })
      }
    }
  }

  // Apply difficulty modifier to turnsToResolve on every spawned crisis
  return newCrises.map((c) => ({
    ...c,
    turnsToResolve: adjustTurnsToResolve(c.turnsToResolve, difficulty),
  }))
}
