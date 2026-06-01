'use client'

import { useState, useEffect, useMemo } from 'react'
import { useGameStore, type BudgetAllocation } from '@/lib/gameState'
import { PC_COST_ENGAGE, PC_MAX, pcReplenishFor, BUDGET_TUNABLES as T } from '@/lib/constants'
import {
  computeReadinessDelta,
  computeSatisfactionDelta,
  computeThreatDelta,
} from '@/lib/budgetHelpers'
import { rdMultiplier } from '@/lib/turnEngine'
import { X, AlertTriangle, Lightbulb } from 'lucide-react'

const ALLOCATION_KEYS: Array<keyof BudgetAllocation> = [
  'troopReadiness', 'RAndD', 'cyberDefence', 'partnerAid', 'communications',
]

interface SliderMeta {
  key: keyof BudgetAllocation
  label: string
  color: string
  description: string
}

const SLIDER_META: SliderMeta[] = [
  {
    key: 'troopReadiness',
    label: 'Troop Readiness',
    color: '#004990',
    description: 'Drives readiness improvement across all NATO members each turn.',
  },
  {
    key: 'RAndD',
    label: 'R&D',
    color: '#6d28d9',
    description: 'Technology investment; multiplies the impact of crisis resolution options.',
  },
  {
    key: 'cyberDefence',
    label: 'Cyber Defence',
    color: '#0f766e',
    description: 'Suppresses threat levels across all NATO members each turn; reduces hybrid attack frequency.',
  },
  {
    key: 'partnerAid',
    label: 'Partner Aid',
    color: '#b45309',
    description: 'Builds accession momentum for candidates; eases fiscal pressure on stretched members.',
  },
  {
    key: 'communications',
    label: 'Communications',
    color: '#15803d',
    description: 'Boosts alliance satisfaction; suppresses domestic political crises.',
  },
]

