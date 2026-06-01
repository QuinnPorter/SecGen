import { type Crisis, type CrisisOption, type CrisisType, type GameState } from './gameState'
import { hasTrait } from './countryTraits'

// ── Country classification ────────────────────────────────────────────────────

// Major powers whose defence-spending decisions cascade alliance-wide
const MAJOR_POWERS = new Set(['USA', 'DEU', 'GBR', 'FRA'])

// Strategic anchors and high-energy-dependency lists are derived from
// lib/countryTraits (kingmaker, energy_dependent) — single source of truth.

// ── Special effect keys ───────────────────────────────────────────────────────
// Keys prefixed with _ are NOT applied by applyCrisisEffects today.
// They are declarations for future wiring in resolveCrisis (Phase 4+).
//
//  _allMemberSatisfaction: N    — add N to every NATO member's allianceSatisfaction
//  _accessionScore: N           — add N to the active accession score for affectedCountryId
//  _borderMemberThreatLevel: N  — add N to threat for all NATO members bordering the candidate
//  adversaryTension: N         — global adversary tension counter (Phase 5)
//  _randomChanceEscalate: 0.5   — 50 % chance the crisis auto-escalates instead of resolving

// ─────────────────────────────────────────────────────────────────────────────

// Effects are applied TWICE: immediately on resolution, then again 3 turns later.
// Design values as per-application amounts so immediate + delayed ≈ intended total.
// "Accept / do nothing" options use full negative values; compounding is the penalty.

function newId(): string {
  return crypto.randomUUID()
}

// ── BUDGET CUT ────────────────────────────────────────────────────────────────

function buildBudgetCut(countryId: string, countryName: string): Crisis {
  const severity = MAJOR_POWERS.has(countryId) ? 'critical' as const : 'medium' as const

  const options: CrisisOption[] = [
    {
      id: 'statement',
      label: 'Public Statement',
      description:
        'Release an alliance-wide statement urging all members to honour the 2% GDP commitment.',
      capitalCost: 0,
      consequences: {
        immediate:
          'The statement generates headlines but carries no binding force.',
        delayed:
          'Public pressure provided a mild credibility boost; spending remains uncertain.',
      },
      effects: { allianceSatisfaction: 3, approvalRating: 1 },
    },
    {
      id: 'diplomatic',
      label: 'Private Engagement',
      description:
        'Hold confidential ministerial talks to persuade the government to delay or scale back the cut.',
      capitalCost: 15,
      consequences: {
        immediate:
          'Talks are productive. The government signals willingness to review the timeline.',
        delayed:
          'Sustained diplomatic pressure has kept the spending plan under review.',
      },
      effects: { allianceSatisfaction: 8, approvalRating: 2 },
    },
    {
      id: 'burdensharing',
      label: 'Burden-sharing Framework',
      description:
        'Offer a tailored framework that reduces fiscal pressure while maintaining capability commitments.',
      capitalCost: 25,
      consequences: {
        immediate:
          'Finance and defence ministers meet to formalise the arrangement.',
        delayed:
          'The framework has measurably reduced fiscal pressure and stabilised the spending commitment.',
      },
      effects: { fiscalPressure: -8, allianceSatisfaction: 5, approvalRating: 2 },
    },
    {
      id: 'nothing',
      label: 'Accept the Cut',
      description:
        'Take no action — acknowledge the fiscal reality and allow the reduction to proceed.',
      capitalCost: 0,
      consequences: {
        immediate:
          'No response is issued. The budget reduction moves forward unchallenged.',
        delayed:
          'The cut has proceeded, emboldening other fiscally strained members to follow.',
      },
      effects: { allianceSatisfaction: -10, gdpDefencePercent: -0.3, approvalRating: -3 },
    },
  ]

  return {
    id: newId(),
    type: 'budget_cut',
    status: 'pending',
    affectedCountryId: countryId,
    title: `${countryName} signals defence budget reduction`,
    description:
      `${countryName} has announced plans to reduce defence spending below the 2% GDP commitment, ` +
      `citing domestic fiscal pressures. This risks weakening alliance readiness and ` +
      `encouraging other members under budgetary strain to follow suit.`,
    severity,
    turnsUntilActive: 1,
    turnsActive: 0,
    turnsToResolve: 3,
    options,
    chosenOptionId: null,
    delayedEffectApplied: false,
  }
}

