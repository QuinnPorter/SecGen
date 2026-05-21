'use client'

import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

interface Slide {
  title: string
  body: React.ReactNode
}

const SLIDES: Slide[] = [
  {
    title: 'Lead NATO, 2024–2044',
    body: (
      <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
        You&apos;re the Secretary General. Steer the alliance through a 20-year term —
        keep NATO cohesive, ready, and growing as you respond to crises.
      </p>
    ),
  },
  {
    title: 'The map is your board',
    body: (
      <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
        Click any country on the world map to open its detail panel. That&apos;s where
        you inspect members, candidates, and adversaries — and take country-level
        actions when events demand a response.
      </p>
    ),
  },
  {
    title: 'Your sidebar runs the turn',
    body: (
      <ul className="text-sm leading-relaxed space-y-1.5" style={{ color: '#cbd5e1' }}>
        <li><span className="font-semibold" style={{ color: '#e8edf2' }}>End Turn</span> — advances time (your primary action)</li>
        <li><span className="font-semibold" style={{ color: '#e8edf2' }}>Budget</span> — allocate defence spending</li>
        <li><span className="font-semibold" style={{ color: '#e8edf2' }}>Expansion</span> — manage accession candidates</li>
        <li><span className="font-semibold" style={{ color: '#e8edf2' }}>Attention</span> — members needing follow-up</li>
        <li><span className="font-semibold" style={{ color: '#e8edf2' }}>Save</span> — store your progress</li>
      </ul>
    ),
  },
]

export default function TutorialModal({ open, onClose }: Props) {
  const [slide, setSlide] = useState(0)

  // Reset to first slide each time the modal opens
  useEffect(() => {
    if (open) setSlide(0)
  }, [open])

  // Keyboard: Esc closes, ← / → navigate slides
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSlide((s) => Math.min(s + 1, SLIDES.length - 1))
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSlide((s) => Math.max(s - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const isFirst = slide === 0
  const isLast  = slide === SLIDES.length - 1
  const current = SLIDES[slide]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-8 relative"
        style={{
          width: 440,
          maxWidth: 'calc(100vw - 32px)',
          background: '#0d1f2d',
          border: '1px solid #1e3a5f',
          boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (×) — always visible */}
        <button
          onClick={onClose}
          aria-label="Close tutorial"
          className="absolute rounded flex items-center justify-center transition-colors"
          style={{
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            background: 'transparent',
            color: '#6b7280',
            border: 'none',
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#e8edf2')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6b7280')}
        >
          ×
        </button>

        {/* Eyebrow */}
        <p
          className="text-xs font-black uppercase tracking-widest mb-3"
          style={{ color: '#374151', letterSpacing: '0.2em' }}
        >
          Tutorial — Step {slide + 1} of {SLIDES.length}
        </p>

        {/* Title */}
        <h2 className="font-bold mb-3" style={{ fontSize: 20, color: '#e8edf2' }}>
          {current.title}
        </h2>

        {/* Body */}
        <div className="mb-6" style={{ minHeight: 96 }}>
          {current.body}
        </div>

        {/* Footer: Prev — dots — Next/Got it */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSlide((s) => Math.max(s - 1, 0))}
            disabled={isFirst}
            className="rounded-lg py-2 px-4 text-sm font-medium transition-colors"
            style={{
              background: '#0d1f2d',
              color: isFirst ? '#374151' : '#9ca3af',
              border: '1px solid #1e3a5f',
              cursor: isFirst ? 'default' : 'pointer',
              opacity: isFirst ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (isFirst) return
              ;(e.currentTarget as HTMLButtonElement).style.background = '#152840'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#e8edf2'
            }}
            onMouseLeave={(e) => {
              if (isFirst) return
              ;(e.currentTarget as HTMLButtonElement).style.background = '#0d1f2d'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'
            }}
          >
            Prev
          </button>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Go to step ${i + 1}`}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === slide ? '#2563eb' : '#1e3a5f',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'background-color 150ms',
                }}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={onClose}
              className="rounded-lg py-2 px-4 text-sm font-semibold transition-colors"
              style={{ background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#2563eb')}
            >
              Got it
            </button>
          ) : (
            <button
              onClick={() => setSlide((s) => Math.min(s + 1, SLIDES.length - 1))}
              className="rounded-lg py-2 px-4 text-sm font-semibold transition-colors"
              style={{ background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#2563eb')}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
