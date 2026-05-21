'use client'

import { useState } from 'react'
import {
  useGameStore,
  type AccessionProcess,
  type AccessionStage,
  type Country,
  type GameState,
} from '@/lib/gameState'
import { computeAccessionScore } from '@/lib/accessionHelpers'
import { PC_COST_DIALOGUE, PC_COST_ADVANCE_ACCESSION } from '@/lib/constants'

// ─── Stage display config ────────────────────────────────────────────────────

const STAGE_CONFIG: Record<AccessionStage, { label: string; color: string; bg: string }> = {
  none:       { label: 'None',       color: '#6b7280', bg: '#1f2937' },
  dialogue:   { label: 'Dialogue',   color: '#9ca3af', bg: '#374151' },
  map:        { label: 'MAP',        color: '#f59e0b', bg: '#451a03' },
  invitation: { label: 'Invitation', color: '#93c5fd', bg: '#1e3a5f' },
  acceding:   { label: 'Acceding',   color: '#4ade80', bg: '#14532d' },
}

const ADVANCE_LABEL: Partial<Record<AccessionStage, string>> = {
  dialogue:   'Advance to MAP Stage',
  map:        'Extend Invitation',
  invitation: 'Call Member Vote',
}

// ─── Shared primitives ───────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#4ade80' : score >= 50 ? '#f59e0b' : '#3b82f6'
  return (
    <div className="h-1.5 w-full rounded-full" style={{ background: '#0a1929' }} title={`Accession score: ${score} / 100`}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  )
}

function StageBadge({ stage }: { stage: AccessionStage }) {
  const { label, color, bg } = STAGE_CONFIG[stage]
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}

// ─── Vote breakdown ──────────────────────────────────────────────────────────

function VoteBreakdown({
  votes,
  countries,
}: {
  votes: Record<string, 'yes' | 'no' | 'abstain' | 'pending'>
  countries: Record<string, Country>
}) {
  const entries      = Object.entries(votes)
  const yesCount     = entries.filter(([, v]) => v === 'yes').length
  const abstCount    = entries.filter(([, v]) => v === 'abstain').length
  const noVoters     = entries.filter(([, v]) => v === 'no')
  const pendingCount = entries.filter(([, v]) => v === 'pending').length

  return (
    <div className="mt-2 rounded p-2.5 space-y-1.5" style={{ background: '#0a1929' }}>
      <div className="flex gap-3 flex-wrap text-xs font-medium">
        <span style={{ color: '#4ade80' }}>✓ {yesCount} yes</span>
        <span style={{ color: '#9ca3af' }}>– {abstCount} abstain</span>
        <span style={{ color: noVoters.length ? '#f87171' : '#4b5563' }}>
          ✕ {noVoters.length} no
        </span>
        {pendingCount > 0 && (
          <span style={{ color: '#6b7280' }}>⟳ {pendingCount} pending</span>
        )}
      </div>
      {noVoters.length > 0 && (
        <p className="text-xs" style={{ color: '#f87171' }}>
          Blocking: {noVoters.map(([id]) => countries[id]?.name ?? id).join(', ')}
        </p>
      )}
    </div>
  )
}

// ─── Active process card ─────────────────────────────────────────────────────

