import { type Crisis, type GameState } from './gameState'
import { buildCrisis } from './crisisDefinitions'

function adjustTurnsToResolve(base: number, difficulty: string): number {
  if (difficulty === 'diplomat') return base + 1
  if (difficulty === 'crisis')   return Math.max(1, base - 1)
  return base
}

// NATO members that share a land border with adversary countries
const NATO_ADVERSARY_BORDERS: Record<string, string[]> = {
  NOR: ['RUS'],
  FIN: ['RUS'],
  EST: ['RUS'],
  LVA: ['RUS', 'BLR'],
  LTU: ['RUS', 'BLR'],
  POL: ['RUS', 'BLR'],
}

// Members with structural energy dependency on adversary supply routes
const HIGH_ENERGY_DEPENDENCY = new Set(['HUN', 'SVK', 'BGR', 'EST', 'LVA', 'LTU', 'MDA'])

function roll(probability: number): boolean {
  return Math.random() < probability
}

export function checkForNewCrises(gameState: GameState): Crisis[] {
  const { countries, crises, turn, adversaryTension, budgetState } = gameState
  const { memberEngagements } = budgetState
  const difficulty = gameState.difficulty ?? 'normal'

  const newCrises: Crisis[] = []

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

  // Compute alliance readiness once (used by FOREIGN THREAT check)
  const natoMembers = Object.values(countries).filter((c) => c.alignment === 'nato')
  const allianceReadiness =
    natoMembers.length > 0
      ? natoMembers.reduce((sum, c) => sum + c.readiness, 0) / natoMembers.length
      : 100

  for (const country of natoMembers) {
    const isEngaged = (memberEngagements[country.id] ?? 0) > 0

    // ── BUDGET CUT ────────────────────────────────────────────────────────────
    // Triggers when a member has sustained high fiscal pressure with low GDP spending and no engagement
    if (
      !hasActiveCrisis(country.id, 'budget_cut') &&
      (country.highFiscalTurns ?? 0) >= 2 &&
      country.gdpDefencePercent < 2.2 &&
      !isEngaged &&
      roll(0.85)
    ) {
      const crisis = buildCrisis('budget_cut', country.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }

    // ── FOREIGN THREAT ────────────────────────────────────────────────────────
    // Triggers when a border member faces elevated threat while alliance readiness is low
    if (
      !hasActiveCrisis(country.id, 'foreign_threat') &&
      country.threatLevel > 65 &&
      (NATO_ADVERSARY_BORDERS[country.id]?.length ?? 0) > 0 &&
      allianceReadiness < 65 &&
      roll(0.70 + highTensionBonus)
    ) {
      const crisis = buildCrisis('foreign_threat', country.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }

    // ── WITHDRAWAL THREAT ─────────────────────────────────────────────────────
    // Triggers after the game is established when a member's satisfaction and fiscal health collapse
    if (
      !hasActiveCrisis(country.id, 'withdrawal_threat') &&
      country.allianceSatisfaction < 35 &&
      country.fiscalPressure > 60 &&
      turn > 8 &&
      roll(0.60)
    ) {
      const crisis = buildCrisis('withdrawal_threat', country.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }

    // ── POLITICAL INSTABILITY ─────────────────────────────────────────────────
    // Triggers when a neglected member's domestic politics begin to fracture
    if (
      !hasActiveCrisis(country.id, 'political_instability') &&
      country.allianceSatisfaction < 45 &&
      country.fiscalPressure > 55 &&
      (country.turnsWithoutEngagement ?? 0) > 6 &&
      roll(0.50)
    ) {
      const crisis = buildCrisis('political_instability', country.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }

    // ── ENERGY CRISIS ─────────────────────────────────────────────────────────
    // Triggers for energy-dependent members when adversary pressure or tension is elevated
    if (
      !hasActiveCrisis(country.id, 'energy_crisis') &&
      HIGH_ENERGY_DEPENDENCY.has(country.id) &&
      turn > 6 &&
      (hasAnyCrisis('adversary_reaction') || adversaryTension > 60) &&
      roll(0.55)
    ) {
      const crisis = buildCrisis('energy_crisis', country.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }
  }

  // ── HYBRID ATTACK ─────────────────────────────────────────────────────────
  // One at a time; targets the highest-threat NATO member once the game is established
  if (
    !hasAnyCrisis('hybrid_attack') &&
    turn > 4 &&
    Object.values(countries).some((c) => c.alignment === 'adversary') &&
    roll(0.40 + highTensionBonus)
  ) {
    const target = natoMembers.slice().sort((a, b) => b.threatLevel - a.threatLevel)[0]
    if (target) {
      const crisis = buildCrisis('hybrid_attack', target.id, gameState)
      newCrises.push({ ...crisis, turnsUntilActive: 1 })
    }
  }

  // Apply difficulty modifier to turnsToResolve on every spawned crisis
  return newCrises.map((c) => ({
    ...c,
    turnsToResolve: adjustTurnsToResolve(c.turnsToResolve, difficulty),
  }))
}
