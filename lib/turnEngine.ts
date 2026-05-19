import { type Country, type GameState } from './gameState'

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function applyPassiveChanges(state: GameState): Partial<GameState> {
  const updatedCountries = { ...state.countries }

  for (const id of Object.keys(updatedCountries)) {
    const c = updatedCountries[id]
    if (c.alignment !== 'nato') continue

    const next: Partial<Country> = {}

    // Under-spenders accumulate domestic fiscal pressure
    if (c.gdpDefencePercent < 2.0) {
      next.fiscalPressure = clamp(c.fiscalPressure + 2, 0, 100)
    }

    // Shared threat focuses political will
    if (c.threatLevel > 60) {
      next.allianceSatisfaction = clamp(c.allianceSatisfaction + 3, 0, 100)
    }

    // Peace dividend: complacency when threat is low and game is mature
    if (c.threatLevel < 20 && state.turn > 8) {
      const base = next.allianceSatisfaction ?? c.allianceSatisfaction
      next.allianceSatisfaction = clamp(base - 1, 0, 100)
    }

    // Readiness drifts toward the level sustainable at current spending.
    // At 2% GDP the target is 100; at 1% it is 50; clamped to [0, 100].
    const target = clamp((c.gdpDefencePercent / 2.0) * 100, 0, 100)
    const diff = target - c.readiness
    const drift = diff > 0 ? Math.min(2, diff) : Math.max(-2, diff)
    if (drift !== 0) next.readiness = clamp(c.readiness + drift, 0, 100)

    if (Object.keys(next).length > 0) {
      updatedCountries[id] = { ...c, ...next }
    }
  }

  // Population-weighted readiness across all NATO members
  const natoMembers = Object.values(updatedCountries).filter((c) => c.alignment === 'nato')
  const totalPop = natoMembers.reduce((sum, c) => sum + c.population, 0)
  const weightedReadiness =
    totalPop > 0
      ? natoMembers.reduce((sum, c) => sum + c.readiness * c.population, 0) / totalPop
      : 0

  // Approval rating: cumulative delta each turn
  const unhappyCount = natoMembers.filter((c) => c.allianceSatisfaction < 40).length
  const approvalDelta = (weightedReadiness > 70 ? 1 : 0) - unhappyCount * 2
  const approvalRating = clamp(state.approvalRating + approvalDelta, 0, 100)

  return { countries: updatedCountries, approvalRating }
}
