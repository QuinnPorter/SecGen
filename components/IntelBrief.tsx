'use client'

import { useMemo, useState } from 'react'
import { useGameStore, type Country, type Crisis, type CrisisOption } from '@/lib/gameState'
import { SCENARIOS, type ScenarioDefinition } from '@/lib/scenarios'
import { AlertTriangle, Check, RotateCcw } from 'lucide-react'

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

const SEV_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; pulse: boolean }> = {
  low:      { label: 'LOW',      color: '#57534e', bg: '#f5f3ef', border: '#a8a29e', pulse: false },
  medium:   { label: 'MEDIUM',   color: '#b45309', bg: '#fef3c7', border: '#b45309', pulse: false },
  high:     { label: 'HIGH',     color: '#b91c1c', bg: '#fef2f2', border: '#b91c1c', pulse: false },
  critical: { label: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', border: '#dc2626', pulse: true  },
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
        background:  selected ? '#e0eaf5' : '#fafaf9',
        border:      `1px solid ${selected ? '#004990' : '#e7e5e0'}`,
        cursor:      disabled ? 'not-allowed' : 'pointer',
        opacity:     disabled ? 0.55 : 1,
        transition:  'background 0.12s, border-color 0.12s',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <span
          className="text-xs font-semibold"
          style={{ color: selected ? '#004990' : canAfford ? '#1c1917' : '#a8a29e' }}
        >
          {option.label}
        </span>
        <span
          className="text-xs font-mono tabular-nums flex-shrink-0"
          style={{ color: option.capitalCost === 0 ? '#15803d' : canAfford ? '#b45309' : '#a8a29e' }}
        >
          {option.capitalCost === 0 ? 'Free' : `${option.capitalCost} PC`}
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: selected ? '#003a78' : '#57534e' }}>
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
      style={{
        background: '#fafaf9',
        border: '1px solid #e7e5e0',
        borderLeft: `4px solid ${sev.border}`,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 space-y-2.5">

        {/* Badge + title */}
        <div className="flex items-start gap-2.5">
          <span
            className={`text-xs font-black px-1.5 py-0.5 rounded tracking-wider flex-shrink-0 mt-0.5 ${sev.pulse ? 'animate-pulse' : ''}`}
            style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}
          >
            {sev.label}
          </span>
          <div className="min-w-0">
            <p className="font-serif font-semibold leading-snug" style={{ color: '#1c1917', fontSize: 15 }}>
              {crisis.title}
            </p>
            <p className="text-xs mt-1" style={{ color: '#78716c' }}>
              {flagEmoji(crisis.affectedCountryId)}{' '}
              {country?.name ?? crisis.affectedCountryId}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed" style={{ color: '#57534e' }}>
          {crisis.description}
        </p>

        {/* Countdown */}
        <div className="flex items-center gap-2 tabular-nums">
          <span
            className="text-xs font-medium"
            style={{ color: imminent ? '#dc2626' : '#78716c' }}
          >
            Turns to resolve: {turnsLeft}
          </span>
          {imminent && (
            <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>
              — escalates next turn if unresolved
            </span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="px-4 pb-3 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#a8a29e' }}>
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
        style={{ borderTop: '1px solid #e7e5e0', background: '#f5f3ef' }}
      >
        {deferred ? (
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#b45309' }}>
            <RotateCcw size={11} strokeWidth={2.25} />
            Deferred — matter unresolved this turn
          </span>
        ) : chosenOptionId ? (
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#15803d' }}>
            <Check size={12} strokeWidth={2.5} />
            Response selected — applied on close
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: imminent ? '#dc2626' : '#a8a29e' }}>
            {imminent && <AlertTriangle size={11} strokeWidth={2.25} />}
            {imminent
              ? 'Deferring will trigger auto-escalation'
              : 'You may defer this matter without responding'}
          </span>
        )}

        {!deferred && !chosenOptionId && (
          <button
            onClick={onDefer}
            className="text-xs font-medium px-3 py-1 rounded flex-shrink-0 transition-colors"
            style={{ background: '#fafaf9', color: '#57534e', border: '1px solid #e7e5e0' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = '#1c1917'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#78716c'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = '#57534e'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
            }}
          >
            Defer
          </button>
        )}

        {(deferred || chosenOptionId) && (
          <button
            onClick={onReset}
            className="text-xs px-2 py-0.5 rounded flex-shrink-0"
            style={{ color: '#a8a29e', background: 'transparent' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#57534e')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#a8a29e')}
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
        background: '#fafaf9',
        border: '1px solid #e7e5e0',
        borderLeft: '4px solid #004990',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <span
            className="text-xs font-black px-1.5 py-0.5 rounded tracking-wider flex-shrink-0 mt-0.5"
            style={{ background: '#e0eaf5', color: '#004990', border: '1px solid #004990' }}
          >
            STRATEGIC OPPORTUNITY
          </span>
        </div>
        <p className="font-serif font-semibold leading-snug" style={{ color: '#1c1917', fontSize: 15 }}>
          {scenario.title}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: '#57534e' }}>
          {scenario.briefing}
        </p>
      </div>

      {/* Choices */}
      <div className="px-4 pb-3 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#a8a29e' }}>
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
                background:    selected ? '#e0eaf5' : '#fafaf9',
                border:        `1px solid ${selected ? '#004990' : '#e7e5e0'}`,
                cursor:        'pointer',
                transition:    'background 0.12s, border-color 0.12s',
              }}
            >
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: selected ? '#004990' : '#1c1917' }}
              >
                {choice.label}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: selected ? '#003a78' : '#57534e' }}>
                {choice.description}
              </p>
              {selected && (
                <p className="text-xs mt-1.5 italic" style={{ color: '#57534e' }}>
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
        style={{ borderTop: '1px solid #e7e5e0', background: '#f5f3ef' }}
      >
        {chosenChoiceId ? (
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#15803d' }}>
            <Check size={12} strokeWidth={2.5} />
            Decision recorded — applied on close
          </span>
        ) : (
          <span className="text-xs" style={{ color: '#004990' }}>
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
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <div
        className="flex flex-col rounded-xl"
        style={{
          width: 620,
          maxHeight: '80vh',
          background: '#fafaf9',
          border: '1px solid #e7e5e0',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex-shrink-0 px-6 py-5"
          style={{ borderBottom: '1px solid #e7e5e0', background: '#f5f3ef' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-xs font-black uppercase tracking-widest mb-2"
                style={{ color: '#b91c1c', letterSpacing: '0.2em' }}
              >
                ▌ Classified — Secretary General Eyes Only
              </p>
              <h2 className="font-serif font-semibold leading-tight tabular-nums" style={{ fontSize: 22, color: '#1c1917', letterSpacing: '-0.01em' }}>
                Q{quarter} {year} — Intelligence Brief
              </h2>
              <p className="text-sm mt-1.5 font-medium" style={{ color: '#b91c1c' }}>
                {activeCrises.length + activeScenarioDefs.length} matter{(activeCrises.length + activeScenarioDefs.length) !== 1 ? 's' : ''} requiring your attention
              </p>
            </div>
            <div
              className="flex-shrink-0 rounded px-2.5 py-1.5 text-center"
              style={{ background: '#fef2f2', border: '1px solid #dc2626', minWidth: 64 }}
            >
              <p className="font-mono font-black tabular-nums" style={{ color: '#b91c1c', fontSize: 18 }}>
                {activeCrises.length + activeScenarioDefs.length}
              </p>
              <p className="text-xs" style={{ color: '#b91c1c', fontSize: 9, letterSpacing: '0.1em' }}>
                ACTIVE
              </p>
            </div>
          </div>
        </div>

        {/* ── Scrollable crisis + scenario stack ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          style={{ background: '#f0ede7' }}
        >
          {activeCrises.length === 0 && activeScenarioDefs.length === 0 ? (
            <p className="text-sm text-center py-12" style={{ color: '#a8a29e' }}>
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
          style={{ borderTop: '1px solid #e7e5e0', background: '#f5f3ef' }}
        >
          <p className="text-xs" style={{ color: allHandled ? '#a8a29e' : '#b45309' }}>
            {allHandled
              ? 'All matters addressed. You may close this brief.'
              : `${undecided} matter${undecided !== 1 ? 's' : ''} still require a decision.`}
          </p>
          <button
            onClick={handleClose}
            className="flex-shrink-0 rounded-lg px-5 py-2 text-sm font-semibold transition-all"
            style={{
              background: '#004990',
              color:      '#fff',
              cursor:     'pointer',
              boxShadow: '0 1px 2px rgba(0, 73, 144, 0.18), 0 2px 4px rgba(0, 73, 144, 0.12)',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#003a78')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#004990')}
          >
            Close Brief
          </button>
        </div>
      </div>
    </div>
  )
}
