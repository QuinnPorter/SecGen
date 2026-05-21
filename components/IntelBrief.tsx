'use client'

import { useMemo, useState } from 'react'
import { useGameStore, type Country, type Crisis, type CrisisOption } from '@/lib/gameState'
import { SCENARIOS, type ScenarioDefinition } from '@/lib/scenarios'

// ── Flag emoji (alpha-3 → Regional Indicator pair) ────────────────────────────

const A3_TO_A2: Record<string, string> = {
  USA: 'US', CAN: 'CA', GBR: 'GB', FRA: 'FR', DEU: 'DE', ITA: 'IT', ESP: 'ES',
  POL: 'PL', NOR: 'NO', DNK: 'DK', NLD: 'NL', BEL: 'BE', LUX: 'LU', PRT: 'PT',
  GRC: 'GR', TUR: 'TR', ISL: 'IS', HUN: 'HU', CZE: 'CZ', SVK: 'SK', SVN: 'SI',
  EST: 'EE', LVA: 'LV', LTU: 'LT', ROU: 'RO', BGR: 'BG', HRV: 'HR', ALB: 'AL',
  MNE: 'ME', MKD: 'MK', FIN: 'FI', SWE: 'SE',
  UKR: 'UA', GEO: 'GE', BIH: 'BA',
  RUS: 'RU', BLR: 'BY',
}

function flagEmoji(id: string): string {
  const a2 = A3_TO_A2[id]
  if (!a2) return '🌐'
  const base = 0x1F1E6 - 0x41
  return String.fromCodePoint(base + a2.charCodeAt(0)) +
         String.fromCodePoint(base + a2.charCodeAt(1))
}

// ── Severity config ───────────────────────────────────────────────────────────

const SEV_CONFIG: Record<string, { label: string; color: string; border: string; pulse: boolean }> = {
  low:      { label: 'LOW',      color: '#6b7280', border: '#374151', pulse: false },
  medium:   { label: 'MEDIUM',   color: '#f59e0b', border: '#92400e', pulse: false },
  high:     { label: 'HIGH',     color: '#f87171', border: '#991b1b', pulse: false },
  critical: { label: 'CRITICAL', color: '#ef4444', border: '#dc2626', pulse: true  },
}

// ── Option button ─────────────────────────────────────────────────────────────

function OptionBtn({
  option,
  selected,
  canAfford,
  onClick,
}: {
  option: CrisisOption
  selected: boolean
  canAfford: boolean
  onClick: () => void
}) {
  const disabled = !canAfford && !selected

  return (
    <button
      onClick={() => !disabled && onClick()}
      className="w-full text-left rounded-lg px-3 py-2.5"
      style={{
        background:  selected ? '#172554' : canAfford ? '#0d1f2d' : '#090f17',
        border:      `1px solid ${selected ? '#3b82f6' : canAfford ? '#1e3a5f' : '#0f1f30'}`,
        cursor:      disabled ? 'not-allowed' : 'pointer',
        opacity:     disabled ? 0.45 : 1,
        transition:  'background 0.12s, border-color 0.12s',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <span
          className="text-xs font-semibold"
          style={{ color: selected ? '#93c5fd' : canAfford ? '#e8edf2' : '#4b5563' }}
        >
          {option.label}
        </span>
        <span
          className="text-xs font-mono flex-shrink-0"
          style={{ color: option.capitalCost === 0 ? '#4ade80' : canAfford ? '#f59e0b' : '#374151' }}
        >
          {option.capitalCost === 0 ? 'Free' : `${option.capitalCost} PC`}
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: selected ? '#7dd3fc' : '#6b7280' }}>
        {option.description}
      </p>
    </button>
  )
}

// ── Crisis card ───────────────────────────────────────────────────────────────

