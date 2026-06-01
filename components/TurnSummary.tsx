'use client'

import { useEffect, useRef } from 'react'
import { useGameStore } from '@/lib/gameState'
import { ShieldCheck, Zap, AlertTriangle, Map, Globe, FileText, Crosshair, Users, Coins, TrendingUp, type LucideIcon } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 4000

// ── Quarter label ─────────────────────────────────────────────────────────────

const QUARTER_LABEL: Record<number, string> = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' }

// ── Delta formatting ──────────────────────────────────────────────────────────

const NEUTRAL = '#78716c'
const GOOD = '#15803d'
const BAD = '#dc2626'

function fmtDelta(n: number): string {
  if (Math.abs(n) < 0.05) return '0'
  return `${n > 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`
}

// goodWhenPositive=false means a negative delta is the desirable direction.
function deltaColor(n: number, goodWhenPositive: boolean): string {
  if (Math.abs(n) < 0.05) return NEUTRAL
  const good = goodWhenPositive ? n > 0 : n < 0
  return good ? GOOD : BAD
}

// ── Row components ────────────────────────────────────────────────────────────

function Row({
  Icon,
  iconColor,
  label,
  value,
  valueColor,
}: {
  Icon: LucideIcon
  iconColor?: string
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={13} strokeWidth={2} color={iconColor ?? '#78716c'} style={{ flexShrink: 0 }} />
        <span className="text-xs truncate" style={{ color: '#57534e' }}>{label}</span>
      </div>
      <span
        className="text-xs font-semibold tabular-nums flex-shrink-0"
        style={{ color: valueColor ?? '#1c1917' }}
      >
        {value}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TurnSummary() {
  const showTurnSummary  = useGameStore((s) => s.showTurnSummary)
  const data             = useGameStore((s) => s.turnSummaryData)
  const dismissTurnSummary = useGameStore((s) => s.dismissTurnSummary)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!showTurnSummary) return
    timerRef.current = setTimeout(() => {
      dismissTurnSummary()
    }, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [showTurnSummary, dismissTurnSummary])

  if (!showTurnSummary || !data) return null

  const {
    prevQuarter, prevYear,
    readinessDelta, pcReplenished,
    delayedEffects, accessionChanges, alignmentChanges, upcomingCrises,
  } = data

  // New budget-impact + PC-ledger fields (optional — default for older saves).
  const threatDelta       = data.threatDelta ?? 0
  const satisfactionDelta = data.satisfactionDelta ?? 0
  const fiscalDelta       = data.fiscalDelta ?? 0
  const accessionDelta    = data.accessionDelta ?? 0
  const pcEarned = data.pcEarned ?? pcReplenished
  const pcSpent  = data.pcSpent ?? 0
  const pcNet    = data.pcNet ?? (pcEarned - pcSpent)

  const readinessDeltaColor =
    readinessDelta > 0 ? '#15803d' : readinessDelta < 0 ? '#dc2626' : '#78716c'
  const readinessDeltaStr =
    readinessDelta > 0 ? `+${readinessDelta}` : String(readinessDelta)

  const netColor = pcNet > 0 ? GOOD : pcNet < 0 ? BAD : NEUTRAL
  const netStr   = pcNet > 0 ? `+${pcNet}` : String(pcNet)

  const hasBudgetImpact =
    Math.abs(readinessDelta) >= 1 ||
    Math.abs(threatDelta) >= 0.05 ||
    Math.abs(satisfactionDelta) >= 0.05 ||
    Math.abs(fiscalDelta) >= 0.05 ||
    Math.abs(accessionDelta) >= 0.05

  return (
    <>
      {/* CSS for progress bar animation */}
      <style>{`
        @keyframes ts-shrink {
          from { width: 100%; }
          to   { width: 0%;   }
        }
        .ts-progress-bar {
          animation: ts-shrink ${AUTO_DISMISS_MS}ms linear forwards;
        }
      `}</style>

      {/* Panel */}
      <div
        onClick={dismissTurnSummary}
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 480,
          zIndex: 60,
          background: '#fafaf9',
          border: '1px solid #e7e5e0',
          borderRadius: 12,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {/* Progress bar */}
        <div style={{ height: 3, background: '#f0ede7', position: 'relative' }}>
          <div
            className="ts-progress-bar"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              background: '#004990',
            }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-4 pb-3"
          style={{ borderBottom: '1px solid #e7e5e0', background: '#f5f3ef' }}
        >
          <div>
            <p
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: '#a8a29e', letterSpacing: '0.2em' }}
            >
              Wire Report
            </p>
            <p className="font-serif font-semibold tabular-nums" style={{ fontSize: 17, color: '#1c1917', marginTop: 2, letterSpacing: '-0.01em' }}>
              {QUARTER_LABEL[prevQuarter]} {prevYear} — End of Quarter
            </p>
          </div>
          <span className="text-xs" style={{ color: '#a8a29e' }}>Click to dismiss</span>
        </div>

        {/* Body */}
        <div className="px-5 pb-4 pt-3 space-y-0.5">

          {/* ── Budget impact this turn ── */}
          {hasBudgetImpact && (
            <p className="text-xs font-black uppercase tracking-widest pt-0.5 pb-1" style={{ color: '#a8a29e', letterSpacing: '0.18em' }}>
              Budget impact this turn
            </p>
          )}

          {/* Readiness delta */}
          {Math.abs(readinessDelta) >= 1 && (
            <Row
              Icon={ShieldCheck}
              iconColor={readinessDeltaColor}
              label="Alliance readiness"
              value={readinessDeltaStr}
              valueColor={readinessDeltaColor}
            />
          )}

          {/* Threat delta (cyber defence) */}
          {Math.abs(threatDelta) >= 0.05 && (
            <Row
              Icon={Crosshair}
              iconColor={deltaColor(threatDelta, false)}
              label="Threat level (avg)"
              value={fmtDelta(threatDelta)}
              valueColor={deltaColor(threatDelta, false)}
            />
          )}

          {/* Satisfaction delta (communications) */}
          {Math.abs(satisfactionDelta) >= 0.05 && (
            <Row
              Icon={Users}
              iconColor={deltaColor(satisfactionDelta, true)}
              label="Alliance satisfaction (avg)"
              value={fmtDelta(satisfactionDelta)}
              valueColor={deltaColor(satisfactionDelta, true)}
            />
          )}

          {/* Fiscal delta (partner aid) */}
          {Math.abs(fiscalDelta) >= 0.05 && (
            <Row
              Icon={Coins}
              iconColor={deltaColor(fiscalDelta, false)}
              label="Fiscal pressure (avg)"
              value={fmtDelta(fiscalDelta)}
              valueColor={deltaColor(fiscalDelta, false)}
            />
          )}

          {/* Accession delta (partner aid) */}
          {Math.abs(accessionDelta) >= 0.05 && (
            <Row
              Icon={TrendingUp}
              iconColor={deltaColor(accessionDelta, true)}
              label="Candidate accession (total)"
              value={fmtDelta(accessionDelta)}
              valueColor={deltaColor(accessionDelta, true)}
            />
          )}

          {/* ── Political capital ledger ── */}
          <div className="flex items-center justify-between gap-3 py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Zap size={13} strokeWidth={2} color="#004990" style={{ flexShrink: 0 }} />
              <span className="text-xs truncate" style={{ color: '#57534e' }}>Political capital</span>
            </div>
            <span className="text-xs tabular-nums flex-shrink-0">
              <span style={{ color: GOOD }}>+{pcEarned}</span>
              {' '}
              <span style={{ color: pcSpent > 0 ? BAD : '#a8a29e' }}>−{pcSpent}</span>
              {' '}
              <span style={{ color: '#a8a29e' }}>=</span>
              {' '}
              <span style={{ color: netColor, fontWeight: 700 }}>{netStr} PC</span>
            </span>
          </div>

          {/* Upcoming crises */}
          {upcomingCrises > 0 && (
            <Row
              Icon={AlertTriangle}
              iconColor="#b45309"
              label="Situations developing"
              value={`${upcomingCrises} incoming`}
              valueColor="#b45309"
            />
          )}

          {/* Accession changes */}
          {accessionChanges.map(({ countryName, scoreDelta }) => (
            <Row
              key={countryName}
              Icon={Map}
              iconColor={scoreDelta > 0 ? '#15803d' : '#dc2626'}
              label={`${countryName} accession`}
              value={scoreDelta > 0 ? `+${scoreDelta} score` : `${scoreDelta} score`}
              valueColor={scoreDelta > 0 ? '#15803d' : '#dc2626'}
            />
          ))}

          {/* Alignment changes */}
          {alignmentChanges.map(({ countryName, from, to }) => (
            <Row
              key={countryName}
              Icon={Globe}
              iconColor="#b45309"
              label={countryName}
              value={`${from} → ${to}`}
              valueColor="#b45309"
            />
          ))}

          {/* Delayed effects — truncate label if long */}
          {delayedEffects.map((text, i) => (
            <div
              key={i}
              className="py-1.5 flex items-start gap-2"
            >
              <FileText size={13} strokeWidth={2} color="#78716c" style={{ marginTop: 1, flexShrink: 0 }} />
              <span
                className="text-xs leading-relaxed"
                style={{ color: '#57534e' }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
