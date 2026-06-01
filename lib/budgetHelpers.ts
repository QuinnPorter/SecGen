import { type BudgetAllocation, type Country } from './gameState'
import { hasTrait } from './countryTraits'
import { BUDGET_TUNABLES as T } from './constants'

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

  const tr = allocation.troopReadiness

  // Step 2a: Starvation band — actively bleeds readiness toward the loss line.
  if (tr < T.readinessStarveThreshold) {
    return clamp(afterGdp - T.readinessStarvePenalty, 0, 100) - country.readiness
  }

  // Step 2b: Budget allocation drift toward the allocation level (±cap/turn).
  const bDiff = tr - afterGdp
  const cap   = T.readinessBudgetDriftCap
  let bDrift  = bDiff > 0 ? Math.min(cap, bDiff) : Math.max(-cap, bDiff)

  // Lean band (threshold..leanThreshold): you stop the bleed but gains are damped.
  // Losses are left at full strength so under-funding still hurts.
  if (tr < T.readinessLeanThreshold && bDrift > 0) {
    bDrift *= T.readinessLeanFactor
  }

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
  const comms = allocation.communications

  // Threat-based boost
  if (country.threatLevel > 60) sat = clamp(sat + 3, 0, 100)

  // Peace dividend
  if (country.threatLevel < 20 && turn > 8) sat = clamp(sat - 1, 0, 100)

  // Communications
  if (isEngaged) {
    sat = clamp(sat + comms / T.commsEngagedDivisor, 0, 100)
  } else {
    // Baseline drift toward 60 (50 for eurosceptic members), accelerated by
    // communications investment. Default ±0.5/turn cap rises with allocation.
    const baselineTarget = hasTrait(country.id, 'eurosceptic', country.runtimeTraits) ? 50 : 60
    const baselineCap = 0.5 + comms / T.commsBaselineDivisor
    const diffTarget = baselineTarget - sat
    const drift = diffTarget > 0 ? Math.min(baselineCap, diffTarget) : Math.max(-baselineCap, diffTarget)
    if (drift !== 0) sat = clamp(sat + drift, 0, 100)
  }

  // Starved comms accelerates satisfaction decay across the board — neglecting
  // the message channel bleeds support and feeds domestic crises.
  if (comms < T.commsDecayThreshold) {
    const decay = T.commsDecayAmount * (1 - comms / T.commsDecayThreshold)
    sat = clamp(sat - decay, 0, 100)
  }

  return sat - country.allianceSatisfaction
}

// Threat change this turn from cyber defence spending.
// Heavy cyber investment suppresses threat fast; starving it lets threat creep up.
export function computeThreatDelta(country: Country, allocation: BudgetAllocation): number {
  const cyber = allocation.cyberDefence

  // Starvation band — threat creeps upward instead of down (max at zero cyber).
  if (cyber < T.cyberCreepThreshold) {
    const creep = T.cyberCreepAmount * (1 - cyber / T.cyberCreepThreshold)
    if (creep <= 0) return 0
    const next = clamp(country.threatLevel + creep, 5, 100)
    return next - country.threatLevel
  }

  const reduction = cyber / T.cyberThreatDivisor
  if (reduction <= 0) return 0
  const next = clamp(country.threatLevel - reduction, 5, 100)
  return next - country.threatLevel
}
