'use client'

import { useState, useEffect } from 'react'
import { useGameStore, selectAllianceReadiness, type BudgetAllocation, type NotificationType, type Crisis } from '@/lib/gameState'
import { saveGame, loadMeta, type SaveMeta } from '@/lib/persistence'
import { AlertTriangle, Lightbulb, Circle, ChevronUp, ChevronDown } from 'lucide-react'
import BudgetPanel from './BudgetPanel'
import AccessionPanel from './AccessionPanel'
import AttentionPanel from './AttentionPanel'

const BUDGET_DOTS: Array<{ key: keyof BudgetAllocation; label: string; color: string }> = [
  { key: 'troopReadiness', label: 'Troops', color: '#004990' },
  { key: 'RAndD',          label: 'R&D',    color: '#6d28d9' },
  { key: 'cyberDefence',   label: 'Cyber',  color: '#0f766e' },
  { key: 'partnerAid',     label: 'Aid',    color: '#b45309' },
  { key: 'communications', label: 'Comms',  color: '#15803d' },
]

const SEV_DOT_COLOR: Record<string, string> = {
  low:      '#78716c',
  medium:   '#b45309',
  high:     '#b91c1c',
  critical: '#dc2626',
}

function StatBar({ value, color, title }: { value: number; color: string; title?: string }) {
  return (
    <div className="h-1.5 rounded-full w-full" style={{ background: '#e7e5e0' }} title={title}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  )
}

function approvalColor(v: number) {
  if (v >= 60) return '#15803d'
  if (v >= 40) return '#b45309'
  return '#b91c1c'
}

function readinessColor(v: number) {
  if (v >= 70) return '#004990'
  if (v >= 50) return '#b45309'
  return '#b91c1c'
}

// Read-only inline detail for a resolved/escalated crisis
function CrisisLogDetail({ crisis }: { crisis: Crisis }) {
  const chosenOption = crisis.chosenOptionId
    ? crisis.options.find((o) => o.id === crisis.chosenOptionId)
    : null

  return (
    <div
      className="rounded-b px-3 py-2.5 space-y-2"
      style={{ background: '#f0ede7', border: '1px solid #e7e5e0', borderTop: 'none' }}
    >
      <p className="text-xs leading-relaxed" style={{ color: '#57534e' }}>
        {crisis.description}
      </p>
      {chosenOption ? (
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: '#004990' }}>
            Response: {chosenOption.label}
          </p>
          <p className="text-xs" style={{ color: '#78716c' }}>
            {chosenOption.consequences.immediate}
          </p>
        </div>
      ) : (
        <p className="text-xs italic" style={{ color: '#a8a29e' }}>
          No response taken — crisis escalated.
        </p>
      )}
    </div>
  )
}

function lastSavedText(savedTurn: number, currentTurn: number): string {
  const delta = currentTurn - savedTurn
  if (delta <= 0) return 'Last saved: this turn'
  if (delta === 1) return 'Last saved: 1 turn ago'
  return `Last saved: ${delta} turns ago`
}

