'use client'

import { useGameStore, selectAllianceReadiness } from '@/lib/gameState'

function StatBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full w-full" style={{ background: '#0d1f2d' }}>
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

export default function Sidebar() {
  const turn = useGameStore((s) => s.turn)
  const year = useGameStore((s) => s.year)
  const quarter = useGameStore((s) => s.quarter)
  const approvalRating = useGameStore((s) => s.approvalRating)
  const countries = useGameStore((s) => s.countries)
  const advanceTurn = useGameStore((s) => s.advanceTurn)

  const allianceReadiness = useGameStore((s) => selectAllianceReadiness(s.countries))
  const memberCount = Object.values(countries).filter((c) => c.alignment === 'nato').length

  const nextQ = quarter === 4 ? 1 : quarter + 1
  const nextYear = quarter === 4 ? year + 1 : year

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0"
      style={{ width: 280, background: '#152840', borderRight: '1px solid #1e3a5f' }}
    >
      {/* Top — identity */}
      <div className="p-6 pb-4" style={{ borderBottom: '1px solid #1e3a5f' }}>
        <div
          className="text-3xl font-black tracking-widest mb-1"
          style={{ color: '#2563eb' }}
        >
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
      <div className="flex-1 p-6 space-y-6">
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
          <StatBar value={approvalRating} color={approvalColor(approvalRating)} />
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
          <StatBar value={allianceReadiness} color={readinessColor(allianceReadiness)} />
        </div>

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
      </div>

      {/* Bottom — end turn */}
      <div className="p-6" style={{ borderTop: '1px solid #1e3a5f' }}>
        <button
          onClick={advanceTurn}
          className="w-full rounded-lg py-3 font-semibold text-sm transition-colors"
          style={{ background: '#2563eb', color: '#fff' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#2563eb')}
        >
          End Turn
        </button>
        <p className="text-center text-xs mt-2" style={{ color: '#4b5563' }}>
          Advancing to Q{nextQ} {nextYear}…
        </p>
      </div>
    </aside>
  )
}
