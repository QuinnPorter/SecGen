'use client'

export default function HUD() {
  const activeCrises = 0 // wired in Phase 4

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
        NATO Secretary General
      </span>

      {/* Right cluster */}
      <div className="flex items-center gap-4">
        {/* Crisis indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-medium"
            style={{ color: activeCrises > 0 ? '#f87171' : '#4b5563' }}
          >
            {activeCrises > 0 ? `${activeCrises} active crisis` : 'No active crises'}
          </span>
          {activeCrises > 0 && (
            <span
              className="rounded-full text-xs font-bold px-1.5 py-0.5"
              style={{ background: '#991b1b', color: '#fff' }}
            >
              {activeCrises}
            </span>
          )}
        </div>

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
