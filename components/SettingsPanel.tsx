'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/gameState'
import { saveToSlot, latestSave, showToast, type SaveSlotMeta } from '@/lib/persistence'
import { X, Save, FolderOpen, Flag } from 'lucide-react'
import SaveBrowser from './SaveBrowser'

function lastSavedText(savedTurn: number, currentTurn: number): string {
  const delta = currentTurn - savedTurn
  if (delta <= 0) return 'Last saved: this turn'
  if (delta === 1) return 'Last saved: 1 turn ago'
  return `Last saved: ${delta} turns ago`
}

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Opens the new-game setup screen (abandons the current term). */
  onNewGame?: () => void
}

export default function SettingsPanel({ isOpen, onClose, onNewGame }: Props) {
  const turn = useGameStore((s) => s.turn)

  const [saveBrowserOpen, setSaveBrowserOpen] = useState(false)
  // Null on first render so SSR/CSR markup matches; loaded in the effect below.
  const [savedMeta, setSavedMeta] = useState<SaveSlotMeta | null>(null)

  // Refresh the "last saved" meta whenever the panel opens or a turn passes.
  useEffect(() => {
    if (isOpen) setSavedMeta(latestSave())
  }, [isOpen, turn])

  if (!isOpen) return null

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          width: 460,
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
              Settings
            </p>
            <h2
              className="font-serif font-semibold tracking-tight"
              style={{ fontSize: 20, color: '#1c1917', letterSpacing: '-0.01em' }}
            >
              Save &amp; Load
            </h2>
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
            aria-label="Close settings panel"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
          <button
            onClick={() => {
              if (saveToSlot(useGameStore.getState())) showToast('Game saved')
              setSavedMeta(latestSave())
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: '#004990',
              color: '#fff',
              boxShadow: '0 1px 2px rgba(0, 73, 144, 0.18), 0 2px 4px rgba(0, 73, 144, 0.12)',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#003a78')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#004990')}
          >
            <Save size={15} strokeWidth={2} />
            Save game
          </button>

          <button
            onClick={() => setSaveBrowserOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors"
            style={{ background: '#fafaf9', color: '#57534e', border: '1px solid #e7e5e0' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = '#004990'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#004990'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = '#57534e'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
            }}
          >
            <FolderOpen size={15} strokeWidth={2} />
            Load / manage saves…
          </button>

          {savedMeta && (
            <p className="text-center text-xs tabular-nums" style={{ color: '#a8a29e' }}>
              {lastSavedText(savedMeta.turn, turn)}
            </p>
          )}

          <p className="text-xs leading-relaxed pt-1" style={{ color: '#78716c' }}>
            Saves are stored in this browser. Use Load / manage saves to rename, delete,
            import, or export games as files you can back up or move between devices.
          </p>

          {onNewGame && (
            <>
              <div style={{ height: 1, background: '#e7e5e0', margin: '6px 0 2px' }} />
              <button
                onClick={onNewGame}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors"
                style={{ background: '#fafaf9', color: '#57534e', border: '1px solid #e7e5e0' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#b91c1c'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#b91c1c'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#57534e'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e7e5e0'
                }}
              >
                <Flag size={15} strokeWidth={2} />
                New game…
              </button>
              <p className="text-xs leading-relaxed" style={{ color: '#a8a29e' }}>
                Starts a fresh term. Save first if you want to keep the current game.
              </p>
            </>
          )}
        </div>
      </div>
    </div>

    {saveBrowserOpen && (
      <SaveBrowser
        confirmReplace
        onClose={() => setSaveBrowserOpen(false)}
        onLoaded={() => { setSavedMeta(latestSave()); onClose() }}
      />
    )}
    </>
  )
}
