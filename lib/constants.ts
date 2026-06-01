// ── Political capital action costs ────────────────────────────────────────────

export const PC_COST_ENGAGE            = 15  // engageMember
export const PC_COST_DIALOGUE          = 20  // initiateDialogue
export const PC_COST_ADVANCE_ACCESSION = 25  // advanceAccession / advanceAccession

// PC replenished per turn by difficulty (single source of truth for UI + engine).
export const PC_REPLENISH: Record<string, number> = {
  diplomat: 23,
  normal:   18,
  crisis:   12,
}

export function pcReplenishFor(difficulty: string | undefined): number {
  return PC_REPLENISH[difficulty ?? 'normal'] ?? PC_REPLENISH.normal
}

// Hard cap on banked political capital. Raised above the old 100 so that a
// disciplined player can deliberately save for a costly crisis decision instead
// of overflowing and wasting strong turns.
export const PC_MAX = 150

// ── Defence-budget effect coefficients ────────────────────────────────────────
// Single source of truth for how a 0–100 allocation slider converts into a
// per-turn mechanical effect. Tuned BOLD: each lever now spans collapse→thrive
// across its range, so specialising into one category is powerful but genuinely
// starves the others (the pool stays a hard 100-point zero-sum). Retune here.
export const BUDGET_TUNABLES = {
  // ── Troop Readiness → computeReadinessDelta ──
  readinessBudgetDriftCap: 6,   // max ± readiness/turn from allocation drift (was 3)
  readinessStarveThreshold: 20, // below this, readiness is actively bled
  readinessStarvePenalty: 4,    // readiness pts/turn lost while starved (was 2)
  readinessLeanThreshold: 35,   // 20–35 = "lean" band: real but damped gains
  readinessLeanFactor: 0.5,     // upward drift multiplied by this in the lean band

  // ── Cyber Defence → computeThreatDelta ──
  cyberThreatDivisor: 25,       // threat reduction/turn = cyber / divisor (was 50)
  cyberCreepThreshold: 10,      // below this, threat creeps UP instead of down
  cyberCreepAmount: 0.6,        // max threat pts/turn gained when cyber is starved

  // ── Communications → computeSatisfactionDelta ──
  commsEngagedDivisor: 15,      // engaged-member satisfaction boost = comms / divisor (was 25)
  commsBaselineDivisor: 40,     // baseline drift cap = 0.5 + comms / divisor (was 80)
  commsDecayThreshold: 10,      // below this, satisfaction decay accelerates
  commsDecayAmount: 1,          // max extra satisfaction pts/turn lost when comms starved

  // ── Partner Aid (applied in turnEngine) ──
  partnerAidAccessionDivisor: 50, // candidate accession score/turn = aid / divisor (was 100)
  partnerAidFiscalDivisor: 35,    // fiscal relief/turn = aid / divisor (was 60)

  // ── R&D (crisis-resolution force multiplier, applied in gameState) ──
  rdMultiplierDivisor: 60,      // crisis effect multiplier = 1 + RAndD / divisor (was 100)
} as const

// Maps ISO 3166-1 numeric codes (as strings, with leading zeros) to our alpha-3 IDs.
// These are the feature.id values in the world-atlas 110m TopoJSON.
// Malta (470) and Kosovo (XKX) have no entry — Malta is sub-pixel at 110m,
// Kosovo has no standard ISO numeric in the dataset.
export const NUMERIC_TO_ALPHA3: Record<string, string> = {
  // NATO members
  '840': 'USA',
  '124': 'CAN',
  '826': 'GBR',
  '250': 'FRA',
  '276': 'DEU',
  '380': 'ITA',
  '724': 'ESP',
  '616': 'POL',
  '528': 'NLD',
  '056': 'BEL',
  '620': 'PRT',
  '208': 'DNK',
  '578': 'NOR',
  '352': 'ISL',
  '792': 'TUR',
  '300': 'GRC',
  '203': 'CZE',
  '348': 'HUN',
  '642': 'ROU',
  '100': 'BGR',
  '703': 'SVK',
  '705': 'SVN',
  '191': 'HRV',
  '008': 'ALB',
  '499': 'MNE',
  '807': 'MKD',
  '442': 'LUX',
  '233': 'EST',
  '428': 'LVA',
  '440': 'LTU',
  // Adversaries
  '643': 'RUS',
  '112': 'BLR',
  // Candidates
  '804': 'UKR',
  '268': 'GEO',
  '070': 'BIH',
  // Neutrals
  '752': 'SWE',
  '246': 'FIN',
  '040': 'AUT',
  '756': 'CHE',
  '688': 'SRB',
  '498': 'MDA',
  '051': 'ARM',
  '031': 'AZE',
  '398': 'KAZ',
  '372': 'IRL',
  '196': 'CYP',
  '376': 'ISR',
  '504': 'MAR',
  '434': 'LBY',
  '760': 'SYR',
}

// NATO members on the eastern flank — elevated sensitivity to candidate threat levels
export const EASTERN_MEMBERS = ['EST', 'LVA', 'LTU', 'POL', 'ROU', 'BGR']

// NATO member neighbours for each likely accession candidate.
// Only pairs that share a physical land border are listed.
export const CANDIDATE_NATO_BORDERS: Record<string, string[]> = {
  UKR: ['POL', 'ROU', 'HUN', 'SVK'],
  GEO: ['TUR'],
  BIH: ['HRV', 'MNE'],
  XKX: ['ALB', 'MKD', 'MNE'],
  SRB: ['HUN', 'HRV', 'ROU', 'BGR', 'MKD', 'MNE'],
  MDA: ['ROU'],
}

// Candidates that share a border with an adversary (Russia/Belarus)
export const ADVERSARY_BORDERING_CANDIDATES = ['UKR', 'GEO']

export const ALIGNMENT_COLORS: Record<string, string> = {
  nato:      '#1d4ed8',
  adversary: '#991b1b',
  candidate: '#1e40af',
  neutral:   '#374151',
  unknown:   '#1f2937',
}

export const ALIGNMENT_HOVER_COLORS: Record<string, string> = {
  nato:      '#2563eb',
  adversary: '#b91c1c',
  candidate: '#2563eb',
  neutral:   '#4b5563',
  unknown:   '#374151',
}
