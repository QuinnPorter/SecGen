'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/gameState'
import { loadGame, loadMeta, type SaveMeta } from '@/lib/persistence'
import HUD from './HUD'
import Sidebar from './Sidebar'
import MapView from './MapView'
import CountryPanel from './CountryPanel'
import IntelBrief from './IntelBrief'
import EndGameScreen from './EndGameScreen'
import NewGameModal, { type NewGameConfig } from './NewGameModal'
import TurnSummary from './TurnSummary'
import TutorialModal from './TutorialModal'

// ── Load-save modal ───────────────────────────────────────────────────────────

function LoadModal({
  meta,
  onContinue,
  onNewGame,
}: {
  meta: SaveMeta
  onContinue: () => void
  onNewGame: () => void
}) {
  const QUARTER_LABELS = ['', 'Q1', 'Q2', 'Q3', 'Q4']
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <div
        className="rounded-xl p-8"
        style={{
          width: 400,
          background: '#fafaf9',
          border: '1px solid #e7e5e0',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)',
        }}
      >
        {/* Header */}
        <p
          className="text-xs font-black uppercase tracking-widest mb-3"
          style={{ color: '#a8a29e', letterSpacing: '0.2em' }}
        >
          NATO Secretary General
        </p>
        <h2
          className="font-serif font-semibold mb-2 tracking-tight"
          style={{ fontSize: 22, color: '#1c1917', letterSpacing: '-0.01em' }}
        >
          Continue saved game?
        </h2>
        <p className="text-sm mb-6" style={{ color: '#57534e' }}>
          A saved term was found on this device.
        </p>

        {/* Save summary */}
        <div
          className="rounded-lg p-4 mb-6 space-y-2"
          style={{ background: '#f5f3ef', border: '1px solid #e7e5e0' }}
        >
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: '#78716c' }}>Turn</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: '#1c1917' }}>{meta.turn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: '#78716c' }}>Date</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: '#1c1917' }}>
              {QUARTER_LABELS[meta.quarter]} {meta.year}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: '#78716c' }}>Approval rating</span>
            <span
              className="text-xs font-semibold tabular-nums"
              style={{ color: meta.approvalRating >= 50 ? '#15803d' : '#dc2626' }}
            >
              {meta.approvalRating}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: '#78716c' }}>Member states</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: '#004990' }}>{meta.memberCount}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onNewGame}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors"
            style={{ background: '#fafaf9', color: '#57534e', border: '1px solid #e7e5e0' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#f5f3ef'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#1c1917'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#a8a29e'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#fafaf9'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#57534e'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
            }}
          >
            New Game
          </button>
          <button
            onClick={onContinue}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: '#004990',
              color: '#fff',
              boxShadow: '0 1px 2px rgba(0, 73, 144, 0.18), 0 2px 4px rgba(0, 73, 144, 0.12)',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#003a78')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#004990')}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Game() {
  const [briefOpen,    setBriefOpen]  = useState(false)
  const [reviewMode,   setReviewMode] = useState(false)
  const [loadMeta_,    setLoadMeta]   = useState<SaveMeta | null>(null)
  const [showNewGame,  setShowNewGame] = useState(false)
  const [briefPending, setBriefPending] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const turn              = useGameStore((s) => s.turn)
  const gameOutcome       = useGameStore((s) => s.gameOutcome)
  const showTurnSummary   = useGameStore((s) => s.showTurnSummary)
  const advanceTurn       = useGameStore((s) => s.advanceTurn)
  const dismissTurnSummary = useGameStore((s) => s.dismissTurnSummary)

  // On mount: check for an existing save and show the modal if found
  useEffect(() => {
    const meta = loadMeta()
    if (meta) setLoadMeta(meta)
  }, [])

  // On mount: auto-open tutorial for first-time visitors
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('nato-sg:tutorial-seen')) {
      setTutorialOpen(true)
      localStorage.setItem('nato-sg:tutorial-seen', '1')
    }
  }, [])

  // When a new game starts (gameOutcome clears to null), exit review mode
  useEffect(() => {
    if (!gameOutcome) setReviewMode(false)
  }, [gameOutcome])

  useEffect(() => {
    // Read fresh state to avoid stale closure — brief opens on crises OR scenario events.
    // If TurnSummary is showing, defer the brief until it's dismissed.
    const { crises, activeScenarios, showTurnSummary: summaryShowing } = useGameStore.getState()
    const hasActive   = crises.some((c) => c.status === 'active' && c.turnsUntilActive === 0)
    const hasScenario = activeScenarios.length > 0
    if (hasActive || hasScenario) {
      if (summaryShowing) {
        setBriefPending(true)
      } else {
        setBriefOpen(true)
      }
    }
  }, [turn])

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  // Space / Enter → advance turn   Escape → close topmost overlay
  // I → open IntelBrief (if crises present)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore shortcuts when focus is inside an interactive element
      const tag = (e.target as Element).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return

      const anyOverlay = briefOpen || showTurnSummary || showNewGame || !!loadMeta_

      if (e.code === 'Space' || e.code === 'Enter') {
        if (anyOverlay || gameOutcome !== null) return
        e.preventDefault()
        advanceTurn()
        return
      }

      if (e.key === 'Escape') {
        if (briefOpen)        { setBriefOpen(false);    return }
        if (showTurnSummary)  { dismissTurnSummary();    return }
        return
      }

      if (e.key === 'i' || e.key === 'I') {
        if (anyOverlay || gameOutcome !== null) return
        const { crises, activeScenarios } = useGameStore.getState()
        const hasAlert =
          crises.some((c) => c.status === 'active' && c.turnsUntilActive === 0) ||
          activeScenarios.length > 0
        if (hasAlert) setBriefOpen(true)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [briefOpen, showTurnSummary, showNewGame, loadMeta_, gameOutcome, advanceTurn, dismissTurnSummary])

  // When TurnSummary is dismissed, open IntelBrief if one was pending
  useEffect(() => {
    if (!showTurnSummary && briefPending) {
      setBriefPending(false)
      const { crises, activeScenarios } = useGameStore.getState()
      const hasActive   = crises.some((c) => c.status === 'active' && c.turnsUntilActive === 0)
      const hasScenario = activeScenarios.length > 0
      if (hasActive || hasScenario) setBriefOpen(true)
    }
  }, [showTurnSummary, briefPending])

  function handleContinue() {
    const saved = loadGame()
    if (saved) useGameStore.setState(saved)
    setLoadMeta(null)
  }

  // "New Game" from load modal → go to setup screen
  function handleNewGameFromLoad() {
    setLoadMeta(null)
    setShowNewGame(true)
  }

  // "New Term" from end game screen → go to setup screen
  function handleNewTerm() {
    setReviewMode(false)
    setShowNewGame(true)
  }

  // "Begin Term" from setup screen → start game with chosen config
  function handleStart(config: NewGameConfig) {
    useGameStore.getState().startNewGame(config)
    setShowNewGame(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: '#0d1f2d' }}>
      <HUD
        onOpenBrief={() => setBriefOpen(true)}
        onOpenTutorial={() => setTutorialOpen(true)}
      />
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MapView />
        </div>
        <CountryPanel />
      </div>
      <TurnSummary />
      <IntelBrief isOpen={briefOpen} onClose={() => setBriefOpen(false)} />
      {gameOutcome && !reviewMode && (
        <EndGameScreen
          onReviewMap={() => setReviewMode(true)}
          onNewTerm={handleNewTerm}
        />
      )}
      {loadMeta_ && (
        <LoadModal
          meta={loadMeta_}
          onContinue={handleContinue}
          onNewGame={handleNewGameFromLoad}
        />
      )}
      {showNewGame && (
        <NewGameModal onStart={handleStart} />
      )}
      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </div>
  )
}
