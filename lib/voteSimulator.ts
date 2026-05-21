import { type GameState } from './gameState'
import {
  EASTERN_MEMBERS,
  CANDIDATE_NATO_BORDERS,
  ADVERSARY_BORDERING_CANDIDATES,
} from './constants'

type VoteValue = 'yes' | 'no' | 'abstain'

export function simulateMemberVotes(
  candidateId: string,
  gameState: GameState,
): Record<string, VoteValue> {
  const { countries, budgetState } = gameState
  const { memberEngagements, turkeyEngaged } = budgetState

  const candidate           = countries[candidateId]
  const natoBorders         = CANDIDATE_NATO_BORDERS[candidateId] ?? []
  const bordersAdversary    = ADVERSARY_BORDERING_CANDIDATES.includes(candidateId)
  const candidateHighThreat = (candidate?.threatLevel ?? 0) > 60

  const votes: Record<string, VoteValue> = {}

  for (const [id, country] of Object.entries(countries)) {
    if (country.alignment !== 'nato') continue

    // Turkey: always starts at abstain threshold; only moves to yes if turkeyEngaged
    if (id === 'TUR') {
      let score = 40
      if (turkeyEngaged) score += 20
      score += Math.random() * 16 - 8
      votes[id] = score > 50 ? 'yes' : score >= 25 ? 'abstain' : 'no'
      continue
    }

    // Base disposition from alliance satisfaction
    let score: number
    if (country.allianceSatisfaction > 65)      score = 60
    else if (country.allianceSatisfaction < 45)  score = 20
    else                                         score = 40

    // Sharing a border makes the member directly invested in the candidate's security
    if (natoBorders.includes(id)) score += 20

    // Eastern members are acutely aware of high-threat neighbours
    if (candidateHighThreat && EASTERN_MEMBERS.includes(id)) score += 15

    // A candidate bordering an adversary underscores collective defence value
    if (bordersAdversary) score += 10

    // Active diplomatic engagement tips the member toward yes
    if ((memberEngagements[id] ?? 0) > 0) score += 20

    // Fiscally stretched members focus inward
    if (country.fiscalPressure > 65) score -= 10

    // Small random variance so votes don't feel mechanical
    score += Math.random() * 16 - 8

    votes[id] = score > 50 ? 'yes' : score >= 25 ? 'abstain' : 'no'
  }

  return votes
}

// A vote record passes unanimity if it contains no 'no' votes.
// Abstains and pending votes are permitted — they don't block ratification.
export function isUnanimous(votes: Record<string, VoteValue | 'pending'>): boolean {
  return !Object.values(votes).includes('no')
}

// Deterministic (no random factor) version for UI display.
// Shows how a member would lean toward a given candidate right now.
export function computeMemberTendency(
  memberId: string,
  candidateId: string,
  gameState: GameState,
): VoteValue {
  const { countries, budgetState } = gameState
  const { memberEngagements, turkeyEngaged } = budgetState

  const member    = countries[memberId]
  const candidate = countries[candidateId]
  if (!member || member.alignment !== 'nato') return 'abstain'

  const natoBorders      = CANDIDATE_NATO_BORDERS[candidateId] ?? []
  const bordersAdversary = ADVERSARY_BORDERING_CANDIDATES.includes(candidateId)
  const highThreat       = (candidate?.threatLevel ?? 0) > 60

  if (memberId === 'TUR') {
    const score = 40 + (turkeyEngaged ? 20 : 0)
    return score > 50 ? 'yes' : score >= 25 ? 'abstain' : 'no'
  }

  let score: number
  if (member.allianceSatisfaction > 65)      score = 60
  else if (member.allianceSatisfaction < 45)  score = 20
  else                                        score = 40

  if (natoBorders.includes(memberId))                        score += 20
  if (highThreat && EASTERN_MEMBERS.includes(memberId))      score += 15
  if (bordersAdversary)                                      score += 10
  if ((memberEngagements[memberId] ?? 0) > 0)                score += 20
  if (member.fiscalPressure > 65)                            score -= 10

  return score > 50 ? 'yes' : score >= 25 ? 'abstain' : 'no'
}