// ── FOREIGN THREAT ────────────────────────────────────────────────────────────

function buildForeignThreat(countryId: string, countryName: string, state: GameState): Crisis {
  const country = state.countries[countryId]
  const threat  = country?.threatLevel ?? 30
  const severity =
    threat > 70 ? 'critical' as const :
    threat > 50 ? 'high' as const :
    threat > 30 ? 'medium' as const : 'low' as const

  const options: CrisisOption[] = [
    {
      id: 'warning',
      label: 'Issue Formal Warning',
      description:
        'Release a formal NATO communiqué warning the adversary of consequences for continued provocations.',
      capitalCost: 0,
      consequences: {
        immediate:
          `A formal warning is issued. ${countryName} reports feeling diplomatically supported.`,
        delayed:
          'The warning has reduced immediate pressure, though adversary activity remains elevated.',
      },
      effects: { threatLevel: -3, approvalRating: 2, adversaryTension: 10 },
    },
    {
      id: 'rrf',
      label: 'Deploy Rapid Response Force',
      description:
        `Order NATO's Very High Readiness Joint Task Force to forward-deploy near ${countryName}.`,
      capitalCost: 30,
      consequences: {
        immediate:
          'Allied forces arrive within 48 hours. The adversary pauses its forward movements.',
        delayed:
          'Sustained forward presence has significantly deterred further military provocations.',
      },
      effects: { threatLevel: -13, allianceSatisfaction: 10, adversaryTension: 20 },
    },
    {
      id: 'summit',
      label: 'Emergency Summit',
      description:
        'Convene an emergency ministerial summit to demonstrate unity and coordinate a collective response.',
      capitalCost: 20,
      consequences: {
        immediate:
          'The summit projects allied resolve. Member states rally around the threatened country.',
        delayed:
          'Post-summit solidarity has raised the perceived cost of adversary action.',
      },
      effects: {
        threatLevel: -5,
        allianceSatisfaction: 5,
        approvalRating: 3,
        _allMemberSatisfaction: 4,
        adversaryTension: 8,
      },
    },
    {
      id: 'bilateral',
      label: 'Bilateral Reassurance Only',
      description:
        `Send a senior envoy to ${countryName} for targeted reassurance without a full alliance mobilisation.`,
      capitalCost: 10,
      consequences: {
        immediate:
          `${countryName} is grateful for the direct attention and reports increased confidence.`,
        delayed:
          'Bilateral engagement has stabilised the local security picture.',
      },
      effects: { allianceSatisfaction: 8, threatLevel: -4 },
    },
  ]

  return {
    id: newId(),
    type: 'foreign_threat',
    status: 'pending',
    affectedCountryId: countryId,
    title: `Adversary forces mobilise near ${countryName}`,
    description:
      `Intelligence reports indicate significant adversary military movements near ${countryName}'s border. ` +
      `The member state is requesting formal reassurance and possible reinforcement from the alliance. ` +
      `Failure to respond credibly risks both territorial security and alliance cohesion.`,
    severity,
    turnsUntilActive: 1,
    turnsActive: 0,
    turnsToResolve: 4,
    options,
    chosenOptionId: null,
    delayedEffectApplied: false,
  }
}

// ── WITHDRAWAL THREAT ─────────────────────────────────────────────────────────

