'use client'

import { useGameStore, Country, type AccessionStage, type GameState } from '@/lib/gameState'
import { computeReadinessDelta, computeSatisfactionDelta, computeThreatDelta } from '@/lib/budgetHelpers'
import { computeAccessionScore, computeAccessionBreakdown } from '@/lib/accessionHelpers'
import { computeMemberTendency } from '@/lib/voteSimulator'
import { PC_COST_ENGAGE, PC_COST_DIALOGUE, PC_COST_ADVANCE_ACCESSION } from '@/lib/constants'
import { traitsFor, TRAIT_DISPLAY } from '@/lib/countryTraits'
import { AlertTriangle, Circle, Check, Minus, X } from 'lucide-react'

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
  nato:      { label: 'NATO Member',  bg: '#004990', color: '#fff' },
  adversary: { label: 'Adversary',    bg: '#b91c1c', color: '#fff' },
  candidate: { label: 'Candidate',    bg: '#e0eaf5', color: '#004990' },
  neutral:   { label: 'Neutral',      bg: '#f5f3ef', color: '#57534e' },
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
      <div className="flex justify-between text-xs mb-1" style={{ color: '#78716c' }}>
        <span>{label}</span>
        <span className="tabular-nums font-semibold" style={{ color: '#1c1917' }}>{value}</span>
      </div>
      <div
        className="h-1.5 rounded-full"
        style={{ background: '#e7e5e0' }}
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
  const barColor = pct >= 2 ? '#15803d' : '#dc2626'
  const textColor = pct >= 2 ? '#15803d' : '#b91c1c'
  const barWidth = Math.min(100, (pct / 5) * 100) // scale: 5% = full bar

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: '#78716c' }}>
        <span>Defence spending</span>
        <span className="tabular-nums font-semibold" style={{ color: textColor }}>
          {pct > 0 ? `${pct.toFixed(1)}% GDP` : 'N/A'}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#e7e5e0' }} title={`Defence spending: ${pct > 0 ? pct.toFixed(1) : 'N/A'}% GDP (target: 2.0%)`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%`, background: barColor }}
        />
      </div>
      <div className="flex justify-between text-xs mt-0.5 tabular-nums" style={{ color: '#a8a29e' }}>
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
  none:       '#78716c',
  dialogue:   '#57534e',
  map:        '#b45309',
  invitation: '#004990',
  acceding:   '#15803d',
}
const NEXT_STAGE_LABEL: Partial<Record<AccessionStage, string>> = {
  dialogue:   'Advance to MAP Stage',
  map:        'Extend Invitation',
  invitation: 'Call Member Vote',
  acceding:   'Finalise Accession',
}

function VoteGlyph({ tendency }: { tendency: string }) {
  if (tendency === 'yes')     return <Check  size={12} strokeWidth={2.5} color="#15803d" />
  if (tendency === 'abstain') return <Minus  size={12} strokeWidth={2.5} color="#78716c" />
  return                             <X      size={12} strokeWidth={2.5} color="#b91c1c" />
}

const VOTE_COLOR: Record<string, string> = {
  yes:     '#15803d',
  abstain: '#78716c',
  no:      '#b91c1c',
}

function AccessionScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#15803d' : score >= 50 ? '#b45309' : '#004990'
  return (
    <div className="h-1.5 w-full rounded-full" style={{ background: '#e7e5e0' }}>
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
  if (value > 0) return '#15803d'
  if (value < 0) return '#b91c1c'
  return '#78716c'
}