function fmtSigned(n: number, digits = 1): string {
  if (Math.abs(n) < 0.05) return '0'
  const sign = n > 0 ? '+' : '−'
  return `${sign}${Math.abs(n).toFixed(digits)}`
}

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
  const difficulty        = useGameStore((s) => s.difficulty)
  const countries         = useGameStore((s) => s.countries)
  const setFullAllocation = useGameStore((s) => s.setFullAllocation)
  const pcPerTurn         = pcReplenishFor(difficulty)
  const memberEngagements = budgetState.memberEngagements

  const [draft, setDraft] = useState<BudgetAllocation>(budgetState.allocation)

  // Sync draft to committed allocation whenever the panel opens
  useEffect(() => {
    if (isOpen) setDraft(budgetState.allocation)
  }, [isOpen, budgetState.allocation])

  // Live per-turn projections. Mirrors the math in turnEngine.applyPassiveChanges
  // by reusing the budgetHelpers exports.
  const projection = useMemo(() => {
    const nato       = Object.values(countries).filter((c) => c.alignment === 'nato')
    const candidates = Object.values(countries).filter((c) => c.alignment === 'candidate')
    const stretched  = nato.filter((c) => c.fiscalPressure > 40)
    const engaged    = nato.filter((c) => (memberEngagements[c.id] ?? 0) > 0)

    const readinessDeltas = nato.map((c) => computeReadinessDelta(c, draft))
    const avgReadiness    = readinessDeltas.length
      ? readinessDeltas.reduce((s, x) => s + x, 0) / readinessDeltas.length
      : 0
    const avgReadinessNow = nato.length
      ? nato.reduce((s, c) => s + c.readiness, 0) / nato.length
      : 0

    const threatDeltas  = nato.map((c) => computeThreatDelta(c, draft))
    const avgThreat     = threatDeltas.length
      ? threatDeltas.reduce((s, x) => s + x, 0) / threatDeltas.length
      : 0
    const totalThreat   = threatDeltas.reduce((s, x) => s + x, 0)

    const engagedSat = engaged.length
      ? engaged.reduce(
          (s, c) => s + computeSatisfactionDelta(c, draft, true, turn),
          0,
        ) / engaged.length
      : 0
    const nonEngagedCap = 0.5 + draft.communications / T.commsBaselineDivisor

    return {
      natoCount:       nato.length,
      candidatesCount: candidates.length,
      stretchedCount:  stretched.length,
      engagedCount:    engaged.length,
      avgReadiness,
      avgReadinessNow,
      avgThreat,
      totalThreat,
      engagedSat,
      nonEngagedCap,
      fiscalReduction: draft.partnerAid / T.partnerAidFiscalDivisor,
      accessionGain:   draft.partnerAid / T.partnerAidAccessionDivisor,
    }
  }, [draft, countries, memberEngagements, turn])

  if (!isOpen) return null

  const total = ALLOCATION_KEYS.reduce((sum, k) => sum + draft[k], 0)
  const pc    = budgetState.totalPoliticalCapital
  const overBudget = total > 100

  // Map a slider key to its current projected-effect string and a "vs current"
  // delta string when the draft differs from the committed allocation.
  function projectionFor(key: keyof BudgetAllocation): { text: string; delta: string | null; warning?: boolean } {
    const v = draft[key]
    const committed = budgetState.allocation[key]
    const changed = v !== committed

    let text: string
    let warning = false
    switch (key) {
      case 'troopReadiness': {
        // Goal-tied: 75 is the win line, 20 the loss line. Frame the trajectory.
        const now = Math.round(projection.avgReadinessNow)
        if (v < T.readinessStarveThreshold) {
          text = `Starved — readiness bleeds ${T.readinessStarvePenalty}/turn toward the 20 loss line (now ${now})`
          warning = true
        } else if (v < T.readinessLeanThreshold) {
          text = `Lean — ${fmtSigned(projection.avgReadiness)}/turn (damped); now ${now}, win line 75`
        } else {
          text = `${fmtSigned(projection.avgReadiness)} avg readiness/turn · now ${now} → 75 win line`
        }
        break
      }
      case 'RAndD': {
        const m = rdMultiplier(v)
        text = `Current crises resolve ×${m.toFixed(2)} stronger (R&D force multiplier)`
        break
      }
      case 'cyberDefence':
        if (v < T.cyberCreepThreshold) {
          text = `Starved — threat creeps UP and hybrid attacks grow more frequent`
          warning = true
        } else {
          text = `${fmtSigned(projection.avgThreat)} threat/turn per member · ${fmtSigned(projection.totalThreat, 0)} total/turn`
        }
        break
      case 'partnerAid':
        text = projection.stretchedCount > 0
          ? `−${projection.fiscalReduction.toFixed(2)} fiscal pressure on ${projection.stretchedCount} stretched · +${projection.accessionGain.toFixed(2)} accession/turn × ${projection.candidatesCount}`
          : `+${projection.accessionGain.toFixed(2)} accession score/turn for ${projection.candidatesCount} candidates`
        break
      case 'communications':
        if (v < T.commsDecayThreshold) {
          text = `Starved — satisfaction decays alliance-wide, feeding domestic crises`
          warning = true
        } else {
          text = projection.engagedCount > 0
            ? `${fmtSigned(projection.engagedSat)} satisfaction/turn on ${projection.engagedCount} engaged · ±${projection.nonEngagedCap.toFixed(2)} baseline drift cap on others`
            : `±${projection.nonEngagedCap.toFixed(2)} satisfaction baseline drift cap (no engaged members)`
        }
        break
      default:
        text = ''
    }

    const delta = changed ? ` (was ${committed}, now ${v})` : null
    return { text, delta, warning }
  }

  function handleApply() {
    setFullAllocation(draft)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          width: 520,
          maxHeight: '90vh',
          background: '#fafaf9',
          border: '1px solid #e7e5e0',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid #e7e5e0', background: '#f5f3ef' }}
        >
          <div>
            <p
              className="text-xs font-black uppercase tracking-widest mb-1"
              style={{ color: '#a8a29e', letterSpacing: '0.2em' }}
            >
              Treasury
            </p>
            <h2
              className="font-serif font-semibold tracking-tight"
              style={{ fontSize: 20, color: '#1c1917', letterSpacing: '-0.01em' }}
            >
              Alliance Budget Allocation
            </h2>
            <p className="text-xs mt-1 tabular-nums" style={{ color: '#78716c' }}>
              Turn {turn} · Q{quarter} {year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full flex items-center justify-center transition-colors"
            style={{ width: 28, height: 28, background: 'transparent', color: '#78716c', border: '1px solid #e7e5e0' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#fafaf9'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#1c1917'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#78716c'
            }}
            aria-label="Close budget panel"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Political Capital */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider" style={{ color: '#78716c' }}>
                <Lightbulb size={12} strokeWidth={2} />
                Political Capital
              </span>
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: pc < 30 ? '#dc2626' : '#b45309' }}
                title={`Replenishes ${pcPerTurn} per turn, up to a ${PC_MAX} cap. Bank it for costly crisis decisions.`}
              >
                {pc} / {PC_MAX}
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ background: '#e7e5e0' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (pc / PC_MAX) * 100)}%`, background: pc < 30 ? '#dc2626' : '#b45309' }}
              />
            </div>
            <p className="text-xs mt-1 tabular-nums" style={{ color: '#a8a29e' }}>
              Replenishes {pcPerTurn}/turn (cap {PC_MAX}) · Costs {PC_COST_ENGAGE} PC to engage a member state
            </p>
          </div>

          {/* Allocation sliders */}
          {SLIDER_META.map(({ key, label, color, description }) => {
            const val = draft[key]
            const { text: effectText, delta, warning } = projectionFor(key)
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: '#1c1917' }}>
                    {label}
                  </span>
                  <span className="text-sm font-bold tabular-nums" style={{ color }}>
                    {val}
                    {delta && (
                      <span className="ml-1 font-normal" style={{ color: '#a8a29e' }}>
                        {delta}
                      </span>
                    )}
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
                <p className="text-xs mt-1" style={{ color: '#78716c' }}>
                  {description}
                </p>
                <p className="flex items-center gap-1 text-xs mt-0.5 font-medium" style={{ color: warning ? '#dc2626' : color }}>
                  {warning && <AlertTriangle size={11} strokeWidth={2.25} />}
                  {effectText}
                </p>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex-shrink-0 space-y-3"
          style={{ borderTop: '1px solid #e7e5e0', background: '#f5f3ef' }}
        >
          {/* Total bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#78716c' }}>
                Total allocation
              </span>
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: overBudget ? '#dc2626' : '#15803d' }}
              >
                {total} / 100
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ background: '#e7e5e0' }}>
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${Math.min(100, total)}%`,
                  background: overBudget ? '#dc2626' : '#15803d',
                }}
              />
            </div>
            {overBudget && (
              <p className="flex items-center gap-1 text-xs mt-1" style={{ color: '#dc2626' }}>
                <AlertTriangle size={11} strokeWidth={2.25} />
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
              background: overBudget ? '#f0ede7' : '#004990',
              color:      overBudget ? '#a8a29e' : '#fff',
              cursor:     overBudget ? 'not-allowed' : 'pointer',
              boxShadow:  overBudget ? 'none' : '0 1px 2px rgba(0, 73, 144, 0.18), 0 2px 4px rgba(0, 73, 144, 0.12)',
            }}
            onMouseEnter={(e) => {
              if (!overBudget) (e.currentTarget as HTMLButtonElement).style.background = '#003a78'
            }}
            onMouseLeave={(e) => {
              if (!overBudget) (e.currentTarget as HTMLButtonElement).style.background = '#004990'
            }}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  )
}