function buildWithdrawalThreat(
  countryId: string,
  countryName: string,
  state: GameState,
): Crisis {
  const severity = hasTrait(countryId, 'kingmaker') ? 'critical' as const : 'high' as const
  const recentlyEngaged = (state.budgetState.memberEngagements[countryId] ?? 0) > 0
  // Emergency talks effectiveness scales with prior diplomatic investment
  const emergencyGain   = recentlyEngaged ? 13 : 6

  const options: CrisisOption[] = [
    {
      id: 'emergency_talks',
      label: 'Emergency Bilateral Talks',
      description:
        `Fly senior leadership to ${countryName} for emergency consultations to address grievances directly.`,
      capitalCost: 25,
      consequences: {
        immediate:
          recentlyEngaged
            ? `Prior diplomatic groundwork makes the talks highly productive. Key grievances are addressed.`
            : `Talks begin cold — prior relationship gaps limit how much can be achieved in one visit.`,
        delayed:
          'Follow-through commitments have kept the country anchored in the alliance.',
      },
      effects: { allianceSatisfaction: emergencyGain, approvalRating: 3 },
    },
    {
      id: 'concessions',
      label: 'Offer Alliance Concessions',
      description:
        `Negotiate special arrangements tailored to ${countryName}'s stated grievances — burden, mandate, or posture.`,
      capitalCost: 35,
      consequences: {
        immediate:
          `${countryName} accepts the concessions and withdraws the threat. Tension eases domestically.`,
        delayed:
          'The arrangement holds, though other members quietly question the precedent.',
      },
      effects: { allianceSatisfaction: 15, approvalRating: -3, _allMemberSatisfaction: -2 },
    },
    {
      id: 'solidarity',
      label: 'Public Solidarity Statement',
      description:
        'Issue a joint communiqué signed by all members reaffirming the alliance\'s value and solidarity.',
      capitalCost: 5,
      consequences: {
        immediate:
          'The statement generates goodwill. The threat is not fully withdrawn but tone softens.',
        delayed:
          'Solidarity messaging has kept the political temperature below the crisis threshold.',
      },
      // Mild positive: doesn't fully resolve — see turnsToResolve behaviour
      effects: { allianceSatisfaction: 5, approvalRating: 2, _allMemberSatisfaction: 2 },
    },
    {
      id: 'bluff',
      label: "Call Their Bluff",
      description:
        'Refuse to negotiate publicly — state that NATO cannot be held hostage by membership threats.',
      capitalCost: 0,
      consequences: {
        immediate:
          `NATO refuses to negotiate under threat. ${countryName}'s government faces a domestic test of resolve.`,
        delayed:
          'The outcome remains uncertain — internal political dynamics will determine whether this stabilises or escalates.',
      },
      // _randomChanceEscalate: 0.5 — 50% chance the crisis escalates rather than resolves (wired Phase 4+)
      effects: { allianceSatisfaction: -10, _randomChanceEscalate: 0.5 },
    },
  ]

  return {
    id: newId(),
    type: 'withdrawal_threat',
    status: 'pending',
    affectedCountryId: countryId,
    title: `${countryName} threatens to reassess NATO membership`,
    description:
      `${countryName}'s government has raised fundamental questions about the value of continued ` +
      `NATO membership, citing unmet expectations and growing domestic political pressure. ` +
      `If not addressed swiftly, the threat risks emboldening populist movements in other member states.`,
    severity,
    turnsUntilActive: 0,
    turnsActive: 0,
    turnsToResolve: 2,
    options,
    chosenOptionId: null,
    delayedEffectApplied: false,
  }
}

// ── ADVERSARY REACTION ────────────────────────────────────────────────────────

function buildAdversaryReaction(
  countryId: string,
  countryName: string,
): Crisis {
  const options: CrisisOption[] = [
    {
      id: 'reaffirm',
      label: 'Reaffirm Open Door',
      description:
        'Issue a formal NATO statement reaffirming the open-door policy and the legitimacy of the accession process.',
      capitalCost: 0,
      consequences: {
        immediate:
          `NATO reaffirms its commitment. ${countryName} welcomes the public support.`,
        delayed:
          'The principled stance has bolstered the credibility of the accession track.',
      },
      effects: { allianceSatisfaction: 3, approvalRating: 2, _accessionScore: 3, adversaryTension: 8 },
    },
    {
      id: 'pause',
      label: 'Pause Accession Publicly',
      description:
        'Announce a temporary pause in the accession process to allow diplomatic channels to de-escalate.',
      capitalCost: 10,
      consequences: {
        immediate:
          `The pause signals restraint. Adversary rhetoric cools. ${countryName} expresses disappointment.`,
        delayed:
          'The pause has reduced adversary pressure but set back the accession timeline.',
      },
      effects: {
        allianceSatisfaction: -8,
        adversaryTension: -10,
        _accessionScore: -5,
      },
    },
    {
      id: 'accelerate',
      label: 'Accelerate Accession Timeline',
      description:
        'Signal that adversary pressure will speed, not slow, the accession process.',
      capitalCost: 25,
      consequences: {
        immediate:
          `${countryName} is energised. Eastern flank members brace for increased adversary activity.`,
        delayed:
          'The accelerated signal has strengthened the accession case but raised regional tensions.',
      },
      effects: {
        allianceSatisfaction: 5,
        _accessionScore: 8,
        adversaryTension: 13,
        _borderMemberThreatLevel: 5,
      },
    },
    {
      id: 'backchannel',
      label: 'Back-channel Diplomacy',
      description:
        'Open discreet communication with the adversary to manage tensions without changing the accession track.',
      capitalCost: 20,
      consequences: {
        immediate:
          'Confidential contacts are established. Public messaging remains unchanged.',
        delayed:
          'Sustained back-channel work has gradually reduced adversary pressure.',
      },
      // Delayed reapplication gives: adversaryTension -10 × 2 = -20 total
      effects: { adversaryTension: -10, approvalRating: 1 },
    },
  ]

  return {
    id: newId(),
    type: 'adversary_reaction',
    status: 'pending',
    affectedCountryId: countryId,
    title: `Adversary responds to ${countryName} accession talks`,
    description:
      `Following the opening of accession dialogue with ${countryName}, adversary forces have ` +
      `increased activity in the region and issued formal diplomatic protests. Allied members are ` +
      `divided on whether to push forward, pause, or respond with a show of force.`,
    severity: 'high',
    turnsUntilActive: 2,
    turnsActive: 0,
    turnsToResolve: 5,
    options,
    chosenOptionId: null,
    delayedEffectApplied: false,
  }
}