const SEV_DOT_COLOR: Record<string, string> = {
  low:      '#78716c',
  medium:   '#b45309',
  high:     '#b91c1c',
  critical: '#dc2626',
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
        background: '#fafaf9',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 280ms ease-in-out',
        borderLeft: '1px solid #e7e5e0',
        boxShadow: isOpen ? '-8px 0 24px rgba(15, 23, 42, 0.06)' : 'none',
      }}
    >
      {country && badge && (
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h2
                className="font-serif font-semibold leading-tight tracking-tight"
                style={{ fontSize: 26, color: '#1c1917', letterSpacing: '-0.01em' }}
              >
                {country.name}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#78716c' }}>
                {country.region}
              </p>
            </div>
            <button
              onClick={() => selectCountry(null)}
              className="flex-shrink-0 rounded-full flex items-center justify-center transition-colors"
              style={{
                width: 28,
                height: 28,
                background: 'transparent',
                color: '#78716c',
                border: '1px solid #e7e5e0',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#f5f3ef'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#1c1917'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#78716c'
              }}
              aria-label="Close panel"
            >
              <X size={14} strokeWidth={2} />
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
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #b45309' }}
              >
                <AlertTriangle size={11} strokeWidth={2.5} />
                Fragile Member
              </span>
            )}
            {country.alignment === 'nato' && NATO_ACCESSION_YEAR[country.id] && (
              <span className="text-xs tabular-nums" style={{ color: '#78716c' }}>
                Member since {NATO_ACCESSION_YEAR[country.id]}
              </span>
            )}
          </div>

          {/* Trait chips */}
          {traitsFor(country.id).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {traitsFor(country.id).map((t) => {
                const meta = TRAIT_DISPLAY[t]
                return (
                  <span
                    key={t}
                    title={meta.description}
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{
                      background: '#f5f3ef',
                      color: meta.color,
                      border: `1px solid ${meta.color}55`,
                    }}
                  >
                    {meta.label}
                  </span>
                )
              })}
            </div>
          )}

          {/* Stats */}
          <div
            className="rounded-lg p-5 mb-5"
            style={{
              background: '#f5f3ef',
              border: '1px solid #e7e5e0',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
          >
            <GdpBar country={country} />

            {country.alignment === 'nato' && (
              <StatBar
                label="Alliance satisfaction"
                value={country.allianceSatisfaction}
                barColor="#004990"
              />
            )}

            <StatBar
              label="Threat level"
              value={country.threatLevel}
              barColor={country.threatLevel >= 60 ? '#dc2626' : '#b45309'}
            />

            <StatBar
              label="Fiscal pressure"
              value={country.fiscalPressure}
              barColor={country.fiscalPressure >= 60 ? '#b45309' : '#78716c'}
            />
          </div>

          {/* Flavour text */}
          <p className="text-sm leading-relaxed mb-5" style={{ color: '#57534e' }}>
            {country.notes}
          </p>

          {/* Expansion section — candidates and neutrals */}
          {isExpansionTarget && (
            <div
              className="rounded-lg p-5 mb-4"
              style={{
                background: '#f5f3ef',
                border: '1px solid #e7e5e0',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#78716c' }}>
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
                        background: '#f0ede7',
                        color: STAGE_COLOR[activeProcess.stage],
                      }}
                    >
                      {STAGE_LABEL[activeProcess.stage]}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: '#a8a29e' }}>
                      {activeProcess.turnsInStage} turn{activeProcess.turnsInStage !== 1 ? 's' : ''} in stage
                    </span>
                  </div>

                  {/* Score bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5" style={{ color: '#78716c' }}>
                      <span>Accession score</span>
                      <span className="tabular-nums font-semibold" style={{ color: activeProcess.score >= 80 ? '#15803d' : '#1c1917' }}>
                        {activeProcess.score} / 100
                      </span>
                    </div>
                    <AccessionScoreBar score={activeProcess.score} />
                    {activeProcess.stage === 'map' && activeProcess.score < 80 && (
                      <p className="text-xs mt-1" style={{ color: '#b91c1c' }}>
                        Score 80 required to extend invitation
                      </p>
                    )}
                  </div>

                  {/* Adversary warning */}
                  {activeProcess.adversaryReactionTriggered && (
                    <p className="flex items-center gap-1.5 text-xs" style={{ color: '#b91c1c' }}>
                      <AlertTriangle size={12} strokeWidth={2} />
                      Adversary reaction triggered — expect increased regional tension
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
                          background: disabled ? '#f0ede7' : '#004990',
                          color:      disabled ? '#a8a29e' : '#fff',
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
                          <div className="flex justify-between text-xs mb-1.5" style={{ color: '#78716c' }}>
                            <span>Accession Readiness</span>
                            <span className="tabular-nums font-semibold" style={{ color: score >= 80 ? '#15803d' : '#1c1917' }}>{score} / 100</span>
                          </div>
                          <AccessionScoreBar score={score} />
                        </div>

                        <div className="space-y-1">
                          {factors.map((f) => (
                            <div key={f.label} className="flex justify-between text-xs">
                              <span style={{ color: '#57534e' }}>{f.label}</span>
                              <span className="tabular-nums font-semibold" style={{ color: f.delta > 0 ? '#15803d' : '#b91c1c' }}>
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
                      background: pc < PC_COST_DIALOGUE ? '#f0ede7' : '#004990',
                      color:      pc < PC_COST_DIALOGUE ? '#a8a29e' : '#fff',
                      cursor:     pc < PC_COST_DIALOGUE ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Begin Dialogue
                  </button>
                  {pc < PC_COST_DIALOGUE && (
                    <p className="text-xs text-center" style={{ color: '#b91c1c' }}>
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
              <div
                className="rounded-lg p-5 mb-4"
                style={{
                  background: '#f5f3ef',
                  border: '1px solid #e7e5e0',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                }}
              >
                <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#78716c' }}>
                  Diplomatic Actions
                </p>
                {isEngaged ? (
                  <div className="flex items-center gap-2">
                    <Circle size={9} fill="#15803d" strokeWidth={0} />
                    <span className="text-sm font-medium tabular-nums" style={{ color: '#15803d' }}>
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
                        background: pc < PC_COST_ENGAGE ? '#f0ede7' : '#004990',
                        color:      pc < PC_COST_ENGAGE ? '#a8a29e' : '#fff',
                        cursor:     pc < PC_COST_ENGAGE ? 'not-allowed' : 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (pc >= PC_COST_ENGAGE) (e.currentTarget as HTMLButtonElement).style.background = '#003a78'
                      }}
                      onMouseLeave={(e) => {
                        if (pc >= PC_COST_ENGAGE) (e.currentTarget as HTMLButtonElement).style.background = '#004990'
                      }}
                    >
                      Engage Country
                    </button>
                    <p className="text-xs mt-1.5 text-center tabular-nums" style={{ color: pc < PC_COST_ENGAGE ? '#b91c1c' : '#a8a29e' }}>
                      {pc < PC_COST_ENGAGE ? 'Insufficient political capital' : `Costs ${PC_COST_ENGAGE} PC · Lasts 3 turns`}
                    </p>
                  </div>
                )}
              </div>

              {/* Alliance Vote Tendency */}
              {activeProcessList.length > 0 && (
                <div
                  className="rounded-lg p-5 mb-4"
                  style={{
                    background: '#f5f3ef',
                    border: '1px solid #e7e5e0',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#78716c' }}>
                    Alliance Vote Tendency
                  </p>
                  <div className="space-y-2">
                    {activeProcessList.map((proc) => {
                      const candidate = countries[proc.countryId]
                      if (!candidate || !selectedCountry) return null
                      const tendency  = computeMemberTendency(selectedCountry, proc.countryId, stateSnap)
                      return (
                        <div key={proc.countryId} className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: '#57534e' }}>
                            {candidate.name}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: VOTE_COLOR[tendency] }}>
                            <VoteGlyph tendency={tendency} />
                            {tendency.charAt(0).toUpperCase() + tendency.slice(1)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs mt-2.5" style={{ color: '#a8a29e' }}>
                    Engage this member to shift a leaning vote toward yes.
                  </p>
                </div>
              )}

              {/* Crisis History */}
              {countryResolvedCrises.length > 0 && (
                <div
                  className="rounded-lg p-5 mb-4"
                  style={{
                    background: '#f5f3ef',
                    border: '1px solid #e7e5e0',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#78716c' }}>
                    Crisis History
                  </p>
                  <div className="space-y-2">
                    {[...countryResolvedCrises].reverse().slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <Circle
                          size={7}
                          fill={SEV_DOT_COLOR[c.severity] ?? '#78716c'}
                          strokeWidth={0}
                          style={{ marginTop: 5, flexShrink: 0 }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: '#1c1917' }}>{c.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              style={{
                                fontSize: 10,
                                color: c.status === 'escalated' ? '#dc2626' : '#15803d',
                              }}
                            >
                              {c.status === 'escalated' ? 'Escalated' : 'Resolved'}
                            </span>
                            <span style={{ color: '#a8a29e', fontSize: 10 }}>·</span>
                            <span className="tabular-nums" style={{ color: '#a8a29e', fontSize: 10 }}>
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
              <div
                className="rounded-lg p-5"
                style={{
                  background: '#f5f3ef',
                  border: '1px solid #e7e5e0',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                }}
              >
                <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#78716c' }}>
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
                          <span className="text-xs" style={{ color: '#57534e', flexShrink: 0 }}>
                            {label}
                          </span>
                          <span className="text-xs text-right tabular-nums" style={{ color: deltaColor(delta) }}>
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
