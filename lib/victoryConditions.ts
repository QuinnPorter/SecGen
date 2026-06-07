import type { GameState } from './gameState'

export interface VictoryResult {
  status: 'won' | 'lost'
  reason: string
  detail: string
}

export function checkVictoryConditions(state: GameState): VictoryResult | null {
  const {
    countries,
    approvalRating,
    article5Active,
    turn,
    resolvedCrises,
    withdrawnMembers,
    lowReadinessTurns,
    lowApprovalTurns,
    initialMemberCount,
  } = state

  const natoMembers = Object.values(countries).filter((c) => c.alignment === 'nato')
  const currentMemberCount = natoMembers.length
  const allianceReadiness =
    natoMembers.length > 0
      ? Math.round(natoMembers.reduce((sum, c) => sum + c.readiness, 0) / natoMembers.length)
      : 0

  // ── LOSE CONDITIONS (checked in priority order) ────────────────────────────

  // 1. Alliance collapse: 3+ members withdrawn
  if (withdrawnMembers.length >= 3) {
    return {
      status: 'lost',
      reason: 'The Alliance Has Fractured',
      detail:
        "Three member states have withdrawn from the Treaty. The alliance's collective defence guarantee is no longer credible.",
    }
  }

  // 2. Sustained readiness failure: allianceReadiness < 20 for 4 consecutive turns
  if (lowReadinessTurns >= 4) {
    return {
      status: 'lost',
      reason: 'The Treaty Has Lost Deterrence Credibility',
      detail:
        'Alliance military readiness has collapsed. Adversaries no longer believe Article 5 will be enforced.',
    }
  }

  // 3. Secretary General removed: approvalRating < 15 for 3 consecutive turns
  if (lowApprovalTurns >= 3) {
    return {
      status: 'lost',
      reason: 'You Have Been Removed From Office',
      detail:
        'Member states have lost confidence in your leadership. An emergency summit has voted to appoint a new Secretary General.',
    }
  }

  // 4. Article 5 failure: ceasefire chosen AND affected country subsequently withdrew
  if (article5Active || resolvedCrises.some((c) => c.type === 'article5')) {
    const article5WithCeasefire = resolvedCrises.filter(
      (c) =>
        c.type === 'article5' &&
        c.chosenOptionId !== null &&
        c.options.find((o) => o.id === c.chosenOptionId)?.label.toLowerCase().includes('ceasefire'),
    )
    for (const crisis of article5WithCeasefire) {
      const country = countries[crisis.affectedCountryId]
      if (
        country?.alignment === 'neutral' ||
        withdrawnMembers.includes(crisis.affectedCountryId)
      ) {
        return {
          status: 'lost',
          reason: 'Article 5 Has Failed',
          detail:
            "The Treaty's core guarantee proved empty. The alliance's credibility as a collective defence organisation is destroyed.",
        }
      }
    }
  }

  // ── WIN CONDITIONS ─────────────────────────────────────────────────────────
  if (turn >= 80) {
    // newMembersGained = (current members) - (initial members) + (those who left)
    // e.g. started 32, now 34, 1 withdrew → joined 3, left 1, net +2; gained = 34 - 32 + 1 = 3
    const newMembersGained = currentMemberCount - initialMemberCount + withdrawnMembers.length

    // Exceptional term
    if (allianceReadiness >= 75 && newMembersGained >= 2 && approvalRating >= 65) {
      return {
        status: 'won',
        reason: 'A Generation-Defining Secretaryship',
        detail:
          'Under your leadership the Treaty has expanded, maintained its deterrence credibility, and emerged stronger than when you took office.',
      }
    }

    // Full term completed
    if (allianceReadiness >= 50 && withdrawnMembers.length === 0) {
      return {
        status: 'won',
        reason: 'Your Term Is Complete',
        detail: 'You have served a full term as Treaty Secretary General. The alliance endures.',
      }
    }
  }

  return null
}
