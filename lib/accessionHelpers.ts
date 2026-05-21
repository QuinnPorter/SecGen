import { type Country, type GameState } from './gameState'

export interface AccessionFactor {
  label: string
  delta: number
}

// Returns every scoring factor with its point contribution.
// Caller can sort/filter to show the most impactful ones.
export function computeAccessionBreakdown(
  country: Country,
  gameState: GameState,
): AccessionFactor[] {
  const process    = gameState.accessionProcesses[country.id]
  const { partnerAid } = gameState.budgetState.allocation
  const factors: AccessionFactor[] = []

  // Democracy & stability
  factors.push({ label: 'Base eligibility', delta: 20 })
  if (country.fiscalPressure < 40) factors.push({ label: 'Stable economy', delta: 10 })
  if (country.fiscalPressure > 70) factors.push({ label: 'Economic instability', delta: -10 })

  // Military contribution
  if (country.gdpDefencePercent >= 2.0)      factors.push({ label: 'Defence spending ≥2% GDP', delta: 25 })
  else if (country.gdpDefencePercent >= 1.5)  factors.push({ label: 'Defence spending ≥1.5% GDP', delta: 15 })
  else if (country.gdpDefencePercent >= 1.0)  factors.push({ label: 'Defence spending ≥1% GDP', delta: 8 })

  // Threat environment
  if (country.threatLevel > 60)       factors.push({ label: 'High threat environment', delta: 20 })
  else if (country.threatLevel >= 30)  factors.push({ label: 'Moderate threat environment', delta: 10 })
  else                                 factors.push({ label: 'Low threat environment', delta: 5 })

  // Alliance relations
  if (partnerAid > 30)       factors.push({ label: 'Strong partner aid', delta: 15 })
  else if (partnerAid > 15)  factors.push({ label: 'Partner aid allocation', delta: 8 })

  if (process) {
    if (process.turnsInStage > 4)            factors.push({ label: 'Established dialogue (+4 turns)', delta: 10 })
    if (process.adversaryReactionTriggered)  factors.push({ label: 'Adversary pressure', delta: -10 })
  }

  return factors
}

export function computeAccessionScore(country: Country, gameState: GameState): number {
  const process    = gameState.accessionProcesses[country.id]
  const { partnerAid } = gameState.budgetState.allocation

  let score = 0

  // Democracy & stability (0–30 points)
  score += 20 // base for any candidate/neutral
  if (country.fiscalPressure < 40) score += 10
  if (country.fiscalPressure > 70) score -= 10

  // Military contribution (0–25 points)
  if (country.gdpDefencePercent >= 2.0)      score += 25
  else if (country.gdpDefencePercent >= 1.5)  score += 15
  else if (country.gdpDefencePercent >= 1.0)  score += 8
  // below 1.0 → 0 points

  // Threat environment (0–20 points)
  if (country.threatLevel > 60)        score += 20
  else if (country.threatLevel >= 30)  score += 10
  else                                 score += 5

  // Alliance relations (0–25 points)
  if (partnerAid > 30)       score += 15
  else if (partnerAid > 15)  score += 8
  if (process) {
    if (process.turnsInStage > 4)             score += 10
    if (process.adversaryReactionTriggered)   score -= 10
  }

  return Math.max(0, Math.min(100, score))
}
