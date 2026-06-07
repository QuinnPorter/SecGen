'use client'

import { useGameStore, type NotificationType } from '@/lib/gameState'
import { X, Circle, Newspaper } from 'lucide-react'

// Same colour convention as the Sidebar "Recent Developments" feed.
const DOT_COLOR: Record<NotificationType, string> = {
  delayed_effect:    '#004990',
  crisis_escalation: '#dc2626',
  strategic_crisis:  '#dc2626',
  accession_update:  '#15803d',
  info:              '#78716c',
}

// Short kicker shown before each dispatch, derived from its type.
const TYPE_LABEL: Record<NotificationType, string> = {
  delayed_effect:    'Alliance',
  crisis_escalation: 'Crisis',
  strategic_crisis:  'Crisis',
  accession_update:  'Accession',
  info:              'World',
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function NewsPanel({ isOpen, onClose }: Props) {
  const notifications = useGameStore((s) => s.notifications)

  if (!isOpen) return null

  // Newest dispatch first; show the full, untruncated text.
  const wire = [...notifications].reverse()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          width: 520,
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
              Treaty Wire
            </p>
            <h2
              className="flex items-center gap-2 font-serif font-semibold tracking-tight"
              style={{ fontSize: 20, color: '#1c1917', letterSpacing: '-0.01em' }}
            >
              <Newspaper size={18} strokeWidth={1.75} />
              News
            </h2>
            <p className="text-xs mt-1 tabular-nums" style={{ color: '#78716c' }}>
              {wire.length} {wire.length === 1 ? 'dispatch' : 'dispatches'} on the wire
            </p>
          </div>
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
            aria-label="Close news panel"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {wire.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#a8a29e' }}>
              No dispatches yet — advance a turn to see the wire fill up.
            </p>
          ) : (
            <div className="space-y-2">
              {wire.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-2.5 rounded px-3 py-2.5"
                  style={{ background: '#f5f3ef', border: '1px solid #e7e5e0' }}
                >
                  <Circle
                    size={8}
                    fill={DOT_COLOR[n.type]}
                    strokeWidth={0}
                    style={{ marginTop: 6, flexShrink: 0 }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: DOT_COLOR[n.type], letterSpacing: '0.06em', fontSize: 10 }}
                      >
                        {TYPE_LABEL[n.type]}
                      </span>
                      <span className="tabular-nums" style={{ color: '#a8a29e', fontSize: 10 }}>
                        Turn {n.turn}
                      </span>
                    </div>
                    <p className="text-sm leading-snug" style={{ color: '#44403c' }}>
                      {n.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
