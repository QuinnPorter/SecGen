import { type AccessionStage, type GameState, type Crisis } from './gameState'

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function adjustTurnsToResolve(base: number, difficulty: string): number {
  if (difficulty === 'diplomat') return base + 1
  if (difficulty === 'crisis')   return Math.max(1, base - 1)
  return base
}

// Which adversary countries each expansion candidate shares a border with
const CANDIDATE_ADVERSARY_MAP: Record<string, string[]> = {
  UKR: ['RUS', 'BLR'],
  GEO: ['RUS'],
}

// NATO members that share a land border with each adversary
const NATO_BORDERING_ADVERSARY: Record<string, string[]> = {
  RUS: ['NOR', 'FIN', 'EST', 'LVA', 'LTU', 'POL'],
  BLR: ['POL', 'LTU', 'LVA'],
}

export function checkAdversaryReactions(
  candidateId: string,
  stage: AccessionStage,
  gameState: GameState,
): GameState {
  if (stage !== 'map') return gameState

  const candidate = gameState.countries[candidateId]
  if (!candidate) return gameState

  const adversaryNeighbors = CANDIDATE_ADVERSARY_MAP[candidateId] ?? []
  const bordersAdversary   = adversaryNeighbors.length > 0
  const difficulty         = gameState.difficulty ?? 'normal'

  let countries          = { ...gameState.countries }
  let crises             = [...gameState.crises]
  let accessionProcesses = { ...gameState.accessionProcesses }
  const process          = accessionProcesses[candidateId]

  if (bordersAdversary) {
    // Mark the process so the score system and UI can reflect it
    if (process) {
      accessionProcesses = {
        ...accessionProcesses,
        [candidateId]: { ...process, adversaryReactionTriggered: true },
      }
    }

    // Candidate itself faces an immediate threat increase
    countries = {
      ...countries,
      [candidateId]: {
        ...candidate,
        threatLevel: clamp(candidate.threatLevel + 15, 0, 100),
      },
    }

    // Threat spillover to every NATO member that borders the same adversary
    const affectedNatoIds = new Set<string>()
    for (const adversaryId of adversaryNeighbors) {
      for (const memberId of (NATO_BORDERING_ADVERSARY[adversaryId] ?? [])) {
        affectedNatoIds.add(memberId)
      }
    }
    for (const memberId of affectedNatoIds) {
      const member = countries[memberId]
      if (member?.alignment === 'nato') {
        countries = {
          ...countries,
          [memberId]: { ...member, threatLevel: clamp(member.threatLevel + 8, 0, 100) },
        }
      }
    }

    const candidateName = candidate.name
    const crisis: Crisis = {
      id: crypto.randomUUID(),
      type: 'adversary_reaction',
      status: 'pending',
      affectedCountryId: candidateId,
      title: `Adversary Response: ${candidateName} Accession`,
      description:
        `Russia has escalated military posturing in response to NATO's Membership Action Plan ` +
        `for ${candidateName}. Intelligence reports indicate increased air and naval activity ` +
        `near NATO's eastern borders. Allied members are demanding a coordinated response.`,
      severity: 'high',
      turnsUntilActive: 2,
      turnsActive: 0,
      turnsToResolve: adjustTurnsToResolve(4, difficulty),
      options: [
        {
          id: 'warn',
          label: 'Issue Public Warning',
          description: 'Release a formal NATO statement condemning the escalation and reaffirming the open-door policy.',
          capitalCost: 10,
          consequences: {
            immediate: 'NATO publishes a formal condemnation. International media attention intensifies briefly.',
            delayed: 'The warning maintained political visibility but produced limited deterrent effect.',
          },
          effects: { approvalRating: 3, allianceSatisfaction: 5 },
        },
        {
          id: 'reinforce',
          label: 'Reinforce Eastern Flank',
          description: 'Order additional NATO forces and assets into forward positions near the candidate\'s borders.',
          capitalCost: 20,
          consequences: {
            immediate: 'Allied forces begin repositioning. The candidate country reports feeling more secure.',
            delayed: 'Sustained military presence has measurably deterred further adversary provocations.',
          },
          effects: { threatLevel: -12, approvalRating: 2 },
        },
        {
          id: 'backchannel',
          label: 'Open Back-channel',
          description: 'Authorise quiet diplomatic contact to prevent miscalculation and de-escalate the situation.',
          capitalCost: 15,
          consequences: {
            immediate: 'Back-channel contacts are established through neutral intermediaries.',
            delayed: 'Quiet diplomacy has reduced the immediate threat of military escalation.',
          },
          effects: { threatLevel: -20, approvalRating: 1 },
        },
      ],
      chosenOptionId: null,
      delayedEffectApplied: false,
    }
    crises = [...crises, crisis]
  } else {
    // Adversaries watch all expansions — mild surveillance-driven threat rise
    countries = {
      ...countries,
      [candidateId]: {
        ...candidate,
        threatLevel: clamp(candidate.threatLevel + 5, 0, 100),
      },
    }
  }

  return { ...gameState, countries, crises, accessionProcesses }
}
