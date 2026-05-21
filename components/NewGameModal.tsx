'use client'

import { useState } from 'react'
import type { Difficulty } from '@/lib/gameState'
import { pcReplenishFor } from '@/lib/constants'
import { Check, Circle } from 'lucide-react'

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
    badgeColor: '#15803d',
    bullets: [
      `+${pcReplenishFor('diplomat')} political capital per turn`,
      'Crises have 1 extra turn to resolve',
      'Approval rating less volatile',
    ],
  },
  {
    id: 'normal',
    label: 'Secretary General',
    badge: 'Normal',
    badgeColor: '#004990',
    bullets: [
      `+${pcReplenishFor('normal')} political capital per turn`,
      'Standard crisis timers',
      'Default approval mechanics',
    ],
  },
  {
    id: 'crisis',
    label: 'Crisis Mode',
    badge: 'Hard',
    badgeColor: '#b91c1c',
    bullets: [
      `+${pcReplenishFor('crisis')} political capital per turn`,
      'Crises have 1 fewer turn to resolve',
      'Fiscal pressure grows 10% faster',
      'Adversary tension starts at 50',
    ],
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: '#e7e5e0' }} />
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-black uppercase tracking-widest"
      style={{ color: '#a8a29e', letterSpacing: '0.22em' }}
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
      style={{ background: '#f5f3ef' }}
    >
      <div
        className="mx-auto py-12 px-6"
        style={{ maxWidth: 720 }}
      >

        {/* ── Header ── */}
        <div className="mb-10">
          <p
            className="text-xs font-black uppercase tracking-widest mb-3"
            style={{ color: '#a8a29e', letterSpacing: '0.25em' }}
          >
            NATO Secretary General
          </p>
          <h1
            className="font-serif font-bold mb-2 tracking-tight"
            style={{ fontSize: 38, color: '#1c1917', letterSpacing: '-0.02em', lineHeight: 1.05 }}
          >
            Configure your term
          </h1>
          <p className="text-sm" style={{ color: '#57534e' }}>
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
              style={{
                background: '#fafaf9',
                border: '1px solid #e7e5e0',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <p
                className="font-serif font-bold tabular-nums"
                style={{ fontSize: 38, color: '#004990', letterSpacing: '-0.02em', lineHeight: 1 }}
              >
                2024
              </p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#57534e', maxWidth: 340 }}>
              Your term begins in January 2024.{' '}
              <span style={{ color: '#a8a29e' }}>
                Additional start years coming in future updates.
              </span>
            </p>
          </div>
        </div>

        <Divider />

        {/* ── Section 2: Scenario Mode ── */}
        <div className="py-8">
          <SectionLabel>Scenario Mode</SectionLabel>
          <p className="text-xs mt-1 mb-5" style={{ color: '#78716c' }}>
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
                    background:  selected ? '#e0eaf5' : '#fafaf9',
                    border:      `2px solid ${selected ? '#004990' : '#e7e5e0'}`,
                    cursor:      'pointer',
                    boxShadow:   selected ? '0 2px 4px rgba(0, 73, 144, 0.08)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#004990'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        background: selected ? '#004990' : '#f0ede7',
                        color:      selected ? '#fff' : '#78716c',
                        border:     `1px solid ${selected ? '#004990' : '#e7e5e0'}`,
                      }}
                    >
                      {mode.tag}
                    </span>
                    {selected && (
                      <Check size={16} strokeWidth={2.5} color="#15803d" />
                    )}
                  </div>
                  <p
                    className="font-serif font-semibold mb-2 tracking-tight"
                    style={{ fontSize: 17, color: selected ? '#1c1917' : '#1c1917', letterSpacing: '-0.01em' }}
                  >
                    {mode.label}
                  </p>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: selected ? '#003a78' : '#57534e' }}>
                    {mode.description}
                  </p>
                  <p className="text-xs tabular-nums" style={{ color: '#a8a29e', fontSize: 10 }}>
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
          <p className="text-xs mt-1 mb-5" style={{ color: '#78716c' }}>
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
                    background: selected ? '#e0eaf5' : '#fafaf9',
                    border:     `2px solid ${selected ? '#004990' : '#e7e5e0'}`,
                    cursor:     'pointer',
                    boxShadow:  selected ? '0 2px 4px rgba(0, 73, 144, 0.08)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#004990'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-black uppercase tracking-wider"
                      style={{ color: diff.badgeColor }}
                    >
                      {diff.badge}
                    </span>
                    {selected && (
                      <Check size={14} strokeWidth={2.5} color="#15803d" />
                    )}
                  </div>
                  <p
                    className="font-serif font-semibold mb-3 tracking-tight"
                    style={{ fontSize: 15, color: '#1c1917', letterSpacing: '-0.01em' }}
                  >
                    {diff.label}
                  </p>
                  <ul className="space-y-1.5">
                    {diff.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-1.5"
                        style={{ color: selected ? '#57534e' : '#78716c' }}
                      >
                        <Circle size={5} fill="#a8a29e" strokeWidth={0} style={{ marginTop: 6, flexShrink: 0 }} />
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
            style={{
              background: '#004990',
              color: '#fff',
              boxShadow: '0 1px 2px rgba(0, 73, 144, 0.18), 0 2px 4px rgba(0, 73, 144, 0.12)',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#003a78')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#004990')}
          >
            Begin Term
          </button>
        </div>

      </div>
    </div>
  )
}