// ── HYBRID ATTACK ─────────────────────────────────────────────────────────────

function buildHybridAttack(
  countryId: string,
  countryName: string,
  state: GameState,
): Crisis {
  const cyberAlloc = state.budgetState.allocation.cyberDefence
  const severity   = cyberAlloc < 20 ? 'high' as const : 'medium' as const
  const fullCyberEffect = cyberAlloc > 25

  const options: CrisisOption[] = [
    {
      id: 'cyber_response',
      label: 'Activate Cyber Response',
      description:
        `Deploy NATO's Cooperative Cyber Defence Centre of Excellence assets to assist ${countryName}.`,
      capitalCost: 15,
      consequences: {
        immediate:
          fullCyberEffect
            ? 'High cyber allocation enables a robust, coordinated counter-operation.'
            : 'Cyber assets are deployed but constrained by current alliance-wide investment levels.',
        delayed:
          'Coordinated cyber defence has significantly reduced the attack surface.',
      },
      effects: {
        threatLevel: fullCyberEffect ? -6 : -3,
        approvalRating: 2,
      },
    },
    {
      id: 'attribution',
      label: 'Public Attribution',
      description:
        'Formally attribute the campaign to the adversary and release intelligence evidence publicly.',
      capitalCost: 0,
      consequences: {
        immediate:
          'The attribution is widely covered. International partners condemn the campaign.',
        delayed:
          'Public attribution has imposed reputational costs on the adversary with limited partners.',
      },
      effects: { approvalRating: 3, adversaryTension: 10 },
    },
    {
      id: 'quiet_reinforce',
      label: 'Quietly Reinforce Defences',
      description:
        `Provide classified technical assistance to ${countryName} without public attribution.`,
      capitalCost: 20,
      consequences: {
        immediate:
          `${countryName}'s defences are reinforced. The adversary is unaware of the full scope.`,
        delayed:
          'Sustained quiet assistance has hardened the target without triggering escalation.',
      },
      effects: { threatLevel: -4, allianceSatisfaction: 3 },
    },
    {
      id: 'emergency_aid',
      label: 'Request Emergency Allied Aid',
      description:
        'Formally invoke NATO crisis support mechanisms to pool allied cyber resources.',
      capitalCost: 10,
      consequences: {
        immediate:
          `${countryName} receives an immediate surge of allied expertise and tooling.`,
        delayed:
          'Pooled allied resources have significantly degraded the adversary campaign.',
      },
      effects: {
        allianceSatisfaction: 3,
        threatLevel: -3,
        // Additional delayed threat reduction encoded as second application
      },
    },
  ]

  return {
    id: newId(),
    type: 'hybrid_attack',
    status: 'pending',
    affectedCountryId: countryId,
    title: `Hybrid warfare campaign detected targeting ${countryName}`,
    description:
      `Intelligence confirms an active disinformation and cyber campaign targeting ${countryName}'s ` +
      `critical infrastructure and public institutions, consistent with adversary hybrid warfare doctrine. ` +
      `Public confidence in government systems is declining and allied concern is mounting.`,
    severity,
    turnsUntilActive: 1,
    turnsActive: 0,
    turnsToResolve: 4,
    options,
    chosenOptionId: null,
    delayedEffectApplied: false,
  }
}

