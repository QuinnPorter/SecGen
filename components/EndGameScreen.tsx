'use client'

import { useGameStore, type VictoryResult } from '@/lib/gameState'

// ── Grade calculation ─────────────────────────────────────────────────────────

function calculateGrade(
  readiness: number,
  approval: number,
  resolvedRate: number,   // 0–100
  retentionRate: number,  // 0–100
): { letter: string; score: number } {
  const score =
    readiness   * 0.30 +
    approval    * 0.20 +
    resolvedRate  * 0.25 +
    retentionRate * 0.25
  if (score >= 92) return { letter: 'A+', score }
  if (score >= 80) return { letter: 'A',  score }
  if (score >= 70) return { letter: 'B',  score }
  if (score >= 60) return { letter: 'C',  score }
  if (score >= 50) return { letter: 'D',  score }
  return { letter: 'F', score }
}

const GRADE_FLAVOUR: Record<string, string> = {
  'A+': "Historians will regard your tenure as a period of quiet strength — the alliance expanded, threats were managed with precision, and credibility never wavered.",
  'A':  "Historians will regard your tenure as a period of quiet strength — the alliance expanded, threats were managed with precision, and credibility never wavered.",
  'B':  "A competent and steady hand. The alliance is stronger for your service, though opportunities were missed.",
  'C':  "Your term was marked by difficult choices and mixed results. The alliance survived, but bears the scars.",
  'D':  "The alliance endured despite significant setbacks during your leadership. Future Secretaries General will face challenges you left unresolved.",
  'F':  "A term defined by crisis. The foundations you leave behind will take years to rebuild.",
}

