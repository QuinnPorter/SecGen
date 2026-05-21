import { type BudgetAllocation, type Country } from './gameState'
import { hasTrait } from './countryTraits'

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// Readiness change this turn for a NATO member given the current allocation.
// Mirrors the two-step logic in turnEngine: first GDP drift, then budget drift on top.
export function computeReadinessDelta(country: Country, allocation: BudgetAllocation): number {
  // Step 1: GDP drift (±2/turn toward sustainable level)
  const gdpTarget = clamp((country.gdpDefencePercent / 2.0) * 100, 0, 100)
  const gdpDiff   = gdpTarget - country.readiness
  const gdpDrift  = gdpDiff > 0 ? Math.min(2, gdpDiff) : Math.max(-2, gdpDiff)
  const afterGdp  = clamp(country.readiness + gdpDrift, 0, 100)

  // Step 2: Budget allocation drift on top (±3/turn, or -2 if starved)
  if (allocation.troopReadiness < 20) {
    return clamp(afterGdp - 2, 0, 100) - country.readiness
  }
  const bDiff  = allocation.troopReadiness - afterGdp
  const bDrift = bDiff > 0 ? Math.min(3, bDiff) : Math.max(-3, bDiff)
  return clamp(afterGdp + bDrift, 0, 100) - country.readiness
}

// Satisfaction change this turn for a NATO member.
// Mirrors the three satisfaction rules in turnEngine (threat boost, peace dividend, comms).
export function computeSatisfactionDelta(
  country: Country,
  allocation: BudgetAllocation,
  isEngaged: boolean,
  turn: number,
): number {
  let sat = country.allianceSatisfaction

  // Threat-based boost
  if (country.threatLevel > 60) sat = clamp(sat + 3, 0, 100)

  // Peace dividend
  if (country.threatLevel < 20 && turn > 8) sat = clamp(sat - 1, 0, 100)

  // Communications
  if (isEngaged) {
    sat = clamp(sat + allocation.communications / 25, 0, 100)
  } else {
    // Baseline drift toward 60 (50 for eurosceptic members), accelerated by
    // communications investment. Default ±0.5/turn cap rises with allocation.
    const baselineTarget = hasTrait(country.id, 'eurosceptic') ? 50 : 60
    const baselineCap = 0.5 + allocation.communications / 80
    const diffTarget = baselineTarget - sat
    const drift = diffTarget > 0 ? Math.min(baselineCap, diffTarget) : Math.max(-baselineCap, diffTarget)
    if (drift !== 0) sat = clamp(sat + drift, 0, 100)
  }

  return sat - country.allianceSatisfaction
}

// Threat change this turn from cyber defence spending.
export function computeThreatDelta(country: Country, allocation: BudgetAllocation): number {
  const reduction = allocation.cyberDefence / 50
  if (reduction <= 0) return 0
  const next = clamp(country.threatLevel - reduction, 5, 100)
  return next - country.threatLevel
}
