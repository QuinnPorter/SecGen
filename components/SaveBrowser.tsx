'use client'

import { useRef, useState } from 'react'
import { useGameStore, type GameState } from '@/lib/gameState'
import {
  listSaves,
  loadSlot,
  deleteSlot,
  renameSlot,
  saveToSlot,
  exportSave,
  importSaveFile,
  showToast,
  defaultSaveName,
  type SaveSlotMeta,
} from '@/lib/persistence'

const QUARTER_LABELS = ['', 'Q1', 'Q2', 'Q3', 'Q4']

interface Props {
  onClose: () => void
  // Called after a save is loaded into the store, so the parent can dismiss its menus.
  onLoaded?: () => void
  // When true (in-game), confirm before replacing the running game.
  confirmReplace?: boolean
}

export default function SaveBrowser({ onClose, onLoaded, confirmReplace = false }: Props) {
  const [saves, setSaves]         = useState<SaveSlotMeta[]>(() => listSaves())
  const [renamingId, setRenaming] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = () => setSaves(listSaves())

  function applyState(state: GameState) {
    useGameStore.setState(state)
    onLoaded?.()
    onClose()
  }

  function handleLoad(id: string) {
    const state = loadSlot(id)
    if (!state) {
      showToast('Could not load that save', 'error')
      refresh()
      return
    }
    if (confirmReplace && !window.confirm('Load this game? Unsaved progress in the current term will be lost.')) {
      return
    }
    applyState(state)
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this saved game? This cannot be undone.')) return
    deleteSlot(id)
    refresh()
  }

  function startRename(slot: SaveSlotMeta) {
    setRenaming(slot.id)
    setDraftName(slot.name)
  }

  function commitRename() {
    if (renamingId) renameSlot(renamingId, draftName)
    setRenaming(null)
    refresh()
  }

  function handleExport(id: string) {
    const state = loadSlot(id)
    const slot = saves.find((s) => s.id === id)
    if (!state) {
      showToast('Could not export that save', 'error')
      return
    }
    exportSave(state, slot?.name)
  }

  function handleExportCurrent() {
    exportSave(useGameStore.getState())
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file later
    if (!file) return
    const result = await importSaveFile(file)
    if (!result) return // toast already shown
    const slot = saveToSlot(result.state, { name: defaultSaveName(result.state) })
    refresh()
    showToast('Save imported')
    if (slot) {
      if (confirmReplace && !window.confirm('Load the imported game now?')) return
      applyState(result.state)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center"
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-8 flex flex-col"
        style={{
          width: 480,
          maxHeight: '80vh',
          background: '#fafaf9',
          border: '1px solid #e7e5e0',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#a8a29e', letterSpacing: '0.2em' }}>
          NATO Secretary General
        </p>
        <h2 className="font-serif font-semibold mb-1 tracking-tight" style={{ fontSize: 22, color: '#1c1917', letterSpacing: '-0.01em' }}>
          Load Game
        </h2>
        <p className="text-sm mb-5" style={{ color: '#57534e' }}>
          Saved terms on this device. Import a file to bring a save from elsewhere.
        </p>

        {/* Slot list */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2" style={{ minHeight: 80 }}>
          {saves.length === 0 ? (
            <div
              className="rounded-lg p-6 text-center text-sm"
              style={{ background: '#f5f3ef', border: '1px dashed #d6d3cd', color: '#78716c' }}
            >
              No saved games yet. Import a file below to add one.
            </div>
          ) : (
            saves.map((slot) => (
              <div
                key={slot.id}
                className="rounded-lg p-3"
                style={{ background: '#f5f3ef', border: '1px solid #e7e5e0' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {renamingId === slot.id ? (
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename()
                          if (e.key === 'Escape') setRenaming(null)
                        }}
                        className="w-full rounded px-2 py-1 text-sm font-semibold"
                        style={{ background: '#fff', border: '1px solid #004990', color: '#1c1917' }}
                      />
                    ) : (
                      <p className="text-sm font-semibold truncate flex items-center gap-2" style={{ color: '#1c1917' }}>
                        {slot.name}
                        {slot.auto && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: '#e0ecf8', color: '#004990' }}
                          >
                            Auto
                          </span>
                        )}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs tabular-nums" style={{ color: '#78716c' }}>
                      <span>Turn {slot.turn}</span>
                      <span style={{ color: '#d6d3cd' }}>·</span>
                      <span>{QUARTER_LABELS[slot.quarter]} {slot.year}</span>
                      <span style={{ color: '#d6d3cd' }}>·</span>
                      <span style={{ color: slot.approvalRating >= 50 ? '#15803d' : '#dc2626' }}>
                        {slot.approvalRating}% approval
                      </span>
                      <span style={{ color: '#d6d3cd' }}>·</span>
                      <span style={{ color: '#004990' }}>{slot.memberCount} members</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLoad(slot.id)}
                    className="flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{ background: '#004990', color: '#fff' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#003a78')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#004990')}
                  >
                    Load
                  </button>
                </div>
                {/* Row actions */}
                <div className="flex gap-3 mt-2 text-xs">
                  <RowAction onClick={() => startRename(slot)}>Rename</RowAction>
                  <RowAction onClick={() => handleExport(slot.id)}>Export</RowAction>
                  <RowAction onClick={() => handleDelete(slot.id)} danger>Delete</RowAction>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 flex items-center gap-3" style={{ borderTop: '1px solid #e7e5e0' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors"
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
            Import from file…
          </button>
          <button
            onClick={handleExportCurrent}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors"
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
            Export current game
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-3 text-xs font-medium transition-colors self-center"
          style={{ color: '#a8a29e' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#57534e')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#a8a29e')}
        >
          Close
        </button>
      </div>
    </div>
  )
}

function RowAction({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  const base = danger ? '#b91c1c' : '#78716c'
  const hover = danger ? '#dc2626' : '#004990'
  return (
    <button
      onClick={onClick}
      className="font-medium transition-colors"
      style={{ color: base }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = hover)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = base)}
    >
      {children}
    </button>
  )
}
