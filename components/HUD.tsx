'use client'

import { useGameStore, type ViewMode } from '@/lib/gameState'

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'world',     label: 'World' },
  { id: 'nato-area', label: 'NATO Area' },
]

const SEV_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }

interface Props {
  onOpenBrief?: () => void
  onOpenTutorial?: () => void
}

export default function HUD({ onOpenBrief, onOpenTutorial }: Props) {
  const crises         = useGameStore((s) => s.crises)
  const article5Active = useGameStore((s) => s.article5Active)
  const viewMode       = useGameStore((s) => s.viewMode)
  const setViewMode    = useGameStore((s) => s.setViewMode)

  const activeCrisesList = crises.filter((c) => c.status === 'active')
  const activeCrises     = activeCrisesList.length
  const worstSev         = activeCrisesList.reduce<string>(
    (worst, c) => (SEV_ORDER[c.severity] ?? 0) > (SEV_ORDER[worst] ?? 0) ? c.severity : worst,
    'none',
  )
  const crisisTextColor =
    activeCrises === 0        ? '#4b5563'
    : worstSev === 'critical' ? '#ef4444'
    : worstSev === 'high'     ? '#f87171'
    : '#f59e0b'
  const crisisBadgeBg =
    activeCrises === 0        ? '#374151'
    : worstSev === 'critical' ? '#7f1d1d'
    : worstSev === 'high'     ? '#991b1b'
    : '#78350f'

  return (
    <header
      className="flex items-center justify-between flex-shrink-0 px-6"
      style={{
        height: 48,
        background: '#0d1f2d',
        borderBottom: '1px solid #1e3a5f',
      }}
    >
      {/* Title */}
      <span className="text-sm font-semibold tracking-wide" style={{ color: '#e8edf2' }}>
        SecGen
      </span>

      {/* View toggle */}
      <div
        className="flex rounded-md overflow-hidden"
        style={{ border: '1px solid #1e3a5f' }}
      >
        {VIEW_MODES.map(({ id, label }) => {
          const active = viewMode === id
          return (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className="text-xs font-medium px-3 py-1 transition-colors"
              style={{
                background: active ? '#2563eb' : 'transparent',
                color:      active ? '#fff'     : '#6b7280',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-4">
        {/* Article 5 badge */}
        {article5Active && (
          <button
            onClick={onOpenBrief}
            className="animate-pulse flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-black uppercase tracking-wider"
            style={{
              background: '#7f1d1d',
              border: '1px solid #dc2626',
              color: '#fca5a5',
              letterSpacing: '0.1em',
            }}
          >
            <span style={{ fontSize: 8 }}>⬤</span>
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
              className="rounded-full text-xs font-bold px-1.5 py-0.5"
              style={{ background: crisisBadgeBg, color: '#fff' }}
            >
              {activeCrises}
            </span>
          )}
        </button>

        {/* Tutorial — opens TutorialModal */}
        <button
          onClick={onOpenTutorial}
          className="rounded flex items-center justify-center transition-colors"
          style={{ width: 28, height: 28, background: 'transparent', color: '#4b5563' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#9ca3af')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}
          aria-label="Tutorial"
          title="How to play"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        {/* Settings gear — non-functional */}
        <button
          className="rounded flex items-center justify-center transition-colors"
          style={{ width: 28, height: 28, background: 'transparent', color: '#4b5563' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#9ca3af')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}
          aria-label="Settings"
          title="Settings (coming soon)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  )
}