const GRADE_COLOR: Record<string, string> = {
  'A+': '#4ade80', 'A': '#4ade80', 'B': '#93c5fd', 'C': '#f59e0b', 'D': '#f87171', 'F': '#ef4444',
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ title, rows }: { title: string; rows: { label: string; value: string | number; highlight?: boolean }[] }) {
  return (
    <div
      className="rounded-lg p-5"
      style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#4b5563' }}>
        {title}
      </p>
      <div className="space-y-2.5">
        {rows.map(({ label, value, highlight }) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <span className="text-xs" style={{ color: '#6b7280' }}>{label}</span>
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: highlight ? '#93c5fd' : '#e8edf2' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Outcome badge config ───────────────────────────────────────────────────────

function outcomeBadge(outcome: VictoryResult): { label: string; bg: string; border: string; color: string } {
  if (outcome.status === 'lost') {
    return { label: 'Term Ended Early', bg: '#7f1d1d', border: '#991b1b', color: '#fca5a5' }
  }
  if (outcome.reason === 'A Generation-Defining Secretaryship') {
    return { label: 'Historic Achievement', bg: '#1c1008', border: '#d97706', color: '#fbbf24' }
  }
  return { label: 'Mission Accomplished', bg: '#1e3a8a', border: '#2563eb', color: '#93c5fd' }
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onReviewMap: () => void
  onNewTerm:   () => void
}

export default function EndGameScreen({ onReviewMap, onNewTerm }: Props) {
  const gameOutcome        = useGameStore((s) => s.gameOutcome)
  const turn               = useGameStore((s) => s.turn)
  const year               = useGameStore((s) => s.year)
  const quarter            = useGameStore((s) => s.quarter)
  const approvalRating     = useGameStore((s) => s.approvalRating)
  const countries          = useGameStore((s) => s.countries)
  const resolvedCrises     = useGameStore((s) => s.resolvedCrises)
  const crises             = useGameStore((s) => s.crises)
  const withdrawnMembers   = useGameStore((s) => s.withdrawnMembers)
  const initialMemberCount = useGameStore((s) => s.initialMemberCount)
  const totalPCSpent       = useGameStore((s) => s.totalPCSpent)
  const totalEngagements   = useGameStore((s) => s.totalEngagements)
  const countriesInDialogue = useGameStore((s) => s.countriesInDialogue)
  const turnsWithHighReadiness = useGameStore((s) => s.turnsWithHighReadiness)
  const accessionProcesses = useGameStore((s) => s.accessionProcesses)

  if (!gameOutcome) return null

  // ── Derived statistics ────────────────────────────────────────────────────

  const natoMembers      = Object.values(countries).filter((c) => c.alignment === 'nato')
  const currentMemberCount = natoMembers.length
  const allianceReadiness  =
    natoMembers.length > 0
      ? Math.round(natoMembers.reduce((sum, c) => sum + c.readiness, 0) / natoMembers.length)
      : 0

  const membersRetained  = initialMemberCount - withdrawnMembers.length
  const membersGained    = currentMemberCount - initialMemberCount + withdrawnMembers.length
  const membersAt2Pct    = natoMembers.filter((c) => c.gdpDefencePercent >= 2.0).length

  const crisesResolved   = resolvedCrises.filter((c) => c.status === 'resolved').length
  const crisesEscalated  = resolvedCrises.filter((c) => c.status === 'escalated').length
  const crisesActive     = crises.filter((c) => c.status === 'active').length
  const totalCrises      = resolvedCrises.length + crisesActive
  const resolvedRate     = totalCrises > 0 ? Math.round((crisesResolved / totalCrises) * 100) : 100

  const article5Invocations = resolvedCrises.filter((c) => c.type === 'article5').length

  const SEV_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }
  const worstResolved = resolvedCrises
    .filter((c) => c.status === 'resolved')
    .sort((a, b) => (SEV_ORDER[b.severity] ?? 0) - (SEV_ORDER[a.severity] ?? 0))[0]

  // Retention rate as 0–100
  const retentionRate = (membersRetained / initialMemberCount) * 100

  const { letter: grade, score: gradeScore } = calculateGrade(
    allianceReadiness,
    approvalRating,
    resolvedRate,
    retentionRate,
  )

  const badge = outcomeBadge(gameOutcome)

  // End date display — current quarter/year at game end
  const endYear = year

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: '#060f1a' }}
    >
      <div
        className="mx-auto py-12 px-6"
        style={{ maxWidth: 760 }}
      >

        {/* ── Header ── */}
        <div className="mb-10">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#374151', letterSpacing: '0.25em' }}
          >
            NATO Secretary General
          </p>
          <h1
            className="font-black mb-1"
            style={{ fontSize: 36, color: '#e8edf2', letterSpacing: '-0.02em' }}
          >
            End of Term Report
          </h1>
          <p className="text-sm mb-6" style={{ color: '#4b5563' }}>
            January 2024 — Q{quarter} {endYear} &nbsp;·&nbsp; Turn {turn}
          </p>

          {/* Outcome badge */}
          <div
            className="inline-flex items-center gap-2 rounded px-3 py-1.5 mb-5"
            style={{ background: badge.bg, border: `1px solid ${badge.border}` }}
          >
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: badge.color }}>
              {badge.label}
            </span>
          </div>

          {/* Reason */}
          <h2
            className="font-bold leading-tight mb-3"
            style={{ fontSize: 24, color: '#e8edf2' }}
          >
            {gameOutcome.reason}
          </h2>

          {/* Detail */}
          <p
            className="leading-relaxed"
            style={{ fontSize: 16, color: '#9ca3af', maxWidth: 640 }}
          >
            {gameOutcome.detail}
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="mb-8" style={{ height: 1, background: '#1e3a5f' }} />

        {/* ── Statistics — Your Legacy ── */}
        <div className="mb-8">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ color: '#4b5563', letterSpacing: '0.2em' }}
          >
            Your Legacy
          </p>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Alliance Health"
              rows={[
                { label: 'Final alliance readiness', value: allianceReadiness, highlight: true },
                { label: 'Members retained', value: `${membersRetained} / ${initialMemberCount}` },
                { label: 'New members gained', value: membersGained > 0 ? `+${membersGained}` : membersGained },
                { label: 'Crises resolved / escalated', value: `${crisesResolved} / ${crisesEscalated}` },
              ]}
            />

            <StatCard
              title="Diplomatic Record"
              rows={[
                { label: 'Final approval rating', value: approvalRating, highlight: true },
                { label: 'Political capital spent', value: totalPCSpent },
                { label: 'Member engagements', value: totalEngagements },
                { label: 'Countries brought to dialogue', value: countriesInDialogue },
              ]}
            />

            <StatCard
              title="Budget Performance"
              rows={[
                { label: 'Members at 2% GDP target', value: `${membersAt2Pct} / ${currentMemberCount}`, highlight: true },
                { label: 'Turns with readiness > 70', value: turnsWithHighReadiness },
                { label: 'Accession processes active', value: Object.keys(accessionProcesses).length },
                { label: 'Turns served', value: turn },
              ]}
            />

            <StatCard
              title="Crisis Management"
              rows={[
                { label: 'Total crises faced', value: totalCrises, highlight: true },
                { label: 'Resolution rate', value: `${resolvedRate}%` },
                { label: 'Article 5 invocations', value: article5Invocations },
                { label: 'Worst crisis resolved', value: worstResolved ? worstResolved.severity.toUpperCase() : '—' },
              ]}
            />
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mb-8" style={{ height: 1, background: '#1e3a5f' }} />

        {/* ── Grade ── */}
        <div className="mb-10">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ color: '#4b5563', letterSpacing: '0.2em' }}
          >
            Historical Assessment
          </p>

          <div
            className="rounded-lg p-6 flex items-start gap-6"
            style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}
          >
            {/* Grade letter */}
            <div className="flex-shrink-0 text-center">
              <div
                className="font-black leading-none"
                style={{ fontSize: 72, color: GRADE_COLOR[grade] ?? '#9ca3af' }}
              >
                {grade}
              </div>
              <div className="text-xs mt-1" style={{ color: '#4b5563' }}>
                {Math.round(gradeScore)} / 100
              </div>
            </div>

            {/* Flavour text */}
            <div className="flex-1 pt-2">
              <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                {GRADE_FLAVOUR[grade]}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  { label: 'Alliance readiness',  weight: '30%', score: allianceReadiness },
                  { label: 'Approval rating',     weight: '20%', score: approvalRating },
                  { label: 'Crisis resolution',   weight: '25%', score: resolvedRate },
                  { label: 'Member retention',    weight: '25%', score: Math.round(retentionRate) },
                ].map(({ label, weight, score }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: '#374151' }}>
                      {label} <span style={{ color: '#1e3a5f' }}>({weight})</span>
                    </span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: '#6b7280' }}>
                      {score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer buttons ── */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onReviewMap}
            className="rounded-lg px-6 py-3 text-sm font-medium transition-colors"
            style={{ background: '#0d1f2d', color: '#9ca3af', border: '1px solid #1e3a5f' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#152840'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#e8edf2'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#0d1f2d'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'
            }}
          >
            Review Map
          </button>

          <button
            onClick={onNewTerm}
            className="rounded-lg px-8 py-3 text-sm font-semibold transition-colors"
            style={{ background: '#2563eb', color: '#fff' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#2563eb')}
          >
            New Term
          </button>
        </div>

      </div>
    </div>
  )
}
