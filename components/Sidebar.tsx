'use client'

import { useState, useEffect } from 'react'
import { useGameStore, selectAllianceReadiness, type BudgetAllocation, type NotificationType, type Crisis } from '@/lib/gameState'
import { saveGame, loadMeta, type SaveMeta } from '@/lib/persistence'
import BudgetPanel from './BudgetPanel'
import AccessionPanel from './AccessionPanel'
import AttentionPanel from './AttentionPanel'

const BUDGET_DOTS: Array<{ key: keyof BudgetAllocation; label: string; color: string }> = [
  { key: 'troopReadiness', label: 'Troops', color: '#2563eb' },
  { key: 'RAndD',          label: 'R&D',    color: '#7c3aed' },
  { key: 'cyberDefence',   label: 'Cyber',  color: '#0d9488' },
  { key: 'partnerAid',     label: 'Aid',    color: '#d97706' },
  { key: 'communications', label: 'Comms',  color: '#16a34a' },
]

const SEV_DOT_COLOR: Record<string, string> = {
  low:      '#6b7280',
  medium:   '#f59e0b',
  high:     '#dc2626',
  critical: '#ef4444',
}

function StatBar({ value, color, title }: { value: number; color: string; title?: string }) {
  return (
    <div className="h-1.5 rounded-full w-full" style={{ background: '#0d1f2d' }} title={title}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  )
}

function approvalColor(v: number) {
  if (v >= 60) return '#16a34a'
  if (v >= 40) return '#f59e0b'
  return '#dc2626'
}

function readinessColor(v: number) {
  if (v >= 70) return '#2563eb'
  if (v >= 50) return '#f59e0b'
  return '#dc2626'
}

