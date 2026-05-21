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
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="rounded-xl p-8"
        style={{
          width: 400,
          background: '#0d1f2d',
          border: '1px solid #1e3a5f',
          boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
        }}
      >
        {/* Header */}
        <p
          className="text-xs font-black uppercase tracking-widest mb-4"
          style={{ color: '#374151', letterSpacing: '0.2em' }}
        >
          NATO Secretary General
        </p>
        <h2 className="font-bold mb-1" style={{ fontSize: 20, color: '#e8edf2' }}>
          Continue saved game?
        </h2>
        <p className="text-sm mb-6" style={{ color: '#4b5563' }}>
          A saved term was found on this device.
        </p>

        {/* Save summary */}
        <div
          className="rounded-lg p-4 mb-6 space-y-2"
          style={{ background: '#060f1a', border: '1px solid #1e3a5f' }}
        >
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: '#6b7280' }}>Turn</span>
            <span className="text-xs font-semibold" style={{ color: '#e8edf2' }}>{meta.turn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: '#6b7280' }}>Date</span>
            <span className="text-xs font-semibold" style={{ color: '#e8edf2' }}>
              {QUARTER_LABELS[meta.quarter]} {meta.year}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: '#6b7280' }}>Approval rating</span>
            <span
              className="text-xs font-semibold"
              style={{ color: meta.approvalRating >= 50 ? '#4ade80' : '#f87171' }}
            >
              {meta.approvalRating}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: '#6b7280' }}>Member states</span>
            <span className="text-xs font-semibold" style={{ color: '#93c5fd' }}>{meta.memberCount}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onNewGame}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors"
            style={{ background: '#0d1f2d', color: '#9ca3af', border: '1px solid #1e3a5f' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#152840'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#e8edf2'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#0d1f2d'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'
            }}
          >
            New Game
          </button>
          <button
            onClick={onContinue}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors"
            style={{ background: '#2563eb', color: '#fff' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#2563eb')}
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
      <HUD onOpenBrief={() => setBriefOpen(true)} />
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
    </div>
  )
}