// ── POLITICAL INSTABILITY ─────────────────────────────────────────────────────

function buildPoliticalInstability(countryId: string, countryName: string): Crisis {
  const options: CrisisOption[] = [
    {
      id: 'endorse_govt',
      label: 'Endorse Current Government',
      description:
        `Issue a statement of confidence in ${countryName}'s current government and its NATO commitment.`,
      capitalCost: 5,
      consequences: {
        immediate:
          'The endorsement stabilises the coalition and reassures markets.',
        delayed:
          'Government continuity has kept alliance commitments intact — for now.',
      },
      // Risk of backlash if government falls: _governmentFallPenalty wired Phase 4+
      effects: { allianceSatisfaction: 5, approvalRating: 2, _governmentFallPenalty: -10 },
    },
    {
      id: 'cross_party',
      label: 'Engage Cross-Party',
      description:
        'Meet with opposition leaders to build bipartisan support for NATO membership regardless of election outcome.',
      capitalCost: 20,
      consequences: {
        immediate:
          'Both government and opposition are brought into a NATO dialogue — commitment is broadly endorsed.',
        delayed:
          'Cross-party buy-in has insulated NATO commitment from the domestic political cycle.',
      },
      effects: { allianceSatisfaction: 8, approvalRating: 3 },
    },
    {
      id: 'visible_presence',
      label: 'Increase Visible NATO Presence',
      description:
        `Arrange a high-profile NATO exercise or visit to ${countryName} to shift public opinion toward the alliance.`,
      capitalCost: 15,
      consequences: {
        immediate:
          'The show of allied presence generates positive coverage and public interest.',
        delayed:
          'Sustained visibility has measurably improved public support for NATO membership.',
      },
      effects: { allianceSatisfaction: 6, fiscalPressure: -3, approvalRating: 2 },
    },
    {
      id: 'wait',
      label: 'Wait and See',
      description:
        'Take no action — allow the domestic political situation to resolve itself.',
      capitalCost: 0,
      consequences: {
        immediate:
          'NATO takes no position. The crisis continues to unfold without external input.',
        delayed:
          'Inaction has allowed domestic anti-NATO sentiment to harden.',
      },
      effects: { allianceSatisfaction: -15, fiscalPressure: 10 },
    },
  ]

  return {
    id: newId(),
    type: 'political_instability',
    status: 'pending',
    affectedCountryId: countryId,
    title: `Government crisis threatens ${countryName}'s NATO commitment`,
    description:
      `A domestic political crisis in ${countryName} has raised uncertainty about the continuity ` +
      `of its NATO commitments. Opposition forces are questioning the value of alliance membership, ` +
      `and early polling suggests public support for NATO has dipped to historic lows.`,
    severity: 'medium',
    turnsUntilActive: 2,
    turnsActive: 0,
    turnsToResolve: 4,
    options,
    chosenOptionId: null,
    delayedEffectApplied: false,
  }
}

// ── ENERGY CRISIS ─────────────────────────────────────────────────────────────

