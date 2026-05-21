'use client'

import { useState } from 'react'
import type { Difficulty } from '@/lib/gameState'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NewGameConfig {
  scenarioMode: 'historical' | 'alternate'
  difficulty: Difficulty
}

interface Props {
  onStart: (config: NewGameConfig) => void
}

// ── Scenario mode config ──────────────────────────────────────────────────────

const SCENARIO_MODES: {
  id: 'historical' | 'alternate'
  label: string
  tag: string
  description: string
  note: string
}[] = [
  {
    id: 'historical',
    label: 'Historical (2024)',
    tag: 'Default',
    description:
      'Finland and Sweden are NATO members. Begin with the alliance as it stands today.',
    note: '32 member states · Full Nordic coverage',
  },
  {
    id: 'alternate',
    label: 'Alternate History',
    tag: 'Scenario',
    description:
      'Finland and Sweden have not yet joined. Face the Nordic Question and shape the alliance\'s future.',
    note: '30 member states · Nordic expansion available',
  },
]

// ── Difficulty config ─────────────────────────────────────────────────────────

const DIFFICULTIES: {
  id: Difficulty
  label: string
  badge: string
  badgeColor: string
  bullets: string[]
}[] = [
  {
    id: 'diplomat',
    label: 'Diplomat',
    badge: 'Easy',
    badgeColor: '#4ade80',
    bullets: [
      '+15 political capital per turn',
      'Crises have 1 extra turn to resolve',
      'Approval rating less volatile',
    ],
  },
  {
    id: 'normal',
    label: 'Secretary General',
    badge: 'Normal',
    badgeColor: '#93c5fd',
    bullets: [
      '+10 political capital per turn',
      'Standard crisis timers',
      'Default approval mechanics',
    ],
  },
  {
    id: 'crisis',
    label: 'Crisis Mode',
    badge: 'Hard',
    badgeColor: '#f87171',
    bullets: [
      '+8 political capital per turn',
      'Crises have 1 fewer turn to resolve',
      'Fiscal pressure grows 10% faster',
      'Adversary tension starts at 50',
    ],
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: '#1e3a5f' }} />
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-black uppercase tracking-widest"
      style={{ color: '#374151', letterSpacing: '0.22em' }}
    >
      {children}
    </p>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NewGameModal({ onStart }: Props) {
  const [scenarioMode, setScenarioMode] = useState<'historical' | 'alternate'>('historical')
  const [difficulty,   setDifficulty]   = useState<Difficulty>('normal')

  return (
    <div
      className="fixed inset-0 z-[300] overflow-y-auto"
      style={{ background: '#060f1a' }}
    >
      <div
        className="mx-auto py-12 px-6"
        style={{ maxWidth: 720 }}
      >

        {/* ── Header ── */}
        <div className="mb-10">
          <p
            className="text-xs font-black uppercase tracking-widest mb-3"
            style={{ color: '#374151', letterSpacing: '0.25em' }}
          >
            NATO Secretary General
          </p>
          <h1
            className="font-black mb-1"
            style={{ fontSize: 34, color: '#e8edf2', letterSpacing: '-0.02em' }}
          >
            Configure your term
          </h1>
          <p className="text-sm" style={{ color: '#4b5563' }}>
            Set your starting conditions before you take office.
          </p>
        </div>

        <Divider />

        {/* ── Section 1: Start Year ── */}
        <div className="py-8">
          <SectionLabel>Start Year</SectionLabel>
          <div className="mt-4 flex items-center gap-6">
            <div
              className="rounded-lg px-6 py-4"
              style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}
            >
              <p
                className="font-black tabular-nums"
                style={{ fontSize: 32, color: '#e8edf2', letterSpacing: '-0.02em' }}
              >
                2024
              </p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#4b5563', maxWidth: 340 }}>
              Your term begins in January 2024.{' '}
              <span style={{ color: '#374151' }}>
                Additional start years coming in future updates.
              </span>
            </p>
          </div>
        </div>

        <Divider />

        {/* ── Section 2: Scenario Mode ── */}
        <div className="py-8">
          <SectionLabel>Scenario Mode</SectionLabel>
          <p className="text-xs mt-1 mb-5" style={{ color: '#4b5563' }}>
            Determines the starting composition of the alliance.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {SCENARIO_MODES.map((mode) => {
              const selected = scenarioMode === mode.id
              return (
                <button
                  key={mode.id}
                  onClick={() => setScenarioMode(mode.id)}
                  className="text-left rounded-xl p-5 transition-all"
                  style={{
                    background:  selected ? '#0f2347' : '#0d1f2d',
                    border:      `2px solid ${selected ? '#2563eb' : '#1e3a5f'}`,
                    cursor:      'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb'
                      ;(e.currentTarget as HTMLButtonElement).style.background  = '#0d2040'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#1e3a5f'
                      ;(e.currentTarget as HTMLButtonElement).style.background  = '#0d1f2d'
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        background: selected ? '#1d4ed8' : '#0a1929',
                        color:      selected ? '#93c5fd' : '#374151',
                        border:     `1px solid ${selected ? '#2563eb' : '#1e3a5f'}`,
                      }}
                    >
                      {mode.tag}
                    </span>
                    {selected && (
                      <span style={{ color: '#4ade80', fontSize: 16 }}>✓</span>
                    )}
                  </div>
                  <p
                    className="font-bold mb-2"
                    style={{ fontSize: 15, color: selected ? '#e8edf2' : '#9ca3af' }}
                  >
                    {mode.label}
                  </p>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: selected ? '#7dd3fc' : '#6b7280' }}>
                    {mode.description}
                  </p>
                  <p className="text-xs" style={{ color: '#374151', fontSize: 10 }}>
                    {mode.note}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <Divider />

        {/* ── Section 3: Difficulty ── */}
        <div className="py-8">
          <SectionLabel>Difficulty</SectionLabel>
          <p className="text-xs mt-1 mb-5" style={{ color: '#4b5563' }}>
            Affects political capital income, crisis pressure, and alliance stability.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {DIFFICULTIES.map((diff) => {
              const selected = difficulty === diff.id
              return (
                <button
                  key={diff.id}
                  onClick={() => setDifficulty(diff.id)}
                  className="text-left rounded-xl p-4 transition-all"
                  style={{
                    background: selected ? '#0f2347' : '#0d1f2d',
                    border:     `2px solid ${selected ? '#2563eb' : '#1e3a5f'}`,
                    cursor:     'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb'
                      ;(e.currentTarget as HTMLButtonElement).style.background  = '#0d2040'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#1e3a5f'
                      ;(e.currentTarget as HTMLButtonElement).style.background  = '#0d1f2d'
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-black"
                      style={{ color: diff.badgeColor }}
                    >
                      {diff.badge}
                    </span>
                    {selected && (
                      <span style={{ color: '#4ade80', fontSize: 14 }}>✓</span>
                    )}
                  </div>
                  <p
                    className="font-bold mb-3"
                    style={{ fontSize: 13, color: selected ? '#e8edf2' : '#9ca3af' }}
                  >
                    {diff.label}
                  </p>
                  <ul className="space-y-1">
                    {diff.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-1.5"
                        style={{ color: selected ? '#6b7280' : '#374151' }}
                      >
                        <span style={{ fontSize: 7, lineHeight: 2, flexShrink: 0 }}>●</span>
                        <span className="text-xs leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
        </div>

        <Divider />

        {/* ── Footer ── */}
        <div className="pt-8 flex justify-end">
          <button
            onClick={() => onStart({ scenarioMode, difficulty })}
            className="rounded-lg px-10 py-3.5 text-sm font-semibold transition-colors"
            style={{ background: '#2563eb', color: '#fff' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#2563eb')}
          >
            Begin Term
          </button>
        </div>

      </div>
    </div>
  )
}
