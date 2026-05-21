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
import { X, AlertTriangle, Lightbulb, ChevronUp, ChevronDown, Check, Minus, RotateCcw } from 'lucide-react'

// ─── Stage display config ────────────────────────────────────────────────────

const STAGE_CONFIG: Record<AccessionStage, { label: string; color: string; bg: string }> = {
  none:       { label: 'None',       color: '#78716c', bg: '#f5f3ef' },
  dialogue:   { label: 'Dialogue',   color: '#57534e', bg: '#f0ede7' },
  map:        { label: 'MAP',        color: '#92400e', bg: '#fef3c7' },
  invitation: { label: 'Invitation', color: '#004990', bg: '#e0eaf5' },
  acceding:   { label: 'Acceding',   color: '#15803d', bg: '#dcfce7' },
}

const ADVANCE_LABEL: Partial<Record<AccessionStage, string>> = {
  dialogue:   'Advance to MAP Stage',
  map:        'Extend Invitation',
  invitation: 'Call Member Vote',
}

// ─── Shared primitives ───────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#15803d' : score >= 50 ? '#b45309' : '#004990'
  return (
    <div className="h-1.5 w-full rounded-full" style={{ background: '#e7e5e0' }} title={`Accession score: ${score} / 100`}>
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
    <div className="mt-2 rounded p-2.5 space-y-1.5" style={{ background: '#f0ede7', border: '1px solid #e7e5e0' }}>
      <div className="flex gap-3 flex-wrap text-xs font-medium tabular-nums">
        <span className="flex items-center gap-1" style={{ color: '#15803d' }}>
          <Check size={11} strokeWidth={2.5} /> {yesCount} yes
        </span>
        <span className="flex items-center gap-1" style={{ color: '#78716c' }}>
          <Minus size={11} strokeWidth={2.5} /> {abstCount} abstain
        </span>
        <span className="flex items-center gap-1" style={{ color: noVoters.length ? '#b91c1c' : '#a8a29e' }}>
          <X size={11} strokeWidth={2.5} /> {noVoters.length} no
        </span>
        {pendingCount > 0 && (
          <span className="flex items-center gap-1" style={{ color: '#78716c' }}>
            <RotateCcw size={11} strokeWidth={2.25} /> {pendingCount} pending
          </span>
        )}
      </div>
      {noVoters.length > 0 && (
        <p className="text-xs" style={{ color: '#b91c1c' }}>
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
      className="rounded-lg p-5 space-y-3"
      style={{
        background: '#f5f3ef',
        border: '1px solid #e7e5e0',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-serif font-semibold" style={{ color: '#1c1917', fontSize: 16 }}>
          {country?.name ?? process.countryId}
        </span>
        <StageBadge stage={stage} />
      </div>

      {/* Score bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5" style={{ color: '#78716c' }}>
          <span>Accession score</span>
          <span className="tabular-nums font-semibold" style={{ color: score >= 80 ? '#15803d' : '#1c1917' }}>{score} / 100</span>
        </div>
        <ScoreBar score={score} />
      </div>

      {/* Meta */}
      <div className="flex gap-4 text-xs tabular-nums" style={{ color: '#78716c' }}>
        <span>{turnsInStage} turn{turnsInStage !== 1 ? 's' : ''} in stage</span>
        <span style={{ color: scoreGate ? '#dc2626' : '#78716c' }}>
          {requirementText()}
        </span>
      </div>

      {/* Adversary warning */}
      {adversaryReactionTriggered && (
        <p className="flex items-center gap-1.5 text-xs" style={{ color: '#b91c1c' }}>
          <AlertTriangle size={12} strokeWidth={2} />
          Adversary reaction triggered — expect increased regional tension
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
            background: canFinalise ? '#15803d' : '#f0ede7',
            color:      canFinalise ? '#fff' : '#a8a29e',
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
              background: advDisabled ? '#f0ede7' : '#004990',
              color:      advDisabled ? '#a8a29e' : '#fff',
              cursor:     advDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {advLabel}
          </button>
          {!canAfford && (
            <p className="text-xs text-center" style={{ color: '#b91c1c' }}>
              Insufficient political capital
            </p>
          )}
          {isBlocked && stage === 'invitation' && (
            <p className="text-xs text-center" style={{ color: '#b45309' }}>
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
      style={{ background: '#f5f3ef', border: '1px solid #e7e5e0' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium truncate" style={{ color: '#1c1917' }}>
            {country.name}
          </span>
          <span className="text-xs tabular-nums flex-shrink-0 font-semibold" style={{ color: score >= 80 ? '#15803d' : '#78716c' }}>
            {score}
          </span>
        </div>
        <p className="text-xs truncate" style={{ color: '#78716c' }}>{country.notes}</p>
      </div>
      <button
        onClick={onBeginDialogue}
        disabled={!canAfford}
        title={canAfford ? `Begin Dialogue — costs ${PC_COST_DIALOGUE} PC` : `Insufficient political capital — need ${PC_COST_DIALOGUE} PC`}
        className="flex-shrink-0 rounded px-2.5 py-1.5 text-xs font-medium transition-colors"
        style={{
          background: canAfford ? '#fafaf9' : '#f0ede7',
          color:      canAfford ? '#004990' : '#a8a29e',
          border:     `1px solid ${canAfford ? '#e7e5e0' : '#e7e5e0'}`,
          cursor:     canAfford ? 'pointer'  : 'not-allowed',
        }}
        onMouseEnter={(e) => {
          if (canAfford) {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#e0eaf5'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#004990'
          }
        }}
        onMouseLeave={(e) => {
          if (canAfford) {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#fafaf9'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
          }
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
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          width: 580,
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
              Diplomacy
            </p>
            <h2
              className="font-serif font-semibold tracking-tight"
              style={{ fontSize: 20, color: '#1c1917', letterSpacing: '-0.01em' }}
            >
              Alliance Expansion
            </h2>
            <p className="text-xs mt-1" style={{ color: '#78716c' }}>
              Manage accession processes and partnerships
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs font-semibold tabular-nums" style={{ color: pc < 30 ? '#dc2626' : '#b45309' }}>
              <Lightbulb size={12} strokeWidth={2} />
              {pc} / 100 PC
            </span>
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
              aria-label="Close expansion panel"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ── Section 1: Active processes ── */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#78716c' }}>
              Active Processes
              {activeProcesses.length > 0 && (
                <span className="ml-2 normal-case font-normal tabular-nums" style={{ color: '#a8a29e' }}>
                  ({activeProcesses.length})
                </span>
              )}
            </p>
            {activeProcesses.length === 0 ? (
              <div className="space-y-1">
                <p className="text-sm" style={{ color: '#78716c' }}>No active accession processes.</p>
                <p className="text-xs" style={{ color: '#a8a29e' }}>
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
            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#78716c' }}>
              Accession Candidates
            </p>
            {candidates.length === 0 ? (
              <p className="text-sm" style={{ color: '#a8a29e' }}>
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
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#78716c' }}>
                Potential Partners
                <span className="ml-2 normal-case font-normal tabular-nums" style={{ color: '#a8a29e' }}>
                  ({neutralPartners.length} neutral states)
                </span>
              </p>
              <span className="flex items-center text-xs" style={{ color: '#78716c' }}>
                {partnersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {partnersOpen && (
              <div className="space-y-2 mt-3">
                <div
                  className="rounded p-3 mb-3"
                  style={{ background: '#f0ede7', border: '1px solid #e7e5e0' }}
                >
                  <p className="text-xs" style={{ color: '#78716c' }}>
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
