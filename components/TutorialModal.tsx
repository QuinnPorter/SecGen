'use client'

import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

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
      <p className="text-sm leading-relaxed" style={{ color: '#57534e' }}>
        You&apos;re the Secretary General. Steer the alliance through a 20-year term —
        keep NATO cohesive, ready, and growing as you respond to crises.
      </p>
    ),
  },
  {
    title: 'The map is your board',
    body: (
      <p className="text-sm leading-relaxed" style={{ color: '#57534e' }}>
        Click any country on the world map to open its detail panel. That&apos;s where
        you inspect members, candidates, and adversaries — and take country-level
        actions when events demand a response.
      </p>
    ),
  },
  {
    title: 'Your sidebar runs the turn',
    body: (
      <ul className="text-sm leading-relaxed space-y-1.5" style={{ color: '#57534e' }}>
        <li><span className="font-semibold" style={{ color: '#1c1917' }}>End Turn</span> — advances time (your primary action)</li>
        <li><span className="font-semibold" style={{ color: '#1c1917' }}>Budget</span> — allocate defence spending</li>
        <li><span className="font-semibold" style={{ color: '#1c1917' }}>Expansion</span> — manage accession candidates</li>
        <li><span className="font-semibold" style={{ color: '#1c1917' }}>Attention</span> — members needing follow-up</li>
        <li><span className="font-semibold" style={{ color: '#1c1917' }}>Save</span> — store your progress</li>
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
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-8 relative"
        style={{
          width: 440,
          maxWidth: 'calc(100vw - 32px)',
          background: '#fafaf9',
          border: '1px solid #e7e5e0',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)',
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
            color: '#78716c',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#1c1917')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#78716c')}
        >
          <X size={16} strokeWidth={2} />
        </button>

        {/* Eyebrow */}
        <p
          className="text-xs font-black uppercase tracking-widest mb-3 tabular-nums"
          style={{ color: '#a8a29e', letterSpacing: '0.2em' }}
        >
          Tutorial — Step {slide + 1} of {SLIDES.length}
        </p>

        {/* Title */}
        <h2
          className="font-serif font-semibold mb-4 tracking-tight"
          style={{ fontSize: 22, color: '#1c1917', letterSpacing: '-0.01em' }}
        >
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
            className="flex items-center gap-1 rounded-lg py-2 px-3 text-sm font-medium transition-colors"
            style={{
              background: '#fafaf9',
              color: isFirst ? '#d6d3d1' : '#57534e',
              border: '1px solid #e7e5e0',
              cursor: isFirst ? 'default' : 'pointer',
              opacity: isFirst ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (isFirst) return
              ;(e.currentTarget as HTMLButtonElement).style.background = '#f5f3ef'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#1c1917'
            }}
            onMouseLeave={(e) => {
              if (isFirst) return
              ;(e.currentTarget as HTMLButtonElement).style.background = '#fafaf9'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#57534e'
            }}
          >
            <ChevronLeft size={14} strokeWidth={2} />
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
                  background: i === slide ? '#004990' : '#e7e5e0',
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
              style={{
                background: '#004990',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 73, 144, 0.18), 0 2px 4px rgba(0, 73, 144, 0.12)',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#003a78')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#004990')}
            >
              Got it
            </button>
          ) : (
            <button
              onClick={() => setSlide((s) => Math.min(s + 1, SLIDES.length - 1))}
              className="flex items-center gap-1 rounded-lg py-2 px-3 text-sm font-semibold transition-colors"
              style={{
                background: '#004990',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 73, 144, 0.18), 0 2px 4px rgba(0, 73, 144, 0.12)',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#003a78')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#004990')}
            >
              Next
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