function ProcessCard({
  process,
  countries,
  pc,
  onAdvance,
  onFinalise,
}: {
  process: AccessionProcess
  countries: Record<string, Country>
  pc: number
  onAdvance: () => void
  onFinalise: () => void
}) {
  const country     = countries[process.countryId]
  const { stage, score, turnsInStage, memberVotes, adversaryReactionTriggered } = process
  const natoCount   = Object.values(countries).filter((c) => c.alignment === 'nato').length

  const canAfford    = pc >= PC_COST_ADVANCE_ACCESSION
  const scoreGate    = stage === 'map' && score < 80
  const advDisabled  = !canAfford || scoreGate
  const advLabel     = ADVANCE_LABEL[stage]
  const hasVotes     = Object.keys(memberVotes).length > 0
  const voteVals     = Object.values(memberVotes)
  const hasPending   = voteVals.some((v) => v === 'pending')
  const hasNo        = voteVals.some((v) => v === 'no')
  const isBlocked    = hasVotes && hasNo
  const canFinalise  = stage === 'acceding' && hasVotes && !hasPending && !hasNo

  function requirementText(): string {
    if (stage === 'dialogue') return `${PC_COST_ADVANCE_ACCESSION} PC required · No score gate`
    if (stage === 'map') {
      if (score >= 80) return `Score ${score}/100 — requirement met`
      return `Score ${score}/100 — need 80 to extend invitation`
    }
    if (stage === 'invitation') return `${PC_COST_ADVANCE_ACCESSION} PC · ${natoCount} member votes required`
    return ''
  }

  return (
    <div
      className="rounded-lg p-4 space-y-3"
      style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm" style={{ color: '#e8edf2' }}>
          {country?.name ?? process.countryId}
        </span>
        <StageBadge stage={stage} />
      </div>

      {/* Score bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6b7280' }}>
          <span>Accession score</span>
          <span style={{ color: score >= 80 ? '#4ade80' : '#e8edf2' }}>{score} / 100</span>
        </div>
        <ScoreBar score={score} />
      </div>

      {/* Meta */}
      <div className="flex gap-4 text-xs" style={{ color: '#6b7280' }}>
        <span>{turnsInStage} turn{turnsInStage !== 1 ? 's' : ''} in stage</span>
        <span style={{ color: scoreGate ? '#f87171' : '#6b7280' }}>
          {requirementText()}
        </span>
      </div>

      {/* Adversary warning */}
      {adversaryReactionTriggered && (
        <p className="text-xs" style={{ color: '#f87171' }}>
          ⚠ Adversary reaction triggered — expect increased regional tension
        </p>
      )}

      {/* Vote breakdown for invitation (blocked) or acceding */}
      {(stage === 'invitation' || stage === 'acceding') && hasVotes && (
        <VoteBreakdown votes={memberVotes} countries={countries} />
      )}

      {/* Actions */}
      {stage === 'acceding' ? (
        <button
          onClick={onFinalise}
          disabled={!canFinalise}
          className="w-full rounded py-2 text-xs font-semibold"
          style={{
            background: canFinalise ? '#16a34a' : '#1e3a5f',
            color:      canFinalise ? '#fff' : '#4b5563',
            cursor:     canFinalise ? 'pointer' : 'not-allowed',
          }}
        >
          {canFinalise
            ? 'Finalise Accession'
            : hasPending
              ? `Ratification in progress — ${voteVals.filter((v) => v === 'pending').length} votes pending`
              : 'Awaiting unanimous ratification'}
        </button>
      ) : advLabel ? (
        <div className="space-y-1">
          <button
            onClick={onAdvance}
            disabled={advDisabled}
            title={
              !canAfford  ? `Insufficient political capital — need ${PC_COST_ADVANCE_ACCESSION} PC` :
              scoreGate   ? `Score 80 required to advance (current: ${score})` :
              `${advLabel} — costs ${PC_COST_ADVANCE_ACCESSION} PC`
            }
            className="w-full rounded py-2 text-xs font-semibold"
            style={{
              background: advDisabled ? '#1e3a5f' : '#2563eb',
              color:      advDisabled ? '#4b5563' : '#fff',
              cursor:     advDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {advLabel}
          </button>
          {!canAfford && (
            <p className="text-xs text-center" style={{ color: '#f87171' }}>
              Insufficient political capital
            </p>
          )}
          {isBlocked && stage === 'invitation' && (
            <p className="text-xs text-center" style={{ color: '#fbbf24' }}>
              Engage blocking members and retry
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ─── Candidate / partner row ─────────────────────────────────────────────────

function CountryRow({
  country,
  score,
  pc,
  onBeginDialogue,
}: {
  country: Country
  score: number
  pc: number
  onBeginDialogue: () => void
}) {
  const canAfford = pc >= PC_COST_DIALOGUE
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{ background: '#0d1f2d', border: '1px solid #1a2f47' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium truncate" style={{ color: '#e8edf2' }}>
            {country.name}
          </span>
          <span className="text-xs tabular-nums flex-shrink-0" style={{ color: score >= 80 ? '#4ade80' : '#9ca3af' }}>
            {score}
          </span>
        </div>
        <p className="text-xs truncate" style={{ color: '#6b7280' }}>{country.notes}</p>
      </div>
      <button
        onClick={onBeginDialogue}
        disabled={!canAfford}
        title={canAfford ? `Begin Dialogue — costs ${PC_COST_DIALOGUE} PC` : `Insufficient political capital — need ${PC_COST_DIALOGUE} PC`}
        className="flex-shrink-0 rounded px-2.5 py-1.5 text-xs font-medium"
        style={{
          background: canAfford ? '#1e3a5f' : '#111f2e',
          color:      canAfford ? '#93c5fd'  : '#374151',
          cursor:     canAfford ? 'pointer'  : 'not-allowed',
        }}
      >
        Begin Dialogue
      </button>
    </div>
  )
}

// ─── Main panel ──────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function AccessionPanel({ isOpen, onClose }: Props) {
  const [partnersOpen, setPartnersOpen] = useState(false)

  const countries          = useGameStore((s) => s.countries)
  const accessionProcesses = useGameStore((s) => s.accessionProcesses)
  const pc                 = useGameStore((s) => s.budgetState.totalPoliticalCapital)
  const allocation         = useGameStore((s) => s.budgetState.allocation)
  const advanceAccession   = useGameStore((s) => s.advanceAccession)
  const finaliseAccession  = useGameStore((s) => s.finaliseAccession)
  const initiateDialogue   = useGameStore((s) => s.initiateDialogue)

  if (!isOpen) return null

  // Minimal state snapshot for computeAccessionScore
  const stateForScore = {
    accessionProcesses,
    budgetState: { allocation },
  } as unknown as GameState

  const activeProcesses = Object.values(accessionProcesses)

  const candidates = Object.values(countries)
    .filter((c) => c.alignment === 'candidate' && !accessionProcesses[c.id])

  const neutralPartners = Object.values(countries)
    .filter((c) => c.alignment === 'neutral' && !accessionProcesses[c.id])
    .map((c) => ({ country: c, score: computeAccessionScore(c, stateForScore) }))
    .sort((a, b) => b.score - a.score)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          width: 580,
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
              Alliance Expansion
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              Manage accession processes and partnerships
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold" style={{ color: pc < 30 ? '#f87171' : '#f59e0b' }}>
              💡 {pc} / 100 PC
            </span>
            <button
              onClick={onClose}
              className="rounded-full flex items-center justify-center text-sm font-bold"
              style={{ width: 28, height: 28, background: '#1e3a5f', color: '#9ca3af' }}
              aria-label="Close expansion panel"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Section 1: Active processes ── */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
              Active Processes
              {activeProcesses.length > 0 && (
                <span className="ml-2 normal-case font-normal" style={{ color: '#4b5563' }}>
                  ({activeProcesses.length})
                </span>
              )}
            </p>
            {activeProcesses.length === 0 ? (
              <div className="space-y-1">
                <p className="text-sm" style={{ color: '#6b7280' }}>No active accession processes.</p>
                <p className="text-xs" style={{ color: '#374151' }}>
                  Open a candidate&apos;s country panel to begin dialogue.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeProcesses.map((proc) => (
                  <ProcessCard
                    key={proc.countryId}
                    process={proc}
                    countries={countries}
                    pc={pc}
                    onAdvance={() => advanceAccession(proc.countryId)}
                    onFinalise={() => finaliseAccession(proc.countryId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Section 2: Formal candidates ── */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
              Accession Candidates
            </p>
            {candidates.length === 0 ? (
              <p className="text-sm" style={{ color: '#4b5563' }}>
                All formal candidates have active processes.
              </p>
            ) : (
              <div className="space-y-2">
                {candidates.map((c) => (
                  <CountryRow
                    key={c.id}
                    country={c}
                    score={computeAccessionScore(c, stateForScore)}
                    pc={pc}
                    onBeginDialogue={() => initiateDialogue(c.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Section 3: Potential partners (neutral, collapsed) ── */}
          <div>
            <button
              onClick={() => setPartnersOpen((o) => !o)}
              className="flex items-center justify-between w-full mb-1"
            >
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                Potential Partners
                <span className="ml-2 normal-case font-normal" style={{ color: '#4b5563' }}>
                  ({neutralPartners.length} neutral states)
                </span>
              </p>
              <span className="text-xs" style={{ color: '#4b5563' }}>
                {partnersOpen ? '▲' : '▼'}
              </span>
            </button>

            {partnersOpen && (
              <div className="space-y-2 mt-3">
                <div
                  className="rounded p-3 mb-3"
                  style={{ background: '#0d1f2d', border: '1px solid #1e3a5f' }}
                >
                  <p className="text-xs" style={{ color: '#6b7280' }}>
                    Initiating dialogue with neutral states costs additional political capital
                    and may draw adversary attention. Sorted by accession readiness.
                  </p>
                </div>
                {neutralPartners.map(({ country, score }) => (
                  <CountryRow
                    key={country.id}
                    country={country}
                    score={score}
                    pc={pc}
                    onBeginDialogue={() => initiateDialogue(country.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