// Read-only inline detail for a resolved/escalated crisis
function CrisisLogDetail({ crisis }: { crisis: Crisis }) {
  const chosenOption = crisis.chosenOptionId
    ? crisis.options.find((o) => o.id === crisis.chosenOptionId)
    : null

  return (
    <div
      className="rounded-b px-3 py-2.5 space-y-2"
      style={{ background: '#0a1929', border: '1px solid #1a2f47', borderTop: 'none' }}
    >
      <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
        {crisis.description}
      </p>
      {chosenOption ? (
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: '#93c5fd' }}>
            Response: {chosenOption.label}
          </p>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            {chosenOption.consequences.immediate}
          </p>
        </div>
      ) : (
        <p className="text-xs italic" style={{ color: '#4b5563' }}>
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
      style={{ width: 280, background: '#152840', borderRight: '1px solid #1e3a5f' }}
    >
      {/* Top — identity */}
      <div className="p-6 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid #1e3a5f' }}>
        <div className="text-3xl font-black tracking-widest mb-1" style={{ color: '#2563eb' }}>
          NATO
        </div>
        <div className="text-xs font-medium mb-4" style={{ color: '#6b7280' }}>
          Secretary General
        </div>
        <div className="text-2xl font-bold" style={{ color: '#e8edf2' }}>
          Q{quarter} {year}
        </div>
        <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
          Turn {turn}
        </div>
      </div>

      {/* Middle — alliance status */}
      <div className="flex-1 p-5 space-y-5">
        {/* Approval rating */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
              Approval rating
            </span>
            <span className="text-2xl font-bold" style={{ color: approvalColor(approvalRating) }}>
              {approvalRating}
            </span>
          </div>
          <StatBar value={approvalRating} color={approvalColor(approvalRating)} title={`Approval rating: ${approvalRating} / 100`} />
        </div>

        {/* Alliance readiness */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
              Alliance readiness
            </span>
            <span className="text-2xl font-bold" style={{ color: readinessColor(allianceReadiness) }}>
              {allianceReadiness}
            </span>
          </div>
          <StatBar value={allianceReadiness} color={readinessColor(allianceReadiness)} title={`Alliance readiness: ${allianceReadiness} / 100`} />
        </div>

        {/* Budget summary */}
        <div
          className="rounded-lg p-3 space-y-3"
          style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
              Budget
            </span>
            <span className="text-xs font-semibold" style={{ color: pc < 30 ? '#f87171' : '#f59e0b' }}>
              💡 {pc} / 100
            </span>
          </div>

          {/* Allocation dots */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {BUDGET_DOTS.map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-1">
                <span style={{ color, fontSize: 9, lineHeight: 1 }}>●</span>
                <span className="text-xs tabular-nums" style={{ color: '#9ca3af' }}>
                  {label} <span style={{ color: '#e8edf2' }}>{allocation[key]}</span>
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setBudgetOpen(true)}
            className="w-full rounded py-1.5 text-xs font-medium transition-colors"
            style={{ background: '#1e3a5f', color: '#93c5fd' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1e3a8a')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1e3a5f')}
          >
            Open Budget
          </button>
        </div>

        {/* Members needing attention */}
        {needsAttention > 0 && (
          <button
            onClick={() => setAttentionOpen(true)}
            className="w-full rounded-lg px-3 py-2.5 flex items-center gap-2 transition-colors text-left"
            style={{ background: '#451a03', border: '1px solid #92400e' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#78350f')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#451a03')}
          >
            <span style={{ fontSize: 13 }}>⚠</span>
            <span className="text-xs font-medium" style={{ color: '#fbbf24' }}>
              {needsAttention} member{needsAttention !== 1 ? 's' : ''} need attention
            </span>
          </button>
        )}

        {/* Member count */}
        <div
          className="rounded-lg px-4 py-3 flex items-center justify-between"
          style={{ background: '#0d1f2d' }}
        >
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
            Member states
          </span>
          <span className="text-xl font-bold" style={{ color: '#2563eb' }}>
            {memberCount}
          </span>
        </div>

        {/* Expansion */}
        {(() => {
          const processList   = Object.values(accessionProcesses)
          const activeCount   = processList.length
          const hasReaction   = processList.some((p) => p.adversaryReactionTriggered)

          const STAGE_PILL: Record<string, { label: string; color: string }> = {
            dialogue:   { label: 'Dialogue',   color: '#9ca3af' },
            map:        { label: 'MAP',        color: '#f59e0b' },
            invitation: { label: 'Invitation', color: '#93c5fd' },
            acceding:   { label: 'Acceding',   color: '#4ade80' },
          }

          return (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Expansion
                  </span>
                  {hasReaction && (
                    <span style={{ fontSize: 7, color: '#ef4444' }}>●</span>
                  )}
                </div>
                <span className="text-xs" style={{ color: '#4b5563' }}>
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
                    <span className="text-xs truncate" style={{ color: '#e8edf2' }}>
                      {proc.adversaryReactionTriggered && (
                        <span style={{ color: '#ef4444', marginRight: 4, fontSize: 9 }}>●</span>
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
                <p className="text-xs" style={{ color: '#4b5563' }}>
                  +{processList.length - 4} more
                </p>
              )}

              {/* Open button */}
              <button
                onClick={() => setExpansionOpen(true)}
                className="w-full rounded py-1.5 text-xs font-medium transition-colors"
                style={{ background: '#1e3a5f', color: '#93c5fd' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1e3a8a')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1e3a5f')}
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
            delayed_effect:    '#93c5fd',
            crisis_escalation: '#f87171',
            strategic_crisis:  '#ef4444',
            accession_update:  '#4ade80',
            info:              '#6b7280',
          }

          return (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>
                Recent Developments
              </p>
              <div className="space-y-1.5">
                {recent.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2 rounded px-2.5 py-2"
                    style={{ background: '#0d1f2d', border: '1px solid #1a2f47' }}
                  >
                    <span
                      className="flex-shrink-0 mt-0.5"
                      style={{ fontSize: 7, color: DOT_COLOR[n.type], lineHeight: 1.8 }}
                    >
                      ●
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs leading-snug truncate"
                        style={{ color: '#9ca3af' }}
                        title={n.text}
                      >
                        {n.text}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#374151', fontSize: 10 }}>
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
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
              Crisis Log
            </span>
            <span className="text-xs" style={{ color: '#4b5563' }}>
              {crisisLogOpen ? '▲' : '▼'}{resolvedCrises.length > 0 ? ` ${resolvedCrises.length}` : ''}
            </span>
          </button>

          {crisisLogOpen && (
            <div className="mt-2 space-y-1">
              {recentResolved.length === 0 ? (
                <p className="text-xs leading-relaxed" style={{ color: '#4b5563' }}>
                  No crises on record. Your term has been quiet so far.
                </p>
              ) : (
                recentResolved.map((c) => (
                  <div key={c.id}>
                    <button
                      className="w-full text-left rounded px-2.5 py-2 flex items-start gap-2"
                      style={{
                        background: '#0d1f2d',
                        border: '1px solid #1a2f47',
                        borderBottom: logDetailId === c.id ? 'none' : '1px solid #1a2f47',
                        borderRadius: logDetailId === c.id ? '4px 4px 0 0' : 4,
                        cursor: 'pointer',
                      }}
                      onClick={() => setLogDetailId((prev) => prev === c.id ? null : c.id)}
                    >
                      <span
                        className="flex-shrink-0 mt-0.5"
                        style={{ fontSize: 7, color: SEV_DOT_COLOR[c.severity] ?? '#6b7280', lineHeight: 1.8 }}
                      >
                        ●
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: '#e8edf2' }}>
                          {c.title}
                        </p>
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
      <div className="p-5 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid #1e3a5f' }}>
        <button
          onClick={advanceTurn}
          className="w-full rounded-lg py-3 font-semibold text-sm transition-colors"
          style={{ background: '#2563eb', color: '#fff' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#2563eb')}
        >
          End Turn
        </button>
        <p className="text-center text-xs" style={{ color: '#4b5563' }}>
          Advancing to Q{nextQ} {nextYear}…
        </p>
        <button
          onClick={() => {
            saveGame(useGameStore.getState())
            setSavedMeta(loadMeta())
          }}
          className="w-full rounded-lg py-2 text-xs font-medium transition-colors"
          style={{ background: '#0d1f2d', color: '#6b7280', border: '1px solid #1e3a5f' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#6b7280'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#1e3a5f'
          }}
        >
          Save
        </button>
        {savedMeta && (
          <p className="text-center text-xs" style={{ color: '#374151' }}>
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
