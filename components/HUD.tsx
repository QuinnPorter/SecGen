'use client'

import { useGameStore, type ViewMode } from '@/lib/gameState'
import { pcReplenishFor, PC_MAX } from '@/lib/constants'
import { HelpCircle, Settings, Circle, Newspaper, Zap } from 'lucide-react'

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'world',     label: 'World' },
  { id: 'nato-area', label: 'Treaty Area' },
]

const SEV_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }

interface Props {
  onOpenBrief?: () => void
  onOpenTutorial?: () => void
  onOpenNews?: () => void
  onOpenSettings?: () => void
}

export default function HUD({ onOpenBrief, onOpenTutorial, onOpenNews, onOpenSettings }: Props) {
  const crises         = useGameStore((s) => s.crises)
  const article5Active = useGameStore((s) => s.article5Active)
  const viewMode       = useGameStore((s) => s.viewMode)
  const setViewMode    = useGameStore((s) => s.setViewMode)
  const pc             = useGameStore((s) => s.budgetState.totalPoliticalCapital)
  const difficulty     = useGameStore((s) => s.difficulty)
  const pcPerTurn      = pcReplenishFor(difficulty)
  const pcColor        = pc < 30 ? '#dc2626' : pc >= 100 ? '#15803d' : '#b45309'

  const activeCrisesList = crises.filter((c) => c.status === 'active')
  const activeCrises     = activeCrisesList.length
  const worstSev         = activeCrisesList.reduce<string>(
    (worst, c) => (SEV_ORDER[c.severity] ?? 0) > (SEV_ORDER[worst] ?? 0) ? c.severity : worst,
    'none',
  )
  const crisisTextColor =
    activeCrises === 0        ? '#78716c'  // muted stone
    : worstSev === 'critical' ? '#dc2626'
    : worstSev === 'high'     ? '#dc2626'
    : '#b45309'                              // amber
  const crisisBadgeBg =
    activeCrises === 0        ? '#a8a29e'
    : worstSev === 'critical' ? '#dc2626'
    : worstSev === 'high'     ? '#b91c1c'
    : '#b45309'

  return (
    <header
      className="flex items-center justify-between flex-shrink-0 px-6"
      style={{
        height: 48,
        background: '#ebe7e0',
        borderBottom: '1px solid #d6d3d1',
      }}
    >
      {/* Title */}
      <span
        className="font-serif font-semibold tracking-tight"
        style={{ color: '#004990', fontSize: 18, letterSpacing: '-0.01em' }}
      >
        SecGen
      </span>

      {/* View toggle */}
      <div
        className="flex items-center rounded-full"
        style={{ border: '1px solid #d6d3d1', background: '#fafaf9', padding: 2 }}
      >
        {VIEW_MODES.map(({ id, label }) => {
          const active = viewMode === id
          return (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className="rounded-full text-xs font-medium px-3.5 py-1 transition-colors"
              style={{
                background: active ? '#004990' : 'transparent',
                color:      active ? '#fff'     : '#57534e',
              }}
              onMouseEnter={(e) => {
                if (active) return
                ;(e.currentTarget as HTMLButtonElement).style.background = '#f0ede7'
                ;(e.currentTarget as HTMLButtonElement).style.color      = '#1c1917'
              }}
              onMouseLeave={(e) => {
                if (active) return
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color      = '#57534e'
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-4">
        {/* Political capital pill — always visible */}
        <span
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 tabular-nums"
          style={{ background: '#fafaf9', border: `1px solid ${pcColor}33` }}
          title={`Political capital: ${pc} / ${PC_MAX}\nReplenishes ${pcPerTurn}/turn. Spent on engagement, dialogue, accession, and crisis decisions.`}
        >
          <Zap size={12} strokeWidth={2.25} color={pcColor} />
          <span className="text-xs font-bold" style={{ color: pcColor }}>{pc}</span>
          <span className="text-xs font-medium" style={{ color: '#a8a29e' }}>/ {PC_MAX} PC</span>
        </span>

        {/* Article 5 badge */}
        {article5Active && (
          <button
            onClick={onOpenBrief}
            className="animate-pulse flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-black uppercase tracking-wider"
            style={{
              background: '#fef2f2',
              border: '1px solid #dc2626',
              color: '#b91c1c',
              letterSpacing: '0.1em',
            }}
          >
            <Circle size={8} fill="#dc2626" strokeWidth={0} />
            Article 5 Active
          </button>
        )}

        {/* Crisis indicator — clickable, severity-coloured */}
        <button
          onClick={activeCrises > 0 ? onOpenBrief : undefined}
          className={`flex items-center gap-1.5${worstSev === 'critical' && activeCrises > 0 ? ' animate-pulse' : ''}`}
          style={{ cursor: activeCrises > 0 ? 'pointer' : 'default', background: 'none', border: 'none', padding: 0 }}
        >
          <span
            className="text-xs font-medium"
            style={{ color: crisisTextColor }}
          >
            {activeCrises > 0 ? `${activeCrises} active crisis` : 'No active crises'}
          </span>
          {activeCrises > 0 && (
            <span
              className="rounded-full text-xs font-bold px-1.5 py-0.5 tabular-nums"
              style={{ background: crisisBadgeBg, color: '#fff' }}
            >
              {activeCrises}
            </span>
          )}
        </button>

        {/* News — opens NewsPanel (the wire of recent dispatches) */}
        <button
          onClick={onOpenNews}
          className="rounded flex items-center justify-center transition-colors"
          style={{ width: 28, height: 28, background: 'transparent', color: '#78716c' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#1c1917')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#78716c')}
          aria-label="News"
          title="News"
        >
          <Newspaper size={16} strokeWidth={1.75} />
        </button>

        {/* Tutorial — opens TutorialModal */}
        <button
          onClick={onOpenTutorial}
          className="rounded flex items-center justify-center transition-colors"
          style={{ width: 28, height: 28, background: 'transparent', color: '#78716c' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#1c1917')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#78716c')}
          aria-label="Tutorial"
          title="How to play"
        >
          <HelpCircle size={16} strokeWidth={1.75} />
        </button>

        {/* Settings gear — opens SettingsPanel (save / load) */}
        <button
          onClick={onOpenSettings}
          className="rounded flex items-center justify-center transition-colors"
          style={{ width: 28, height: 28, background: 'transparent', color: '#78716c' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#1c1917')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#78716c')}
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={16} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