function buildEnergyCrisis(countryId: string, countryName: string): Crisis {
  const severity = hasTrait(countryId, 'energy_dependent') ? 'high' as const : 'medium' as const

  const options: CrisisOption[] = [
    {
      id: 'energy_sharing',
      label: 'Emergency Energy Sharing',
      description:
        'Coordinate emergency interconnection of allied energy grids and storage reserves for the affected country.',
      capitalCost: 25,
      consequences: {
        immediate:
          `Allied energy is rerouted to ${countryName}. Prices stabilise and public panic subsides.`,
        delayed:
          'Sustained energy solidarity has reduced economic pressure and kept alliance commitment stable.',
      },
      effects: { fiscalPressure: -10, allianceSatisfaction: 8, approvalRating: 3 },
    },
    {
      id: 'lng_aid',
      label: 'Fast-track LNG Infrastructure',
      description:
        'Fund and accelerate construction of LNG terminal or regasification capacity in the affected country.',
      capitalCost: 35,
      consequences: {
        immediate:
          'Construction begins immediately with allied financing. Energy security projections improve.',
        delayed:
          'Infrastructure is operational. The country\'s long-term energy dependency on the adversary is permanently reduced.',
      },
      effects: { fiscalPressure: -15, allianceSatisfaction: 10, approvalRating: 4 },
    },
    {
      id: 'diplomatic_pressure',
      label: 'Diplomatic Pressure on Adversary',
      description:
        'Formally demand the adversary restore energy supply and impose targeted economic countermeasures.',
      capitalCost: 10,
      consequences: {
        immediate:
          'The demand is lodged. Adversary is publicly shamed but has not yet changed behaviour.',
        delayed:
          'Economic countermeasures have imposed costs on the adversary, creating minor supply improvements.',
      },
      effects: { fiscalPressure: -4, approvalRating: 2, adversaryTension: 8 },
    },
    {
      id: 'bilateral_finance',
      label: 'Bilateral Financial Support',
      description:
        `Provide direct financial aid to ${countryName} to offset energy costs without structural reform.`,
      capitalCost: 15,
      consequences: {
        immediate:
          `${countryName} receives immediate financial relief. Fiscal pressure drops.`,
        delayed:
          'Aid has provided short-term relief but structural energy dependency remains.',
      },
      effects: { fiscalPressure: -8, allianceSatisfaction: 4 },
    },
  ]

  return {
    id: newId(),
    type: 'energy_crisis',
    status: 'pending',
    affectedCountryId: countryId,
    title: `${countryName} faces energy supply disruption`,
    description:
      `${countryName} is experiencing significant energy supply disruption linked to adversary ` +
      `pressure on strategic pipelines and supply contracts. Economic strain is mounting and ` +
      `public support for NATO commitments is weakening as energy prices spike.`,
    severity,
    turnsUntilActive: 2,
    turnsActive: 0,
    turnsToResolve: 5,
    options,
    chosenOptionId: null,
    delayedEffectApplied: false,
  }
}

// ── ARTICLE 5 ─────────────────────────────────────────────────────────────────

function buildArticle5(countryId: string, countryName: string): Crisis {
  const options: CrisisOption[] = [
    {
      id: 'collective_defence',
      label: 'Full Collective Defence',
      description:
        'Invoke Article 5 in full — commit all available NATO forces to the defence of the attacked member.',
      capitalCost: 45,
      consequences: {
        immediate:
          'Allied forces mobilise across the theatre. The full weight of the alliance is committed.',
        delayed:
          'The collective response has restored territorial integrity and demonstrated alliance resolve.',
      },
      effects: {
        threatLevel: -40,
        _allMemberSatisfaction: 15,
        adversaryTension: 30,
        approvalRating: 10,
      },
    },
    {
      id: 'proportional_response',
      label: 'Proportional Measured Response',
      description:
        'Respond with calibrated force — enough to deter further aggression without risking wider escalation.',
      capitalCost: 25,
      consequences: {
        immediate:
          'A proportional response is launched. Allies note the restraint with mixed reactions.',
        delayed:
          'The measured approach contained escalation but left some allies questioning commitment.',
      },
      effects: {
        threatLevel: -20,
        adversaryTension: 15,
        approvalRating: -5,
      },
    },
    {
      id: 'ceasefire',
      label: 'Seek Ceasefire Immediately',
      description:
        'Prioritise de-escalation — pursue an immediate ceasefire through emergency diplomatic channels.',
      capitalCost: 15,
      consequences: {
        immediate:
          `NATO requests an immediate ceasefire. ${countryName} expresses shock at the constrained response.`,
        delayed:
          "The ceasefire holds, but NATO's credibility as a collective defence guarantee has been severely damaged.",
      },
      effects: {
        threatLevel: -10,
        adversaryTension: -10,
        _allMemberSatisfaction: -20,
        approvalRating: -15,
      },
    },
  ]

  return {
    id: newId(),
    type: 'article5',
    status: 'active',       // appears in IntelBrief immediately this turn
    affectedCountryId: countryId,
    title: `Article 5 Invoked — ${countryName} Under Attack`,
    description:
      `A member state has suffered an armed attack that triggers Article 5 of the North Atlantic Treaty. ` +
      `All Allied nations are obligated to take such action as deemed necessary, including the use of armed force. ` +
      `This is the most consequential decision NATO can face. The world is watching.`,
    severity: 'critical',
    turnsUntilActive: 0,
    turnsActive: 0,
    turnsToResolve: 1,      // must act immediately — deferring causes auto-escalation
    options,
    chosenOptionId: null,
    delayedEffectApplied: false,
  }
}

