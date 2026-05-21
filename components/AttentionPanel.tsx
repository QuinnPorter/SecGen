'use client'

import { useMemo } from 'react'
import { useGameStore, type Country } from '@/lib/gameState'
import { PC_COST_ENGAGE } from '@/lib/constants'

// ── Flag emoji (mirrors IntelBrief) ──────────────────────────────────────────

const A3_TO_A2: Record<string, string> = {
  USA: 'US', CAN: 'CA', GBR: 'GB', FRA: 'FR', DEU: 'DE', ITA: 'IT', ESP: 'ES',
  POL: 'PL', NOR: 'NO', DNK: 'DK', NLD: 'NL', BEL: 'BE', LUX: 'LU', PRT: 'PT',
  GRC: 'GR', TUR: 'TR', ISL: 'IS', HUN: 'HU', CZE: 'CZ', SVK: 'SK', SVN: 'SI',
  EST: 'EE', LVA: 'LV', LTU: 'LT', ROU: 'RO', BGR: 'BG', HRV: 'HR', ALB: 'AL',
  MNE: 'ME', MKD: 'MK', FIN: 'FI', SWE: 'SE',
}

function flagEmoji(id: string): string {
  const a2 = A3_TO_A2[id]
  if (!a2) return '🌐'
  const base = 0x1F1E6 - 0x41
  return String.fromCodePoint(base + a2.charCodeAt(0)) +
         String.fromCodePoint(base + a2.charCodeAt(1))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function issueCount(c: Country): number {
  let n = 0
  if (c.allianceSatisfaction < 50) n++
  if (c.gdpDefencePercent    < 2.0) n++
  if (c.fiscalPressure       > 65)  n++
  return n
}

function urgencyScore(c: Country): number {
  return (
    (100 - c.allianceSatisfaction) +
    c.fiscalPressure +
    (2.0 - c.gdpDefencePercent) * 20
  )
}

// ── Mini bar ─────────────────────────────────────────────────────────────────

function MiniBar({
  value,
  max = 100,
  color,
  title,
}: {
  value: number
  max?: number
  color: string
  title?: string
}) {
  return (
    <div
      className="rounded-full"
      style={{ background: '#0d1f2d', height: 4, width: '100%', overflow: 'hidden' }}
      title={title}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${clamp((value / max) * 100, 0, 100)}%`, background: color }}
      />
    </div>
  )
}

// ── Member card ───────────────────────────────────────────────────────────────

function MemberCard({
  country,
  hasActiveCrisis,
  pc,
  isEngaged,
  onEngage,
  onView,
}: {
  country: Country
  hasActiveCrisis: boolean
  pc: number
  isEngaged: boolean
  onEngage: () => void
  onView: () => void
}) {
  const issues   = issueCount(country)
  const dotColor = issues >= 2 ? '#ef4444' : '#f59e0b'
  const canEngage = pc >= PC_COST_ENGAGE && !isEngaged

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: '#0a1929', border: '1px solid #1e3a5f' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span style={{ fontSize: 18, lineHeight: 1 }}>{flagEmoji(country.id)}</span>
          <span className="font-semibold text-sm truncate" style={{ color: '#e8edf2' }}>
            {country.name}
          </span>
          {hasActiveCrisis && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b', fontSize: 10 }}
            >
              CRISIS
            </span>
          )}
        </div>
        <span
          title={`${issues} issue${issues !== 1 ? 's' : ''}`}
          style={{ fontSize: 8, color: dotColor, flexShrink: 0 }}
        >
          ●
        </span>
      </div>

      {/* Issue tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {country.gdpDefencePercent < 2.0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d' }}
          >
            ⚠ Below 2% GDP
          </span>
        )}
        {country.allianceSatisfaction < 50 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: '#451a03', color: '#fcd34d', border: '1px solid #92400e' }}
          >
            ⚠ Low satisfaction ({Math.round(country.allianceSatisfaction)})
          </span>
        )}
        {country.fiscalPressure > 65 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: '#451a03', color: '#fcd34d', border: '1px solid #92400e' }}
          >
            ⚠ High fiscal pressure ({Math.round(country.fiscalPressure)})
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        {/* Alliance satisfaction */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: '#4b5563' }}>Satisfaction</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: '#6b7280' }}>
              {Math.round(country.allianceSatisfaction)}
            </span>
          </div>
          <MiniBar
            value={country.allianceSatisfaction}
            color={
              country.allianceSatisfaction >= 70 ? '#4ade80'
              : country.allianceSatisfaction >= 40 ? '#f59e0b'
              : '#f87171'
            }
            title={`Alliance satisfaction: ${Math.round(country.allianceSatisfaction)} / 100`}
          />
        </div>

        {/* GDP defence % */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#4b5563' }}>GDP defence</span>
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: country.gdpDefencePercent >= 2.0 ? '#4ade80' : '#f87171' }}
          >
            {country.gdpDefencePercent.toFixed(1)}%{' '}
            <span style={{ color: '#374151', fontWeight: 400 }}>/ 2.0%</span>
          </span>
        </div>

        {/* Fiscal pressure */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: '#4b5563' }}>Fiscal pressure</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: '#6b7280' }}>
              {Math.round(country.fiscalPressure)}
            </span>
          </div>
          <MiniBar
            value={country.fiscalPressure}
            color={
              country.fiscalPressure > 65 ? '#f87171'
              : country.fiscalPressure > 40 ? '#f59e0b'
              : '#4b5563'
            }
            title={`Fiscal pressure: ${Math.round(country.fiscalPressure)} / 100`}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onEngage}
          disabled={!canEngage}
          title={
            isEngaged ? 'Already engaged this turn' :
            pc < PC_COST_ENGAGE ? 'Insufficient political capital' :
            `Engage — costs ${PC_COST_ENGAGE} PC, lasts 3 turns`
          }
          className="flex-1 rounded py-1.5 text-xs font-semibold transition-colors"
          style={{
            background: canEngage ? '#1e3a5f' : '#0a1929',
            color:      canEngage ? '#93c5fd' : '#374151',
            border:     `1px solid ${canEngage ? '#2563eb' : '#1a2f47'}`,
            cursor:     canEngage ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => {
            if (canEngage) (e.currentTarget as HTMLButtonElement).style.background = '#1e3a8a'
          }}
          onMouseLeave={(e) => {
            if (canEngage) (e.currentTarget as HTMLButtonElement).style.background = '#1e3a5f'
          }}
        >
          {isEngaged ? 'Engaged ✓' : `Engage — ${PC_COST_ENGAGE} PC`}
        </button>
        <button
          onClick={onView}
          className="flex-1 rounded py-1.5 text-xs font-medium transition-colors"
          style={{ background: '#0d1f2d', color: '#6b7280', border: '1px solid #1e3a5f', cursor: 'pointer' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#6b7280'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#1e3a5f'
          }}
        >
          View Country
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  isOpen:        boolean
  onClose:       () => void
  onOpenBudget:  () => void
}

export default function AttentionPanel({ isOpen, onClose, onOpenBudget }: Props) {
  const countries       = useGameStore((s) => s.countries)
  const crises          = useGameStore((s) => s.crises)
  const pc              = useGameStore((s) => s.budgetState.totalPoliticalCapital)
  const engagements     = useGameStore((s) => s.budgetState.memberEngagements)
  const engageMember    = useGameStore((s) => s.engageMember)
  const selectCountry   = useGameStore((s) => s.selectCountry)

  const natoMembers = useMemo(
    () => Object.values(countries).filter((c) => c.alignment === 'nato'),
    [countries],
  )

  const attentionList = useMemo(() => {
    const filtered = natoMembers.filter(
      (c) =>
        c.allianceSatisfaction < 50 ||
        c.gdpDefencePercent    < 2.0 ||
        c.fiscalPressure       > 65,
    )

    return filtered.sort((a, b) => {
      // 1. Countries with active/pending crises first
      const aHasCrisis = crises.some(
        (c) =>
          c.affectedCountryId === a.id &&
          (c.status === 'active' || c.status === 'pending'),
      )
      const bHasCrisis = crises.some(
        (c) =>
          c.affectedCountryId === b.id &&
          (c.status === 'active' || c.status === 'pending'),
      )
      if (aHasCrisis !== bHasCrisis) return aHasCrisis ? -1 : 1

      // 2. Combined urgency score (descending)
      const scoreDiff = urgencyScore(b) - urgencyScore(a)
      if (Math.abs(scoreDiff) > 0.01) return scoreDiff

      // 3. Alphabetical
      return a.name.localeCompare(b.name)
    })
  }, [natoMembers, crises])

  // Footer stats
  const avgSatisfaction = useMemo(() => {
    if (natoMembers.length === 0) return 0
    return Math.round(
      natoMembers.reduce((sum, c) => sum + c.allianceSatisfaction, 0) / natoMembers.length,
    )
  }, [natoMembers])

  const at2Pct = natoMembers.filter((c) => c.gdpDefencePercent >= 2.0).length

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)' }}
    >
      <div
        className="flex flex-col rounded-xl"
        style={{
          width:     640,
          maxHeight: '84vh',
          background: '#0d1f2d',
          border:    '1px solid #1e3a5f',
          boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
          overflow:  'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex-shrink-0 px-6 py-5"
          style={{ borderBottom: '1px solid #1e3a5f', background: '#060f1a' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                className="font-bold leading-tight"
                style={{ fontSize: 17, color: '#e8edf2' }}
              >
                {attentionList.length} Member{attentionList.length !== 1 ? 's' : ''} Requiring Attention
              </h2>
              <p className="text-xs mt-1" style={{ color: '#4b5563' }}>
                Sorted by urgency
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 rounded p-1.5 transition-colors"
              style={{ background: 'transparent', color: '#4b5563', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#9ca3af')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Scrollable member list ── */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          style={{ background: '#0a1522' }}
        >
          {attentionList.length === 0 ? (
            <div className="text-center py-12 space-y-1">
              <p className="text-sm" style={{ color: '#6b7280' }}>
                All members are meeting commitments.
              </p>
              <p className="text-xs" style={{ color: '#374151' }}>
                The alliance is in good standing.
              </p>
            </div>
          ) : (
            attentionList.map((country) => {
              const hasCrisis = crises.some(
                (c) =>
                  c.affectedCountryId === country.id &&
                  (c.status === 'active' || c.status === 'pending'),
              )
              const isEngaged = (engagements[country.id] ?? 0) > 0

              return (
                <MemberCard
                  key={country.id}
                  country={country}
                  hasActiveCrisis={hasCrisis}
                  pc={pc}
                  isEngaged={isEngaged}
                  onEngage={() => engageMember(country.id)}
                  onView={() => {
                    selectCountry(country.id)
                    onClose()
                  }}
                />
              )
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex-shrink-0 px-6 py-4"
          style={{ borderTop: '1px solid #1e3a5f', background: '#060f1a' }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs" style={{ color: '#4b5563' }}>
                Average alliance satisfaction:{' '}
                <span
                  style={{
                    color:
                      avgSatisfaction >= 60 ? '#4ade80'
                      : avgSatisfaction >= 40 ? '#f59e0b'
                      : '#f87171',
                    fontWeight: 600,
                  }}
                >
                  {avgSatisfaction}
                </span>
              </p>
              <p className="text-xs" style={{ color: '#4b5563' }}>
                Members at 2% GDP target:{' '}
                <span style={{ color: '#93c5fd', fontWeight: 600 }}>
                  {at2Pct} / {natoMembers.length}
                </span>
              </p>
            </div>
            <button
              onClick={() => { onClose(); onOpenBudget() }}
              className="text-xs font-medium px-4 py-2 rounded transition-colors flex-shrink-0"
              style={{ background: '#0d1f2d', color: '#93c5fd', border: '1px solid #1e3a5f', cursor: 'pointer' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#152840')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#0d1f2d')}
            >
              Open Budget Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
