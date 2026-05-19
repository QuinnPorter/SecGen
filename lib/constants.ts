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
