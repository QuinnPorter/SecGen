'use client'

import { useGameStore, Country, type AccessionStage, type GameState } from '@/lib/gameState'
import { computeReadinessDelta, computeSatisfactionDelta, computeThreatDelta } from '@/lib/budgetHelpers'
import { computeAccessionScore, computeAccessionBreakdown } from '@/lib/accessionHelpers'
import { computeMemberTendency } from '@/lib/voteSimulator'
import { PC_COST_ENGAGE, PC_COST_DIALOGUE, PC_COST_ADVANCE_ACCESSION } from '@/lib/constants'

const NATO_ACCESSION_YEAR: Record<string, number> = {
  USA: 1949, CAN: 1949, GBR: 1949, FRA: 1949, ITA: 1949,
  NLD: 1949, BEL: 1949, PRT: 1949, DNK: 1949, NOR: 1949,
  ISL: 1949, LUX: 1949,
  GRC: 1952, TUR: 1952,
  DEU: 1955,
  ESP: 1982,
  CZE: 1999, HUN: 1999, POL: 1999,
  BGR: 2004, EST: 2004, LVA: 2004, LTU: 2004,
  ROU: 2004, SVK: 2004, SVN: 2004,
  ALB: 2009, HRV: 2009,
  MNE: 2017,
  MKD: 2020,
  FIN: 2023,
  SWE: 2024,
}

const ALIGNMENT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  nato:      { label: 'NATO Member',  bg: '#1d4ed8', color: '#fff' },
  adversary: { label: 'Adversary',    bg: '#991b1b', color: '#fff' },
  candidate: { label: 'Candidate',    bg: '#1e3a8a', color: '#93c5fd' },
  neutral:   { label: 'Neutral',      bg: '#374151', color: '#d1d5db' },
}

function StatBar({
  label,
  value,
  max = 100,
  barColor,
}: {
  label: string
  value: number
  max?: number
  barColor: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: '#9ca3af' }}>
        <span>{label}</span>
        <span style={{ color: '#e8edf2' }}>{value}</span>
      </div>
      <div
        className="h-1.5 rounded-full"
        style={{ background: '#0d1f2d' }}
        title={`${label}: ${value} / ${max}`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  )
}

function GdpBar({ country }: { country: Country }) {
  const pct = country.gdpDefencePercent
  const barColor = pct >= 2 ? '#16a34a' : '#dc2626'
  const textColor = pct >= 2 ? '#4ade80' : '#f87171'
  const barWidth = Math.min(100, (pct / 5) * 100) // scale: 5% = full bar

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: '#9ca3af' }}>
        <span>Defence spending</span>
        <span style={{ color: textColor }}>
          {pct > 0 ? `${pct.toFixed(1)}% GDP` : 'N/A'}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#0d1f2d' }} title={`Defence spending: ${pct > 0 ? pct.toFixed(1) : 'N/A'}% GDP (target: 2.0%)`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%`, background: barColor }}
        />
      </div>
      <div className="flex justify-between text-xs mt-0.5" style={{ color: '#4b5563' }}>
        <span>0%</span>
        <span>2%</span>
        <span>5%</span>
      </div>
    </div>
  )
}

const STAGE_LABEL: Record<AccessionStage, string> = {
  none:       'None',
  dialogue:   'Dialogue',
  map:        'MAP',
  invitation: 'Invitation',
  acceding:   'Acceding',
}
const STAGE_COLOR: Record<AccessionStage, string> = {
  none:       '#6b7280',
  dialogue:   '#9ca3af',
  map:        '#f59e0b',
  invitation: '#93c5fd',
  acceding:   '#4ade80',
}
const NEXT_STAGE_LABEL: Partial<Record<AccessionStage, string>> = {
  dialogue:   'Advance to MAP Stage',
  map:        'Extend Invitation',
  invitation: 'Call Member Vote',
  acceding:   'Finalise Accession',
}

const VOTE_STYLE: Record<string, { symbol: string; color: string }> = {
  yes:     { symbol: '✓', color: '#4ade80' },
  abstain: { symbol: '~', color: '#9ca3af' },
  no:      { symbol: '✗', color: '#f87171' },
}

function AccessionScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#4ade80' : score >= 50 ? '#f59e0b' : '#3b82f6'
  return (
    <div className="h-1.5 w-full rounded-full" style={{ background: '#0a1929' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  )
}

function deltaLabel(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return rounded >= 0 ? `+${rounded.toFixed(1)}` : `${rounded.toFixed(1)}`
}

function deltaColor(value: number): string {
  if (value > 0) return '#4ade80'
  if (value < 0) return '#f87171'
  return '#6b7280'
}

const SEV_DOT_COLOR: Record<string, string> = {
  low:      '#6b7280',
  medium:   '#f59e0b',
  high:     '#dc2626',
  critical: '#ef4444',
}

export default function CountryPanel() {
  const selectedCountry    = useGameStore((s) => s.selectedCountry)
  const countries          = useGameStore((s) => s.countries)
  const selectCountry      = useGameStore((s) => s.selectCountry)
  const engageMember       = useGameStore((s) => s.engageMember)
  const allocation         = useGameStore((s) => s.budgetState.allocation)
  const pc                 = useGameStore((s) => s.budgetState.totalPoliticalCapital)
  const engagements        = useGameStore((s) => s.budgetState.memberEngagements)
  const turkeyEngaged      = useGameStore((s) => s.budgetState.turkeyEngaged)
  const turn               = useGameStore((s) => s.turn)
  const accessionProcesses = useGameStore((s) => s.accessionProcesses)
  const initiateDialogue   = useGameStore((s) => s.initiateDialogue)
  const advanceAccession   = useGameStore((s) => s.advanceAccession)
  const finaliseAccession  = useGameStore((s) => s.finaliseAccession)
  const resolvedCrises     = useGameStore((s) => s.resolvedCrises)

  const isOpen    = selectedCountry !== null
  const country   = selectedCountry ? countries[selectedCountry] : null
  const badge     = country ? ALIGNMENT_BADGE[country.alignment] : null
  const isEngaged = selectedCountry ? (engagements[selectedCountry] ?? 0) > 0 : false
  const turnsLeft = selectedCountry ? (engagements[selectedCountry] ?? 0) : 0

  // Minimal state snapshot for score/tendency helpers
  const stateSnap = {
    countries,
    accessionProcesses,
    budgetState: { allocation, memberEngagements: engagements, turkeyEngaged },
  } as unknown as GameState

  const activeProcess = selectedCountry ? accessionProcesses[selectedCountry] : null
  const isExpansionTarget = country?.alignment === 'candidate' || country?.alignment === 'neutral'

  // Active accession processes for vote tendency (NATO member view)
  const activeProcessList = Object.values(accessionProcesses)

  // Crisis history for selected country
  const countryResolvedCrises = selectedCountry
    ? resolvedCrises.filter((c) => c.affectedCountryId === selectedCountry)
    : []
  const escalatedCount = countryResolvedCrises.filter((c) => c.status === 'escalated').length
  const isFragile = country?.alignment === 'nato' && escalatedCount >= 2

  return (
    <div
      className="absolute right-0 top-0 h-full overflow-y-auto z-20"
      style={{
        width: 380,
        background: '#152840',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 280ms ease-in-out',
        borderLeft: '1px solid #1e3a5f',
      }}
    >
      {country && badge && (
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h2 className="font-semibold leading-tight" style={{ fontSize: 24, color: '#e8edf2' }}>
                {country.name}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>
                {country.region}
              </p>
            </div>
            <button
              onClick={() => selectCountry(null)}
              className="flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
              style={{
                width: 28,
                height: 28,
                background: '#1e3a5f',
                color: '#9ca3af',
              }}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          {/* Alignment badge */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
            {isFragile && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: '#451a03', color: '#fbbf24', border: '1px solid #92400e' }}
              >
                ⚠ Fragile Member
              </span>
            )}
            {country.alignment === 'nato' && NATO_ACCESSION_YEAR[country.id] && (
              <span className="text-xs" style={{ color: '#6b7280' }}>
                Member since {NATO_ACCESSION_YEAR[country.id]}
              </span>
            )}
          </div>

          {/* Stats */}
          <div
            className="rounded-lg p-4 mb-5"
            style={{ background: '#0d1f2d' }}
          >
            <GdpBar country={country} />

            {country.alignment === 'nato' && (
              <StatBar
                label="Alliance satisfaction"
                value={country.allianceSatisfaction}
                barColor="#2563eb"
              />
            )}

            <StatBar
              label="Threat level"
              value={country.threatLevel}
              barColor={country.threatLevel >= 60 ? '#dc2626' : '#f59e0b'}
            />

            <StatBar
              label="Fiscal pressure"
              value={country.fiscalPressure}
              barColor={country.fiscalPressure >= 60 ? '#f59e0b' : '#6b7280'}
            />
          </div>

          {/* Flavour text */}
          <p className="text-sm leading-relaxed mb-5" style={{ color: '#9ca3af' }}>
            {country.notes}
          </p>

          {/* Expansion section — candidates and neutrals */}
          {isExpansionTarget && (
            <div className="rounded-lg p-4 mb-4" style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}>
              <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                Expansion
              </p>

              {activeProcess ? (
                /* Active process view */
                <div className="space-y-3">
                  {/* Stage + turns */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        background: '#1a2f47',
                        color: STAGE_COLOR[activeProcess.stage],
                      }}
                    >
                      {STAGE_LABEL[activeProcess.stage]}
                    </span>
                    <span className="text-xs" style={{ color: '#4b5563' }}>
                      {activeProcess.turnsInStage} turn{activeProcess.turnsInStage !== 1 ? 's' : ''} in stage
                    </span>
                  </div>

                  {/* Score bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6b7280' }}>
                      <span>Accession score</span>
                      <span style={{ color: activeProcess.score >= 80 ? '#4ade80' : '#e8edf2' }}>
                        {activeProcess.score} / 100
                      </span>
                    </div>
                    <AccessionScoreBar score={activeProcess.score} />
                    {activeProcess.stage === 'map' && activeProcess.score < 80 && (
                      <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                        Score 80 required to extend invitation
                      </p>
                    )}
                  </div>

                  {/* Adversary warning */}
                  {activeProcess.adversaryReactionTriggered && (
                    <p className="text-xs" style={{ color: '#f87171' }}>
                      ⚠ Adversary reaction triggered — expect increased regional tension
                    </p>
                  )}

                  {/* Advance button */}
                  {(() => {
                    const label   = NEXT_STAGE_LABEL[activeProcess.stage]
                    if (!label) return null
                    const scoreGate  = activeProcess.stage === 'map' && activeProcess.score < 80
                    const isFinalise = activeProcess.stage === 'acceding'
                    const noVotes    = isFinalise && Object.values(activeProcess.memberVotes).some((v) => v === 'no')
                    const disabled   = pc < PC_COST_ADVANCE_ACCESSION || scoreGate || noVotes
                    const btnTitle   =
                      noVotes    ? 'Blocked by member veto — resolve dissenting votes first' :
                      scoreGate  ? `Score 80 required (current: ${activeProcess.score})` :
                      pc < PC_COST_ADVANCE_ACCESSION ? `Insufficient political capital — need ${PC_COST_ADVANCE_ACCESSION} PC` :
                      `${label} — costs ${PC_COST_ADVANCE_ACCESSION} PC`
                    return (
                      <button
                        onClick={() => isFinalise
                          ? finaliseAccession(selectedCountry!)
                          : advanceAccession(selectedCountry!)
                        }
                        disabled={disabled}
                        title={btnTitle}
                        className="w-full rounded py-2 text-xs font-semibold"
                        style={{
                          background: disabled ? '#1e3a5f' : '#2563eb',
                          color:      disabled ? '#4b5563' : '#fff',
                          cursor:     disabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })()}
                </div>
              ) : (
                /* No active process — readiness preview */
                <div className="space-y-3">
                  {(() => {
                    const score   = computeAccessionScore(country, stateSnap)
                    const factors = computeAccessionBreakdown(country, stateSnap)
                      .filter((f) => f.delta !== 0)
                      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                      .slice(0, 3)
                    return (
                      <>
                        <div>
                          <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6b7280' }}>
                            <span>Accession Readiness</span>
                            <span style={{ color: score >= 80 ? '#4ade80' : '#e8edf2' }}>{score} / 100</span>
                          </div>
                          <AccessionScoreBar score={score} />
                        </div>

                        <div className="space-y-1">
                          {factors.map((f) => (
                            <div key={f.label} className="flex justify-between text-xs">
                              <span style={{ color: '#9ca3af' }}>{f.label}</span>
                              <span style={{ color: f.delta > 0 ? '#4ade80' : '#f87171' }}>
                                {f.delta > 0 ? `+${f.delta}` : f.delta}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  })()}

                  <button
                    onClick={() => selectedCountry && initiateDialogue(selectedCountry)}
                    disabled={pc < PC_COST_DIALOGUE}
                    title={pc < PC_COST_DIALOGUE ? `Insufficient political capital — need ${PC_COST_DIALOGUE} PC` : `Begin Dialogue — costs ${PC_COST_DIALOGUE} PC`}
                    className="w-full rounded py-2 text-xs font-semibold"
                    style={{
                      background: pc < PC_COST_DIALOGUE ? '#1e3a5f' : '#1d4ed8',
                      color:      pc < PC_COST_DIALOGUE ? '#4b5563' : '#fff',
                      cursor:     pc < PC_COST_DIALOGUE ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Begin Dialogue
                  </button>
                  {pc < PC_COST_DIALOGUE && (
                    <p className="text-xs text-center" style={{ color: '#f87171' }}>
                      Insufficient political capital (need {PC_COST_DIALOGUE})
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* NATO-only sections */}
          {country.alignment === 'nato' && (
            <>
              {/* Diplomatic Actions */}
              <div className="rounded-lg p-4 mb-4" style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}>
                <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                  Diplomatic Actions
                </p>
                {isEngaged ? (
                  <div className="flex items-center gap-2">
                    <span style={{ color: '#4ade80', fontSize: 13 }}>●</span>
                    <span className="text-sm font-medium" style={{ color: '#4ade80' }}>
                      Currently Engaged — {turnsLeft} turn{turnsLeft !== 1 ? 's' : ''} remaining
                    </span>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => selectedCountry && engageMember(selectedCountry)}
                      disabled={pc < PC_COST_ENGAGE}
                      title={pc < PC_COST_ENGAGE ? `Insufficient political capital — need ${PC_COST_ENGAGE} PC` : `Engage Country — costs ${PC_COST_ENGAGE} PC, lasts 3 turns`}
                      className="w-full rounded-lg py-2 text-sm font-semibold transition-colors"
                      style={{
                        background: pc < PC_COST_ENGAGE ? '#1e3a5f' : '#1d4ed8',
                        color:      pc < PC_COST_ENGAGE ? '#4b5563' : '#fff',
                        cursor:     pc < PC_COST_ENGAGE ? 'not-allowed' : 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (pc >= PC_COST_ENGAGE) (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'
                      }}
                      onMouseLeave={(e) => {
                        if (pc >= PC_COST_ENGAGE) (e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8'
                      }}
                    >
                      Engage Country
                    </button>
                    <p className="text-xs mt-1.5 text-center" style={{ color: pc < PC_COST_ENGAGE ? '#f87171' : '#4b5563' }}>
                      {pc < PC_COST_ENGAGE ? 'Insufficient political capital' : `Costs ${PC_COST_ENGAGE} PC · Lasts 3 turns`}
                    </p>
                  </div>
                )}
              </div>

              {/* Alliance Vote Tendency */}
              {activeProcessList.length > 0 && (
                <div className="rounded-lg p-4 mb-4" style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}>
                  <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                    Alliance Vote Tendency
                  </p>
                  <div className="space-y-2">
                    {activeProcessList.map((proc) => {
                      const candidate = countries[proc.countryId]
                      if (!candidate || !selectedCountry) return null
                      const tendency  = computeMemberTendency(selectedCountry, proc.countryId, stateSnap)
                      const { symbol, color } = VOTE_STYLE[tendency]
                      return (
                        <div key={proc.countryId} className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: '#9ca3af' }}>
                            {candidate.name}
                          </span>
                          <span className="text-xs font-semibold" style={{ color }}>
                            {symbol} {tendency.charAt(0).toUpperCase() + tendency.slice(1)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs mt-2.5" style={{ color: '#374151' }}>
                    Engage this member to shift a leaning vote toward yes.
                  </p>
                </div>
              )}

              {/* Crisis History */}
              {countryResolvedCrises.length > 0 && (
                <div className="rounded-lg p-4 mb-4" style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}>
                  <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                    Crisis History
                  </p>
                  <div className="space-y-2">
                    {[...countryResolvedCrises].reverse().slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <span
                          className="flex-shrink-0 mt-0.5"
                          style={{ fontSize: 7, color: SEV_DOT_COLOR[c.severity] ?? '#6b7280', lineHeight: 1.8 }}
                        >
                          ●
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: '#e8edf2' }}>{c.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              style={{
                                fontSize: 10,
                                color: c.status === 'escalated' ? '#f87171' : '#4ade80',
                              }}
                            >
                              {c.status === 'escalated' ? 'Escalated' : 'Resolved'}
                            </span>
                            <span style={{ color: '#374151', fontSize: 10 }}>·</span>
                            <span style={{ color: '#374151', fontSize: 10 }}>
                              Turn {c.resolvedAtTurn ?? '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Impact */}
              <div className="rounded-lg p-4" style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}>
                <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                  Budget Impact This Turn
                </p>
                {(() => {
                  const readinessDelta    = computeReadinessDelta(country, allocation)
                  const satisfactionDelta = computeSatisfactionDelta(country, allocation, isEngaged, turn)
                  const threatDelta       = computeThreatDelta(country, allocation)
                  const rows = [
                    {
                      label: 'Readiness',
                      delta: readinessDelta,
                      suffix: allocation.troopReadiness < 20
                        ? ' (starved — allocation below 20)'
                        : ' from Troop Readiness',
                    },
                    {
                      label: 'Satisfaction',
                      delta: satisfactionDelta,
                      suffix: isEngaged ? ' from Communications (engaged)' : ' from Communications',
                    },
                    {
                      label: 'Threat',
                      delta: threatDelta,
                      suffix: ' from Cyber Defence',
                    },
                  ]
                  return (
                    <div className="space-y-2.5">
                      {rows.map(({ label, delta, suffix }) => (
                        <div key={label} className="flex items-start justify-between gap-2">
                          <span className="text-xs" style={{ color: '#9ca3af', flexShrink: 0 }}>
                            {label}
                          </span>
                          <span className="text-xs text-right" style={{ color: deltaColor(delta) }}>
                            {deltaLabel(delta)}{suffix}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
