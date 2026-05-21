'use client'

import { useEffect, useRef } from 'react'
import { useGameStore } from '@/lib/gameState'

// ── Constants ─────────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 4000

// ── Quarter label ─────────────────────────────────────────────────────────────

const QUARTER_LABEL: Record<number, string> = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' }

// ── Row components ────────────────────────────────────────────────────────────

function Row({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
        <span className="text-xs truncate" style={{ color: '#6b7280' }}>{label}</span>
      </div>
      <span
        className="text-xs font-semibold tabular-nums flex-shrink-0"
        style={{ color: valueColor ?? '#e8edf2' }}
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

  const readinessDeltaColor =
    readinessDelta > 0 ? '#4ade80' : readinessDelta < 0 ? '#f87171' : '#6b7280'
  const readinessDeltaStr =
    readinessDelta > 0 ? `+${readinessDelta}` : String(readinessDelta)

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
          background: '#0d1f2d',
          border: '1px solid #1e3a5f',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {/* Progress bar */}
        <div style={{ height: 3, background: '#060f1a', position: 'relative' }}>
          <div
            className="ts-progress-bar"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              background: '#2563eb',
            }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-4 pb-2"
          style={{ borderBottom: '1px solid #0f2a40' }}
        >
          <div>
            <p
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: '#374151', letterSpacing: '0.18em' }}
            >
              Wire Report
            </p>
            <p className="font-semibold" style={{ fontSize: 14, color: '#e8edf2', marginTop: 1 }}>
              {QUARTER_LABEL[prevQuarter]} {prevYear} — End of Quarter
            </p>
          </div>
          <span className="text-xs" style={{ color: '#374151' }}>Click to dismiss</span>
        </div>

        {/* Body */}
        <div className="px-5 pb-4 pt-2 space-y-0.5">

          {/* Readiness delta */}
          {Math.abs(readinessDelta) >= 1 && (
            <Row
              icon="🛡"
              label="Alliance readiness"
              value={readinessDeltaStr}
              valueColor={readinessDeltaColor}
            />
          )}

          {/* PC replenished */}
          <Row
            icon="⚡"
            label="Political capital replenished"
            value={`+${pcReplenished} PC`}
            valueColor="#93c5fd"
          />

          {/* Upcoming crises */}
          {upcomingCrises > 0 && (
            <Row
              icon="⚠"
              label="Situations developing"
              value={`${upcomingCrises} incoming`}
              valueColor="#f59e0b"
            />
          )}

          {/* Accession changes */}
          {accessionChanges.map(({ countryName, scoreDelta }) => (
            <Row
              key={countryName}
              icon="🗺"
              label={`${countryName} accession`}
              value={scoreDelta > 0 ? `+${scoreDelta} score` : `${scoreDelta} score`}
              valueColor={scoreDelta > 0 ? '#4ade80' : '#f87171'}
            />
          ))}

          {/* Alignment changes */}
          {alignmentChanges.map(({ countryName, from, to }) => (
            <Row
              key={countryName}
              icon="🌐"
              label={countryName}
              value={`${from} → ${to}`}
              valueColor="#fbbf24"
            />
          ))}

          {/* Delayed effects — truncate label if long */}
          {delayedEffects.map((text, i) => (
            <div
              key={i}
              className="py-1.5 flex items-start gap-2"
            >
              <span style={{ fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>📋</span>
              <span
                className="text-xs leading-relaxed"
                style={{ color: '#9ca3af' }}
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
