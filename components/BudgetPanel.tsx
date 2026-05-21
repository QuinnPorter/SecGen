'use client'

import { useState, useEffect } from 'react'
import { useGameStore, type BudgetAllocation } from '@/lib/gameState'
import { PC_COST_ENGAGE } from '@/lib/constants'

const ALLOCATION_KEYS: Array<keyof BudgetAllocation> = [
  'troopReadiness', 'RAndD', 'cyberDefence', 'partnerAid', 'communications',
]

const SLIDER_CONFIG: Array<{
  key: keyof BudgetAllocation
  label: string
  color: string
  description: string
  effect: (v: number) => string
}> = [
  {
    key: 'troopReadiness',
    label: 'Troop Readiness',
    color: '#2563eb',
    description: 'Drives readiness improvement across all NATO members each turn.',
    effect: (v) =>
      v < 20
        ? '⚠ Below threshold — readiness decays 2 pts/turn'
        : `Readiness drifts toward ${v} (up to +3 pts/turn per member)`,
  },
  {
    key: 'RAndD',
    label: 'R&D',
    color: '#7c3aed',
    description: 'Technology investment; unlocks advanced crisis resolution options in Phase 4.',
    effect: (v) => `Crisis resolution multiplier ×${(1 + v / 200).toFixed(2)}`,
  },
  {
    key: 'cyberDefence',
    label: 'Cyber Defence',
    color: '#0d9488',
    description: 'Suppresses threat levels across all NATO members each turn.',
    effect: (v) => `−${(v / 50).toFixed(2)} threat/turn per member (floor 5)`,
  },
  {
    key: 'partnerAid',
    label: 'Partner Aid',
    color: '#d97706',
    description: 'Builds accession momentum for candidates; eases fiscal pressure on stretched members.',
    effect: (v) =>
      `+${(v / 100).toFixed(2)} accession score/turn · −${(v / 80).toFixed(2)} fiscal pressure (if >60)`,
  },
  {
    key: 'communications',
    label: 'Communications',
    color: '#16a34a',
    description: 'Boosts alliance satisfaction for engaged members; others drift toward 60 baseline.',
    effect: (v) => `+${(v / 40).toFixed(2)} satisfaction/turn for engaged members`,
  },
]

// Mirrors the store's setAllocation logic for local draft state
function adjustDraft(
  current: BudgetAllocation,
  key: keyof BudgetAllocation,
  value: number,
): BudgetAllocation {
  const clamped = Math.max(0, Math.min(100, value))
  const others = ALLOCATION_KEYS.filter((k) => k !== key)
  const otherSum = others.reduce((sum, k) => sum + current[k], 0)
  const allowedOtherSum = 100 - clamped

  if (otherSum === 0 || otherSum <= allowedOtherSum) {
    return { ...current, [key]: clamped }
  }

  const scale = allowedOtherSum / otherSum
  const floored: Partial<BudgetAllocation> = {}
  let flouredSum = 0
  for (const k of others) {
    floored[k] = Math.floor(current[k] * scale)
    flouredSum += floored[k]!
  }
  const remainder = allowedOtherSum - flouredSum
  if (remainder > 0) {
    const largest = others.reduce((a, b) => (current[a] >= current[b] ? a : b))
    floored[largest] = floored[largest]! + remainder
  }
  return { ...current, [key]: clamped, ...(floored as BudgetAllocation) }
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function BudgetPanel({ isOpen, onClose }: Props) {
  const budgetState       = useGameStore((s) => s.budgetState)
  const turn              = useGameStore((s) => s.turn)
  const quarter           = useGameStore((s) => s.quarter)
  const year              = useGameStore((s) => s.year)
  const setFullAllocation = useGameStore((s) => s.setFullAllocation)

  const [draft, setDraft] = useState<BudgetAllocation>(budgetState.allocation)

  // Sync draft to committed allocation whenever the panel opens
  useEffect(() => {
    if (isOpen) setDraft(budgetState.allocation)
  }, [isOpen, budgetState.allocation])

  if (!isOpen) return null

  const total = ALLOCATION_KEYS.reduce((sum, k) => sum + draft[k], 0)
  const pc    = budgetState.totalPoliticalCapital
  const overBudget = total > 100

  function handleApply() {
    setFullAllocation(draft)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          width: 520,
          maxHeight: '90vh',
          background: '#152840',
          border: '1px solid #1e3a5f',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #1e3a5f' }}
        >
          <div>
            <h2 className="font-semibold" style={{ fontSize: 16, color: '#e8edf2' }}>
              Alliance Budget Allocation
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              Turn {turn} · Q{quarter} {year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full flex items-center justify-center text-sm font-bold transition-colors"
            style={{ width: 28, height: 28, background: '#1e3a5f', color: '#9ca3af' }}
            aria-label="Close budget panel"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Political Capital */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                Political Capital
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: pc < 30 ? '#f87171' : '#f59e0b' }}
                title="Replenishes 10 per turn. Used to engage member states."
              >
                {pc} / 100
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ background: '#0d1f2d' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pc}%`, background: pc < 30 ? '#dc2626' : '#f59e0b' }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: '#4b5563' }}>
              Replenishes 10/turn · Costs {PC_COST_ENGAGE} PC to engage a member state
            </p>
          </div>

          {/* Allocation sliders */}
          {SLIDER_CONFIG.map(({ key, label, color, description, effect }) => {
            const val = draft[key]
            const effectText = effect(val)
            const isWarning = key === 'troopReadiness' && val < 20
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: '#e8edf2' }}>
                    {label}
                  </span>
                  <span className="text-sm font-bold tabular-nums" style={{ color }}>
                    {val}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) => setDraft((prev) => adjustDraft(prev, key, Number(e.target.value)))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: color }}
                />
                <p className="text-xs mt-1" style={{ color: '#4b5563' }}>
                  {description}
                </p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: isWarning ? '#f87171' : color }}>
                  {effectText}
                </p>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex-shrink-0 space-y-3"
          style={{ borderTop: '1px solid #1e3a5f' }}
        >
          {/* Total bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                Total allocation
              </span>
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: overBudget ? '#f87171' : '#4ade80' }}
              >
                {total} / 100
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ background: '#0d1f2d' }}>
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${Math.min(100, total)}%`,
                  background: overBudget ? '#dc2626' : '#16a34a',
                }}
              />
            </div>
            {overBudget && (
              <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                Over budget — reduce allocations
              </p>
            )}
          </div>

          {/* Apply button */}
          <button
            onClick={handleApply}
            disabled={overBudget}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: overBudget ? '#1e3a5f' : '#2563eb',
              color:      overBudget ? '#4b5563' : '#fff',
              cursor:     overBudget ? 'not-allowed' : 'pointer',
            }}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  )
}