function CrisisCard({
  crisis,
  countries,
  pc,
  chosenOptionId,
  deferred,
  onChoose,
  onDefer,
  onReset,
}: {
  crisis: Crisis
  countries: Record<string, Country>
  pc: number
  chosenOptionId: string | null
  deferred: boolean
  onChoose: (optionId: string) => void
  onDefer: () => void
  onReset: () => void
}) {
  const sev       = SEV_CONFIG[crisis.severity] ?? SEV_CONFIG.medium
  const country   = countries[crisis.affectedCountryId]
  const turnsLeft = crisis.turnsToResolve - crisis.turnsActive
  const imminent  = turnsLeft <= 1

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: '#0a1929', border: `1px solid #1e3a5f`, borderLeft: `3px solid ${sev.border}` }}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 space-y-2.5">

        {/* Badge + title */}
        <div className="flex items-start gap-2.5">
          <span
            className={`text-xs font-black px-1.5 py-0.5 rounded tracking-wider flex-shrink-0 mt-0.5 ${sev.pulse ? 'animate-pulse' : ''}`}
            style={{ background: '#0d1f2d', color: sev.color, border: `1px solid ${sev.border}` }}
          >
            {sev.label}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug" style={{ color: '#e8edf2' }}>
              {crisis.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              {flagEmoji(crisis.affectedCountryId)}{' '}
              {country?.name ?? crisis.affectedCountryId}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
          {crisis.description}
        </p>

        {/* Countdown */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium"
            style={{ color: imminent ? '#f87171' : '#6b7280' }}
          >
            Turns to resolve: {turnsLeft}
          </span>
          {imminent && (
            <span className="text-xs font-semibold" style={{ color: '#f87171' }}>
              — escalates next turn if unresolved
            </span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="px-4 pb-3 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#374151' }}>
          Response options
        </p>
        {crisis.options.map((opt) => (
          <OptionBtn
            key={opt.id}
            option={opt}
            selected={chosenOptionId === opt.id}
            canAfford={pc >= opt.capitalCost}
            onClick={() => onChoose(opt.id)}
          />
        ))}
      </div>

      {/* Defer row */}
      <div
        className="px-4 py-2.5 flex items-center justify-between gap-4"
        style={{ borderTop: '1px solid #0d1f2d' }}
      >
        {deferred ? (
          <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>
            ⟳ Deferred — matter unresolved this turn
          </span>
        ) : chosenOptionId ? (
          <span className="text-xs font-medium" style={{ color: '#4ade80' }}>
            ✓ Response selected — applied on close
          </span>
        ) : (
          <span className="text-xs" style={{ color: imminent ? '#f87171' : '#374151' }}>
            {imminent
              ? '⚠ Deferring will trigger auto-escalation'
              : 'You may defer this matter without responding'}
          </span>
        )}

        {!deferred && !chosenOptionId && (
          <button
            onClick={onDefer}
            className="text-xs font-medium px-3 py-1 rounded flex-shrink-0 transition-colors"
            style={{ background: '#0d1f2d', color: '#4b5563', border: '1px solid #1e3a5f' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#9ca3af')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}
          >
            Defer
          </button>
        )}

        {(deferred || chosenOptionId) && (
          <button
            onClick={onReset}
            className="text-xs px-2 py-0.5 rounded flex-shrink-0"
            style={{ color: '#374151', background: 'transparent' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6b7280')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#374151')}
          >
            Change
          </button>
        )}
      </div>
    </div>
  )
}

// ── Scenario card ─────────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  chosenChoiceId,
  onChoose,
}: {
  scenario: ScenarioDefinition
  chosenChoiceId: string | null
  onChoose: (choiceId: string) => void
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: '#0a1929',
        border: '1px solid #1e3a5f',
        borderLeft: '3px solid #2563eb',
      }}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <span
            className="text-xs font-black px-1.5 py-0.5 rounded tracking-wider flex-shrink-0 mt-0.5"
            style={{ background: '#172554', color: '#93c5fd', border: '1px solid #2563eb' }}
          >
            STRATEGIC OPPORTUNITY
          </span>
        </div>
        <p className="text-sm font-semibold leading-snug" style={{ color: '#e8edf2' }}>
          {scenario.title}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
          {scenario.briefing}
        </p>
      </div>

      {/* Choices */}
      <div className="px-4 pb-3 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#374151' }}>
          Your response
        </p>
        {scenario.choices.map((choice) => {
          const selected = chosenChoiceId === choice.id
          return (
            <button
              key={choice.id}
              onClick={() => onChoose(choice.id)}
              className="w-full text-left rounded-lg px-3 py-2.5"
              style={{
                background:    selected ? '#172554' : '#0d1f2d',
                border:        `1px solid ${selected ? '#3b82f6' : '#1e3a5f'}`,
                cursor:        'pointer',
                transition:    'background 0.12s, border-color 0.12s',
              }}
            >
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: selected ? '#93c5fd' : '#e8edf2' }}
              >
                {choice.label}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: selected ? '#7dd3fc' : '#6b7280' }}>
                {choice.description}
              </p>
              {selected && (
                <p className="text-xs mt-1.5 italic" style={{ color: '#4b5563' }}>
                  {choice.consequences}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* Status row */}
      <div
        className="px-4 py-2.5"
        style={{ borderTop: '1px solid #0d1f2d' }}
      >
        {chosenChoiceId ? (
          <span className="text-xs font-medium" style={{ color: '#4ade80' }}>
            ✓ Decision recorded — applied on close
          </span>
        ) : (
          <span className="text-xs" style={{ color: '#93c5fd' }}>
            A decision is required before closing this brief.
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function IntelBrief({ isOpen, onClose }: Props) {
  const crises              = useGameStore((s) => s.crises)
  const countries           = useGameStore((s) => s.countries)
  const pc                  = useGameStore((s) => s.budgetState.totalPoliticalCapital)
  const quarter             = useGameStore((s) => s.quarter)
  const year                = useGameStore((s) => s.year)
  const resolveCrisis       = useGameStore((s) => s.resolveCrisis)
  const activeScenarioIds   = useGameStore((s) => s.activeScenarios)
  const applyScenarioChoice = useGameStore((s) => s.applyScenarioChoice)

  // decisions: crisisId → chosen optionId
  const [decisions, setDecisions]               = useState<Record<string, string>>({})
  // deferred: set of crisisIds the player explicitly deferred
  const [deferred, setDeferred]                 = useState<Set<string>>(new Set())
  // scenarioDecisions: scenarioId → chosen choiceId
  const [scenarioDecisions, setScenarioDecisions] = useState<Record<string, string>>({})

  const activeCrises = useMemo(
    () => crises.filter((c) => c.status === 'active' && c.turnsUntilActive === 0),
    [crises],
  )

  // Derive full scenario definitions from IDs so effects functions survive serialisation
  const activeScenarioDefs = useMemo(
    () =>
      activeScenarioIds
        .map((id) => SCENARIOS.find((s) => s.id === id))
        .filter((s): s is ScenarioDefinition => s !== undefined),
    [activeScenarioIds],
  )

  const undecidedCrises = activeCrises.filter(
    (c) => decisions[c.id] === undefined && !deferred.has(c.id),
  )
  const undecidedScenarios = activeScenarioDefs.filter(
    (s) => scenarioDecisions[s.id] === undefined,
  )
  const undecided  = undecidedCrises.length + undecidedScenarios.length
  const allHandled = undecided === 0

  function handleChoose(crisisId: string, optionId: string) {
    // Toggle: clicking the same option deselects
    setDecisions((prev) => {
      if (prev[crisisId] === optionId) {
        const next = { ...prev }
        delete next[crisisId]
        return next
      }
      return { ...prev, [crisisId]: optionId }
    })
    // Choosing clears any defer
    setDeferred((prev) => {
      const next = new Set(prev)
      next.delete(crisisId)
      return next
    })
  }

  function handleDefer(crisisId: string) {
    setDeferred((prev) => new Set([...prev, crisisId]))
    setDecisions((prev) => {
      const next = { ...prev }
      delete next[crisisId]
      return next
    })
  }

  function handleReset(crisisId: string) {
    setDeferred((prev) => {
      const next = new Set(prev)
      next.delete(crisisId)
      return next
    })
    setDecisions((prev) => {
      const next = { ...prev }
      delete next[crisisId]
      return next
    })
  }

  function handleClose() {
    for (const [crisisId, optionId] of Object.entries(decisions)) {
      resolveCrisis(crisisId, optionId)
    }
    for (const [scenarioId, choiceId] of Object.entries(scenarioDecisions)) {
      applyScenarioChoice(scenarioId, choiceId)
    }
    setDecisions({})
    setDeferred(new Set())
    setScenarioDecisions({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)' }}
    >
      <div
        className="flex flex-col rounded-xl"
        style={{
          width: 620,
          maxHeight: '80vh',
          background: '#0d1f2d',
          border: '1px solid #1e3a5f',
          boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex-shrink-0 px-6 py-5"
          style={{ borderBottom: '1px solid #1e3a5f', background: '#060f1a' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-xs font-black uppercase tracking-widest mb-2"
                style={{ color: '#7f1d1d', letterSpacing: '0.2em' }}
              >
                ▌ Classified — Secretary General Eyes Only
              </p>
              <h2 className="font-bold leading-tight" style={{ fontSize: 17, color: '#e8edf2' }}>
                Q{quarter} {year} — Intelligence Brief
              </h2>
              <p className="text-sm mt-1.5 font-medium" style={{ color: '#f87171' }}>
                {activeCrises.length + activeScenarioDefs.length} matter{(activeCrises.length + activeScenarioDefs.length) !== 1 ? 's' : ''} requiring your attention
              </p>
            </div>
            <div
              className="flex-shrink-0 rounded px-2.5 py-1.5 text-center"
              style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', minWidth: 64 }}
            >
              <p className="text-xs font-black" style={{ color: '#f87171' }}>
                {activeCrises.length + activeScenarioDefs.length}
              </p>
              <p className="text-xs" style={{ color: '#7f1d1d', fontSize: 9 }}>
                ACTIVE
              </p>
            </div>
          </div>
        </div>

        {/* ── Scrollable crisis + scenario stack ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          style={{ background: '#0a1522' }}
        >
          {activeCrises.length === 0 && activeScenarioDefs.length === 0 ? (
            <p className="text-sm text-center py-12" style={{ color: '#374151' }}>
              No matters requiring immediate attention.
            </p>
          ) : (
            <>
              {/* Scenarios first — strategic opportunities take priority */}
              {activeScenarioDefs.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  chosenChoiceId={scenarioDecisions[scenario.id] ?? null}
                  onChoose={(choiceId) =>
                    setScenarioDecisions((prev) => ({ ...prev, [scenario.id]: choiceId }))
                  }
                />
              ))}
              {/* Regular crises */}
              {activeCrises.map((crisis) => (
                <CrisisCard
                  key={crisis.id}
                  crisis={crisis}
                  countries={countries}
                  pc={pc}
                  chosenOptionId={decisions[crisis.id] ?? null}
                  deferred={deferred.has(crisis.id)}
                  onChoose={(optionId) => handleChoose(crisis.id, optionId)}
                  onDefer={() => handleDefer(crisis.id)}
                  onReset={() => handleReset(crisis.id)}
                />
              ))}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex-shrink-0 px-6 py-4 flex items-center justify-between gap-4"
          style={{ borderTop: '1px solid #1e3a5f', background: '#060f1a' }}
        >
          <p className="text-xs" style={{ color: allHandled ? '#374151' : '#f59e0b' }}>
            {allHandled
              ? 'All matters addressed. You may close this brief.'
              : `${undecided} matter${undecided !== 1 ? 's' : ''} still require a decision.`}
          </p>
          <button
            onClick={handleClose}
            className="flex-shrink-0 rounded-lg px-5 py-2 text-sm font-semibold transition-all"
            style={{
              background: '#2563eb',
              color:      '#fff',
              cursor:     'pointer',
            }}
          >
            Close Brief
          </button>
        </div>
      </div>
    </div>
  )
}
