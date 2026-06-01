'use client'

import { useMemo } from 'react'
import { useGameStore, type Country } from '@/lib/gameState'
import { PC_COST_ENGAGE } from '@/lib/constants'
import { X, AlertTriangle, Check, Circle } from 'lucide-react'

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
      style={{ background: '#e7e5e0', height: 4, width: '100%', overflow: 'hidden' }}
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
  const dotColor = issues >= 2 ? '#dc2626' : '#b45309'
  const canEngage = pc >= PC_COST_ENGAGE && !isEngaged

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: '#fafaf9',
        border: '1px solid #e7e5e0',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span style={{ fontSize: 18, lineHeight: 1 }}>{flagEmoji(country.id)}</span>
          <span className="font-serif font-semibold truncate" style={{ color: '#1c1917', fontSize: 16 }}>
            {country.name}
          </span>
          {hasActiveCrisis && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #dc2626', fontSize: 10 }}
            >
              CRISIS
            </span>
          )}
        </div>
        <Circle
          size={9}
          fill={dotColor}
          strokeWidth={0}
          aria-label={`${issues} issue${issues !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Issue tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {country.gdpDefencePercent < 2.0 && (
          <span
            className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded tabular-nums"
            style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }}
          >
            <AlertTriangle size={10} strokeWidth={2.25} /> Below 2% GDP
          </span>
        )}
        {country.allianceSatisfaction < 50 && (
          <span
            className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded tabular-nums"
            style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
          >
            <AlertTriangle size={10} strokeWidth={2.25} /> Low satisfaction ({Math.round(country.allianceSatisfaction)})
          </span>
        )}
        {country.fiscalPressure > 65 && (
          <span
            className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded tabular-nums"
            style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
          >
            <AlertTriangle size={10} strokeWidth={2.25} /> High fiscal pressure ({Math.round(country.fiscalPressure)})
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        {/* Alliance satisfaction */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: '#78716c' }}>Satisfaction</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: '#1c1917' }}>
              {Math.round(country.allianceSatisfaction)}
            </span>
          </div>
          <MiniBar
            value={country.allianceSatisfaction}
            color={
              country.allianceSatisfaction >= 70 ? '#15803d'
              : country.allianceSatisfaction >= 40 ? '#b45309'
              : '#dc2626'
            }
            title={`Alliance satisfaction: ${Math.round(country.allianceSatisfaction)} / 100`}
          />
        </div>

        {/* GDP defence % */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#78716c' }}>GDP defence</span>
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: country.gdpDefencePercent >= 2.0 ? '#15803d' : '#dc2626' }}
          >
            {country.gdpDefencePercent.toFixed(1)}%{' '}
            <span style={{ color: '#a8a29e', fontWeight: 400 }}>/ 2.0%</span>
          </span>
        </div>

        {/* Fiscal pressure */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: '#78716c' }}>Fiscal pressure</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: '#1c1917' }}>
              {Math.round(country.fiscalPressure)}
            </span>
          </div>
          <MiniBar
            value={country.fiscalPressure}
            color={
              country.fiscalPressure > 65 ? '#dc2626'
              : country.fiscalPressure > 40 ? '#b45309'
              : '#78716c'
            }
            title={`Fiscal pressure: ${Math.round(country.fiscalPressure)} / 100`}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onEngage}
          disabled={isEngaged}
          title={
            isEngaged ? 'Already engaged this turn' :
            pc < PC_COST_ENGAGE ? 'Insufficient political capital' :
            `Engage — costs ${PC_COST_ENGAGE} PC, lasts 3 turns`
          }
          className="flex-1 rounded py-1.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 tabular-nums"
          style={{
            background: canEngage ? '#004990' : '#f0ede7',
            color:      canEngage ? '#fff' : '#a8a29e',
            border:     'none',
            cursor:     canEngage ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => {
            if (canEngage) (e.currentTarget as HTMLButtonElement).style.background = '#003a78'
          }}
          onMouseLeave={(e) => {
            if (canEngage) (e.currentTarget as HTMLButtonElement).style.background = '#004990'
          }}
        >
          {isEngaged ? (
            <>
              Engaged <Check size={12} strokeWidth={2.5} />
            </>
          ) : (
            `Engage — ${PC_COST_ENGAGE} PC`
          )}
        </button>
        <button
          onClick={onView}
          className="flex-1 rounded py-1.5 text-xs font-medium transition-colors"
          style={{ background: '#fafaf9', color: '#57534e', border: '1px solid #e7e5e0', cursor: 'pointer' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#004990'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#004990'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#57534e'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
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
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <div
        className="flex flex-col rounded-xl"
        style={{
          width:     640,
          maxHeight: '84vh',
          background: '#fafaf9',
          border:    '1px solid #e7e5e0',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)',
          overflow:  'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex-shrink-0 px-6 py-5"
          style={{ borderBottom: '1px solid #e7e5e0', background: '#f5f3ef' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-xs font-black uppercase tracking-widest mb-1"
                style={{ color: '#a8a29e', letterSpacing: '0.2em' }}
              >
                Watchlist
              </p>
              <h2
                className="font-serif font-semibold tracking-tight tabular-nums"
                style={{ fontSize: 20, color: '#1c1917', letterSpacing: '-0.01em' }}
              >
                {attentionList.length} Member{attentionList.length !== 1 ? 's' : ''} Requiring Attention
              </h2>
              <p className="text-xs mt-1" style={{ color: '#78716c' }}>
                Sorted by urgency
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 rounded-full flex items-center justify-center transition-colors"
              style={{ width: 28, height: 28, background: 'transparent', color: '#78716c', border: '1px solid #e7e5e0', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#fafaf9'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#1c1917'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#78716c'
              }}
              aria-label="Close"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Scrollable member list ── */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5 space-y-3"
          style={{ background: '#f0ede7' }}
        >
          {attentionList.length === 0 ? (
            <div className="text-center py-12 space-y-1">
              <p className="text-sm" style={{ color: '#78716c' }}>
                All members are meeting commitments.
              </p>
              <p className="text-xs" style={{ color: '#a8a29e' }}>
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
          style={{ borderTop: '1px solid #e7e5e0', background: '#f5f3ef' }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs tabular-nums" style={{ color: '#78716c' }}>
                Average alliance satisfaction:{' '}
                <span
                  style={{
                    color:
                      avgSatisfaction >= 60 ? '#15803d'
                      : avgSatisfaction >= 40 ? '#b45309'
                      : '#dc2626',
                    fontWeight: 600,
                  }}
                >
                  {avgSatisfaction}
                </span>
              </p>
              <p className="text-xs tabular-nums" style={{ color: '#78716c' }}>
                Members at 2% GDP target:{' '}
                <span style={{ color: '#004990', fontWeight: 600 }}>
                  {at2Pct} / {natoMembers.length}
                </span>
              </p>
            </div>
            <button
              onClick={() => { onClose(); onOpenBudget() }}
              className="text-xs font-medium px-4 py-2 rounded transition-colors flex-shrink-0"
              style={{ background: '#fafaf9', color: '#004990', border: '1px solid #e7e5e0', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#e0eaf5'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#004990'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#fafaf9'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
              }}
            >
              Open Budget Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