export default function Sidebar() {
  const [budgetOpen, setBudgetOpen]         = useState(false)
  const [attentionOpen, setAttentionOpen]   = useState(false)
  const [expansionOpen, setExpansionOpen]   = useState(false)
  const [crisisLogOpen, setCrisisLogOpen]   = useState(false)
  const [logDetailId, setLogDetailId]       = useState<string | null>(null)
  // Start as null on both server and client so SSR markup matches first client
  // render. The real value is loaded in the effect below after hydration.
  const [savedMeta, setSavedMeta]           = useState<SaveMeta | null>(null)

  const turn           = useGameStore((s) => s.turn)

  // Re-read meta from localStorage on mount and after every turn (autosave runs
  // just before re-render). Running in an effect keeps SSR/CSR markup aligned.
  useEffect(() => { setSavedMeta(loadMeta()) }, [turn])

  // ── Panel keyboard shortcuts ───────────────────────────────────────────────
  // B → Budget, E → Expansion, A → Attention, Escape → close open panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as Element).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return
      if (e.key === 'b' || e.key === 'B') { setBudgetOpen((v) => !v);    return }
      if (e.key === 'e' || e.key === 'E') { setExpansionOpen((v) => !v); return }
      if (e.key === 'a' || e.key === 'A') { setAttentionOpen((v) => !v); return }
      if (e.key === 'Escape') {
        if (budgetOpen)    { setBudgetOpen(false);    return }
        if (expansionOpen) { setExpansionOpen(false); return }
        if (attentionOpen) { setAttentionOpen(false); return }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [budgetOpen, expansionOpen, attentionOpen])
  const year           = useGameStore((s) => s.year)
  const quarter        = useGameStore((s) => s.quarter)
  const approvalRating = useGameStore((s) => s.approvalRating)
  const countries      = useGameStore((s) => s.countries)
  const advanceTurn    = useGameStore((s) => s.advanceTurn)
  const allocation     = useGameStore((s) => s.budgetState.allocation)
  const pc             = useGameStore((s) => s.budgetState.totalPoliticalCapital)
  const accessionProcesses = useGameStore((s) => s.accessionProcesses)

  const allianceReadiness = useGameStore((s) => selectAllianceReadiness(s.countries))
  const notifications     = useGameStore((s) => s.notifications)
  const resolvedCrises    = useGameStore((s) => s.resolvedCrises)
  const iwPressure        = useGameStore((s) => s.informationWarfare?.pressure ?? 20)
  const crisisPhase       = useGameStore((s) => s.crisisPhase?.mode ?? 'normal')

  const natoMembers  = Object.values(countries).filter((c) => c.alignment === 'nato')
  const memberCount  = natoMembers.length
  const needsAttention = natoMembers.filter(
    (c) => c.allianceSatisfaction < 50 || c.gdpDefencePercent < 2.0 || c.fiscalPressure > 65
  ).length

  const nextQ    = quarter === 4 ? 1 : quarter + 1
  const nextYear = quarter === 4 ? year + 1 : year

  const recentResolved = [...resolvedCrises].reverse().slice(0, 5)

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 overflow-y-auto"
      style={{ width: 280, background: '#fafaf9', borderRight: '1px solid #e7e5e0' }}
    >
      {/* Top — identity */}
      <div className="p-6 pb-5 flex-shrink-0" style={{ borderBottom: '1px solid #e7e5e0' }}>
        <div
          className="font-serif font-bold tracking-tight mb-1"
          style={{ color: '#004990', fontSize: 32, letterSpacing: '-0.02em', lineHeight: 1 }}
        >
          NATO
        </div>
        <div className="text-xs font-medium uppercase tracking-widest mb-5" style={{ color: '#78716c', letterSpacing: '0.18em' }}>
          Secretary General
        </div>
        <div className="font-serif font-semibold tabular-nums" style={{ color: '#1c1917', fontSize: 22, letterSpacing: '-0.01em' }}>
          Q{quarter} {year}
        </div>
        <div className="text-xs mt-1 tabular-nums" style={{ color: '#78716c' }}>
          Turn {turn}
        </div>
      </div>

      {/* Middle — alliance status */}
      <div className="flex-1 p-6 space-y-6">
        {/* Approval rating */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#78716c' }}>
              Approval rating
            </span>
            <span className="font-mono font-semibold tabular-nums" style={{ color: approvalColor(approvalRating), fontSize: 22 }}>
              {approvalRating}
            </span>
          </div>
          <StatBar value={approvalRating} color={approvalColor(approvalRating)} title={`Approval rating: ${approvalRating} / 100`} />
        </div>

        {/* Alliance readiness */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#78716c' }}>
              Alliance readiness
            </span>
            <span className="font-mono font-semibold tabular-nums" style={{ color: readinessColor(allianceReadiness), fontSize: 22 }}>
              {allianceReadiness}
            </span>
          </div>
          <StatBar value={allianceReadiness} color={readinessColor(allianceReadiness)} title={`Alliance readiness: ${allianceReadiness} / 100`} />
        </div>

        {/* Information warfare pressure */}
        {(() => {
          const iw = Math.round(iwPressure)
          const iwColor = iw >= 70 ? '#b91c1c' : iw >= 40 ? '#b45309' : '#15803d'
          const iwLabel = iw >= 85 ? 'Critical' : iw >= 70 ? 'High' : iw >= 40 ? 'Elevated' : 'Stable'
          return (
            <div title={`Information warfare pressure: ${iw} / 100\nClimbs with adversary tension; drained by cyber defence + communications.`}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#78716c' }}>
                  Info warfare
                </span>
                <span className="font-mono font-semibold tabular-nums flex items-baseline gap-1.5" style={{ color: iwColor, fontSize: 16 }}>
                  <span style={{ fontSize: 10, fontFamily: 'sans-serif', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{iwLabel}</span>
                  {iw}
                </span>
              </div>
              <StatBar value={iw} color={iwColor} title={`IW pressure: ${iw} / 100`} />
            </div>
          )
        })()}

        {/* Crisis phase indicator */}
        {(() => {
          const PHASE_META: Record<string, { label: string; color: string; bg: string; tip: string }> = {
            calm:   { label: 'Calm period',         color: '#15803d', bg: '#e7f3ec', tip: 'Crisis tempo is low — opportunity to consolidate readiness and pursue accession.' },
            normal: { label: 'Active',              color: '#b45309', bg: '#fef3c7', tip: 'Standard pacing — expect ongoing pressure across the alliance.' },
            storm:  { label: 'Heightened pressure', color: '#b91c1c', bg: '#fee2e2', tip: 'Multiple flashpoints likely — crises will arrive faster and may stack near the cap.' },
          }
          const meta = PHASE_META[crisisPhase] ?? PHASE_META.normal
          return (
            <div title={meta.tip}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#78716c' }}>
                  Crisis tempo
                </span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}
                >
                  {meta.label}
                </span>
              </div>
            </div>
          )
        })()}

        {/* Budget summary */}
        <div
          className="rounded-lg p-4 space-y-3"
          style={{
            background: '#f5f3ef',
            border: '1px solid #e7e5e0',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#78716c' }}>
              Budget
            </span>
            <span
              className="flex items-center gap-1 text-xs font-semibold tabular-nums"
              style={{ color: pc < 30 ? '#dc2626' : '#b45309' }}
            >
              <Lightbulb size={12} strokeWidth={2} />
              {pc} / 100
            </span>
          </div>

          {/* Allocation dots */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {BUDGET_DOTS.map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-1">
                <Circle size={8} fill={color} strokeWidth={0} />
                <span className="text-xs tabular-nums" style={{ color: '#78716c' }}>
                  {label} <span style={{ color: '#1c1917', fontWeight: 600 }}>{allocation[key]}</span>
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setBudgetOpen(true)}
            className="w-full rounded py-1.5 text-xs font-medium transition-colors"
            style={{ background: '#fafaf9', color: '#004990', border: '1px solid #e7e5e0' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#e0eaf5'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#004990'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#fafaf9'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
            }}
          >
            Open Budget
          </button>
        </div>

        {/* Members needing attention */}
        {needsAttention > 0 && (
          <button
            onClick={() => setAttentionOpen(true)}
            className="w-full rounded-lg px-3 py-2.5 flex items-center gap-2 transition-colors text-left"
            style={{ background: '#fef3c7', border: '1px solid #b45309' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#fde68a')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#fef3c7')}
          >
            <AlertTriangle size={14} color="#b45309" strokeWidth={2} />
            <span className="text-xs font-medium" style={{ color: '#92400e' }}>
              {needsAttention} member{needsAttention !== 1 ? 's' : ''} need attention
            </span>
          </button>
        )}

        {/* Member count */}
        <div
          className="rounded-lg px-4 py-3 flex items-center justify-between"
          style={{ background: '#f5f3ef', border: '1px solid #e7e5e0' }}
        >
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#78716c' }}>
            Member states
          </span>
          <span className="font-mono font-semibold tabular-nums" style={{ color: '#004990', fontSize: 20 }}>
            {memberCount}
          </span>
        </div>

        {/* Expansion */}
        {(() => {
          const processList   = Object.values(accessionProcesses)
          const activeCount   = processList.length
          const hasReaction   = processList.some((p) => p.adversaryReactionTriggered)

          const STAGE_PILL: Record<string, { label: string; color: string }> = {
            dialogue:   { label: 'Dialogue',   color: '#78716c' },
            map:        { label: 'MAP',        color: '#b45309' },
            invitation: { label: 'Invitation', color: '#004990' },
            acceding:   { label: 'Acceding',   color: '#15803d' },
          }

          return (
            <div
              className="rounded-lg p-4 space-y-2"
              style={{
                background: '#f5f3ef',
                border: '1px solid #e7e5e0',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#78716c' }}>
                    Expansion
                  </span>
                  {hasReaction && (
                    <Circle size={7} fill="#dc2626" strokeWidth={0} />
                  )}
                </div>
                <span className="text-xs" style={{ color: '#a8a29e' }}>
                  {activeCount > 0
                    ? `${activeCount} active`
                    : 'No processes'}
                </span>
              </div>

              {/* Active process list */}
              {processList.slice(0, 4).map((proc) => {
                const cname = countries[proc.countryId]?.name ?? proc.countryId
                const pill  = STAGE_PILL[proc.stage]
                return (
                  <div key={proc.countryId} className="flex items-center justify-between gap-2">
                    <span className="text-xs truncate flex items-center" style={{ color: '#1c1917' }}>
                      {proc.adversaryReactionTriggered && (
                        <Circle size={8} fill="#dc2626" strokeWidth={0} style={{ marginRight: 4, flexShrink: 0 }} />
                      )}
                      {cname}
                    </span>
                    {pill && (
                      <span
                        className="text-xs font-semibold flex-shrink-0"
                        style={{ color: pill.color, fontSize: 10 }}
                      >
                        {pill.label}
                      </span>
                    )}
                  </div>
                )
              })}
              {processList.length > 4 && (
                <p className="text-xs" style={{ color: '#a8a29e' }}>
                  +{processList.length - 4} more
                </p>
              )}

              {/* Open button */}
              <button
                onClick={() => setExpansionOpen(true)}
                className="w-full rounded py-1.5 text-xs font-medium transition-colors"
                style={{ background: '#fafaf9', color: '#004990', border: '1px solid #e7e5e0' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#e0eaf5'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#004990'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#fafaf9'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
                }}
              >
                Open Expansion
              </button>
            </div>
          )
        })()}

        {/* ── Recent Developments ── */}
        {(() => {
          const recent = [...notifications].reverse().slice(0, 3)
          if (recent.length === 0) return null

          const DOT_COLOR: Record<NotificationType, string> = {
            delayed_effect:    '#004990',
            crisis_escalation: '#dc2626',
            strategic_crisis:  '#dc2626',
            accession_update:  '#15803d',
            info:              '#78716c',
          }

          return (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#78716c' }}>
                Recent Developments
              </p>
              <div className="space-y-1.5">
                {recent.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2 rounded px-2.5 py-2"
                    style={{ background: '#f5f3ef', border: '1px solid #e7e5e0' }}
                  >
                    <Circle
                      size={7}
                      fill={DOT_COLOR[n.type]}
                      strokeWidth={0}
                      style={{ marginTop: 5, flexShrink: 0 }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs leading-snug truncate"
                        style={{ color: '#57534e' }}
                        title={n.text}
                      >
                        {n.text}
                      </p>
                      <p className="text-xs mt-0.5 tabular-nums" style={{ color: '#a8a29e', fontSize: 10 }}>
                        Turn {n.turn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── Crisis Log ── */}
        <div>
          {/* Collapsible header */}
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setCrisisLogOpen((v) => !v)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#78716c' }}>
              Crisis Log
            </span>
            <span className="flex items-center gap-1 text-xs tabular-nums" style={{ color: '#a8a29e' }}>
              {crisisLogOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {resolvedCrises.length > 0 ? ` ${resolvedCrises.length}` : ''}
            </span>
          </button>

          {crisisLogOpen && (
            <div className="mt-2 space-y-1">
              {recentResolved.length === 0 ? (
                <p className="text-xs leading-relaxed" style={{ color: '#a8a29e' }}>
                  No crises on record. Your term has been quiet so far.
                </p>
              ) : (
                recentResolved.map((c) => (
                  <div key={c.id}>
                    <button
                      className="w-full text-left rounded px-2.5 py-2 flex items-start gap-2"
                      style={{
                        background: '#f5f3ef',
                        border: '1px solid #e7e5e0',
                        borderBottom: logDetailId === c.id ? 'none' : '1px solid #e7e5e0',
                        borderRadius: logDetailId === c.id ? '4px 4px 0 0' : 4,
                        cursor: 'pointer',
                      }}
                      onClick={() => setLogDetailId((prev) => prev === c.id ? null : c.id)}
                    >
                      <Circle
                        size={7}
                        fill={SEV_DOT_COLOR[c.severity] ?? '#78716c'}
                        strokeWidth={0}
                        style={{ marginTop: 5, flexShrink: 0 }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: '#1c1917' }}>
                          {c.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="tabular-nums"
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
                    </button>

                    {logDetailId === c.id && <CrisisLogDetail crisis={c} />}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom — end turn + save */}
      <div className="p-6 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid #e7e5e0' }}>
        <button
          onClick={advanceTurn}
          className="w-full rounded-lg py-3 font-semibold text-sm transition-colors"
          style={{
            background: '#004990',
            color: '#fff',
            boxShadow: '0 1px 2px rgba(0, 73, 144, 0.18), 0 2px 4px rgba(0, 73, 144, 0.12)',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#003a78')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#004990')}
        >
          End Turn
        </button>
        <p className="text-center text-xs tabular-nums" style={{ color: '#a8a29e' }}>
          Advancing to Q{nextQ} {nextYear}…
        </p>
        <button
          onClick={() => {
            saveGame(useGameStore.getState())
            setSavedMeta(loadMeta())
          }}
          className="w-full rounded-lg py-2 text-xs font-medium transition-colors"
          style={{ background: '#fafaf9', color: '#57534e', border: '1px solid #e7e5e0' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#004990'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#004990'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#57534e'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
          }}
        >
          Save
        </button>
        {savedMeta && (
          <p className="text-center text-xs tabular-nums" style={{ color: '#a8a29e' }}>
            {lastSavedText(savedMeta.turn, turn)}
          </p>
        )}
      </div>

      <BudgetPanel isOpen={budgetOpen} onClose={() => setBudgetOpen(false)} />
      <AccessionPanel isOpen={expansionOpen} onClose={() => setExpansionOpen(false)} />
      <AttentionPanel
        isOpen={attentionOpen}
        onClose={() => setAttentionOpen(false)}
        onOpenBudget={() => setBudgetOpen(true)}
      />
    </aside>
  )
}