// ── Public dispatcher ─────────────────────────────────────────────────────────

export function buildCrisis(
  type: CrisisType,
  countryId: string,
  gameState: GameState,
): Crisis {
  const country     = gameState.countries[countryId]
  const countryName = country?.name ?? countryId

  switch (type) {
    case 'budget_cut':
      return buildBudgetCut(countryId, countryName)
    case 'foreign_threat':
      return buildForeignThreat(countryId, countryName, gameState)
    case 'withdrawal_threat':
      return buildWithdrawalThreat(countryId, countryName, gameState)
    case 'adversary_reaction':
      return buildAdversaryReaction(countryId, countryName)
    case 'hybrid_attack':
      return buildHybridAttack(countryId, countryName, gameState)
    case 'political_instability':
      return buildPoliticalInstability(countryId, countryName)
    case 'energy_crisis':
      return buildEnergyCrisis(countryId, countryName)
    case 'article5':
      return buildArticle5(countryId, countryName)
    case 'non_aligned_election':
      return buildNonAlignedElection(countryId, countryName)
  }
}

// ── NON-ALIGNED ELECTION ──────────────────────────────────────────────────────
// A NATO member elects a leadership skeptical of the alliance. The player picks
// from four responses; failure to act risks the country drifting toward neutrality.

function buildNonAlignedElection(countryId: string, countryName: string): Crisis {
  const severity = hasTrait(countryId, 'kingmaker') ? 'critical' as const : 'high' as const

  const options: CrisisOption[] = [
    {
      id: 'diplomatic_engagement',
      label: 'Diplomatic Engagement',
      description:
        `Open a sustained bilateral channel with ${countryName}'s new government to find common ground on alliance commitments.`,
      capitalCost: 30,
      consequences: {
        immediate:
          `${countryName}'s leadership responds to high-level outreach. Public messaging softens; commitments hold.`,
        delayed:
          'Follow-up visits and joint announcements anchor the relationship; satisfaction continues to recover.',
      },
      effects: { allianceSatisfaction: 8, approvalRating: 2 },
    },
    {
      id: 'public_pressure',
      label: 'Public Pressure Campaign',
      description:
        `Mobilise allied media and civil society to highlight the costs of stepping back from NATO commitments.`,
      capitalCost: 20,
      consequences: {
        immediate:
          `Public framing forces ${countryName}'s coalition to defend its alliance position — modest gain, but the move bruises domestic politics.`,
        delayed:
          'The pressure has lasting effects on coalition dynamics — political instability is more likely.',
      },
      effects: { allianceSatisfaction: 4, approvalRating: -3, fiscalPressure: 3 },
    },
    {
      id: 'quiet_accommodation',
      label: 'Quiet Accommodation',
      description:
        `Accept the new political reality and adjust expectations — relieve burden requests, accept the rhetorical distance.`,
      capitalCost: 5,
      consequences: {
        immediate:
          `${countryName}'s government welcomes the eased pressure. Fiscal stress drops, but the country's alliance posture cools.`,
        delayed:
          'The accommodation has bedded in. ${countryName} is structurally more Eurosceptic going forward.',
      },
      effects: { allianceSatisfaction: -3, fiscalPressure: -3 },
    },
    {
      id: 'wait_and_see',
      label: 'Wait and See',
      description:
        'Refrain from intervention and let the new coalition find its footing on its own terms.',
      capitalCost: 0,
      consequences: {
        immediate:
          'No public NATO response. The new government has free rein to define its alliance stance.',
        delayed:
          'The wait risks letting the country drift — if unresolved, alignment may shift.',
      },
      effects: { allianceSatisfaction: -5 },
    },
  ]

  return {
    id: newId(),
    type: 'non_aligned_election',
    status: 'pending',
    affectedCountryId: countryId,
    title: `${countryName}: Alliance-skeptic coalition wins election`,
    description:
      `${countryName}'s electorate has handed power to a coalition openly skeptical of NATO commitments, ` +
      `pledging to renegotiate burden sharing and review long-standing alliance positions. ` +
      `Without a deliberate response, the country may drift toward strategic neutrality.`,
    severity,
    turnsUntilActive: 0,
    turnsActive: 0,
    turnsToResolve: 3,
    options,
    chosenOptionId: null,
    delayedEffectApplied: false,
  }
}
