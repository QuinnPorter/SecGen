import type { GameState } from './gameState'

// ── Storage keys ──────────────────────────────────────────────────────────────

export const INDEX_KEY = 'nato-sg-saves'      // JSON array of SaveSlotMeta
export const AUTOSAVE_ID = '__autosave__'      // reserved slot, overwritten each turn
export const SAVE_FORMAT = 'nato-sg-save'      // marker for exported files
export const SAVE_VERSION = 1

// Legacy single-slot keys (pre slot-model); migrated on first read.
const LEGACY_SAVE_KEY = 'nato-sg-save'
const LEGACY_META_KEY = 'nato-sg-meta'

const slotKey = (id: string) => `nato-sg-save:${id}`

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SaveMeta {
  savedAt: string        // ISO-8601 timestamp
  turn: number
  year: number
  quarter: number
  approvalRating: number
  memberCount: number
}

export interface SaveSlotMeta extends SaveMeta {
  id: string
  name: string
  auto?: boolean         // true for the dedicated autosave slot
}

export interface SaveFile {
  format: typeof SAVE_FORMAT
  version: number
  savedAt: string
  meta: SaveMeta
  state: GameState
}

const QUARTER_LABELS = ['', 'Q1', 'Q2', 'Q3', 'Q4']

// ── Toast ─────────────────────────────────────────────────────────────────────

export function showToast(message: string, kind: 'info' | 'error' = 'info'): void {
  if (typeof document === 'undefined') return
  document.getElementById('nato-sg-toast')?.remove()

  const toast = document.createElement('div')
  toast.id = 'nato-sg-toast'
  toast.textContent = message
  Object.assign(toast.style, {
    position:      'fixed',
    bottom:        '80px',
    left:          '50%',
    transform:     'translateX(-50%)',
    background:    kind === 'error' ? '#3b0d0d' : '#0d1f2d',
    color:         kind === 'error' ? '#fca5a5' : '#93c5fd',
    border:        `1px solid ${kind === 'error' ? '#7f1d1d' : '#1e3a5f'}`,
    borderRadius:  '6px',
    padding:       '8px 20px',
    fontSize:      '13px',
    fontWeight:    '600',
    letterSpacing: '0.03em',
    zIndex:        '99999',
    pointerEvents: 'none',
    boxShadow:     '0 4px 24px rgba(0,0,0,0.6)',
  })
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), kind === 'error' ? 2500 : 1500)
}

// ── Validation & migration ──────────────────────────────────────────────────────

function isValidState(obj: unknown): obj is GameState {
  if (!obj || typeof obj !== 'object') return false
  const s = obj as Record<string, unknown>
  return (
    typeof s.turn          === 'number' &&
    typeof s.year          === 'number' &&
    typeof s.approvalRating === 'number' &&
    typeof s.countries     === 'object' && s.countries !== null &&
    Array.isArray(s.crises)
  )
}

// Bring an older save forward to the current schema. Mutates and returns the state.
function migrate(state: GameState): GameState {
  if (!state.informationWarfare || typeof state.informationWarfare.pressure !== 'number') {
    state.informationWarfare = { pressure: 20 }
  }
  if (!state.crisisPhase || typeof state.crisisPhase.mode !== 'string') {
    state.crisisPhase = { mode: 'normal', turnsRemaining: 4 }
  }
  return state
}

// ── Meta & naming helpers ───────────────────────────────────────────────────────

function metaFromState(state: GameState): SaveMeta {
  const memberCount = Object.values(state.countries).filter((c) => c.alignment === 'nato').length
  return {
    savedAt:        new Date().toISOString(),
    turn:           state.turn,
    year:           state.year,
    quarter:        state.quarter,
    approvalRating: state.approvalRating,
    memberCount,
  }
}

export function defaultSaveName(state: GameState): string {
  return `Term · ${QUARTER_LABELS[state.quarter]} ${state.year}`
}

// ── Index helpers ───────────────────────────────────────────────────────────────

function readIndex(): SaveSlotMeta[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SaveSlotMeta[]) : []
  } catch {
    return []
  }
}

function writeIndex(index: SaveSlotMeta[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))
}

// One-time migration of the old single-slot save into the new index as the autosave.
function migrateLegacy(): void {
  if (typeof localStorage === 'undefined') return
  try {
    if (localStorage.getItem(INDEX_KEY)) return // already on the slot model
    const raw = localStorage.getItem(LEGACY_SAVE_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (!isValidState(parsed)) return
    const slot: SaveSlotMeta = { ...metaFromState(parsed), id: AUTOSAVE_ID, name: 'Autosave', auto: true }
    localStorage.setItem(slotKey(AUTOSAVE_ID), JSON.stringify(parsed))
    writeIndex([slot])
    localStorage.removeItem(LEGACY_SAVE_KEY)
    localStorage.removeItem(LEGACY_META_KEY)
  } catch {
    // ignore — leave legacy keys untouched if anything goes wrong
  }
}

// ── Public API ──────────────────────────────────────────────────────────────────

export function listSaves(): SaveSlotMeta[] {
  if (typeof localStorage === 'undefined') return []
  migrateLegacy()
  return readIndex().sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

// The save "Continue" should resume: the live autosave if present, else the newest.
export function latestSave(): SaveSlotMeta | null {
  const all = listSaves()
  if (all.length === 0) return null
  return all.find((s) => s.auto) ?? all[0]
}

export function saveToSlot(
  state: GameState,
  opts?: { id?: string; name?: string; auto?: boolean },
): SaveSlotMeta | null {
  if (typeof localStorage === 'undefined') return null
  migrateLegacy()
  try {
    const index = readIndex()
    const id = opts?.id ?? newId()
    const existing = index.find((s) => s.id === id)
    const slot: SaveSlotMeta = {
      ...metaFromState(state),
      id,
      name: opts?.name ?? existing?.name ?? defaultSaveName(state),
      auto: opts?.auto ?? existing?.auto,
    }
    localStorage.setItem(slotKey(id), JSON.stringify(state))
    writeIndex([...index.filter((s) => s.id !== id), slot])
    return slot
  } catch {
    showToast('Save failed — browser storage is full', 'error')
    return null
  }
}

// Convenience wrapper used by the turn engine. Overwrites the reserved autosave slot.
export function autosave(state: GameState): void {
  if (saveToSlot(state, { id: AUTOSAVE_ID, name: 'Autosave', auto: true })) {
    showToast('Game saved')
  }
}

export function loadSlot(id: string): GameState | null {
  if (typeof localStorage === 'undefined') return null
  migrateLegacy()
  try {
    const raw = localStorage.getItem(slotKey(id))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isValidState(parsed)) return null
    return migrate(parsed)
  } catch {
    return null
  }
}

export function renameSlot(id: string, name: string): void {
  if (typeof localStorage === 'undefined') return
  const index = readIndex()
  const slot = index.find((s) => s.id === id)
  if (!slot) return
  slot.name = name.trim() || slot.name
  writeIndex(index)
}

export function deleteSlot(id: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(slotKey(id))
  writeIndex(readIndex().filter((s) => s.id !== id))
}

export function clearSave(): void {
  if (typeof localStorage === 'undefined') return
  for (const slot of readIndex()) localStorage.removeItem(slotKey(slot.id))
  localStorage.removeItem(INDEX_KEY)
  localStorage.removeItem(LEGACY_SAVE_KEY)
  localStorage.removeItem(LEGACY_META_KEY)
}

// ── File export / import ─────────────────────────────────────────────────────────

export function exportSave(state: GameState, name?: string): void {
  if (typeof document === 'undefined') return
  const meta = metaFromState(state)
  const file: SaveFile = { format: SAVE_FORMAT, version: SAVE_VERSION, savedAt: meta.savedAt, meta, state }
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFilename(name ?? defaultSaveName(state), meta)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  showToast('Save exported')
}

export function importSaveFile(file: File): Promise<{ state: GameState; meta: SaveMeta } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result))
        const state = unwrapSaveFile(parsed)
        if (!isValidState(state)) {
          showToast('Invalid save file', 'error')
          resolve(null)
          return
        }
        const migrated = migrate(state)
        resolve({ state: migrated, meta: metaFromState(migrated) })
      } catch {
        showToast('Could not read save file', 'error')
        resolve(null)
      }
    }
    reader.onerror = () => {
      showToast('Could not read save file', 'error')
      resolve(null)
    }
    reader.readAsText(file)
  })
}

// ── Internal helpers ────────────────────────────────────────────────────────────

// Accept either a wrapped SaveFile or a bare GameState (legacy exports / hand-edits).
function unwrapSaveFile(parsed: unknown): unknown {
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    if (obj.format === SAVE_FORMAT && obj.state) return obj.state
  }
  return parsed
}

function exportFilename(name: string, meta: SaveMeta): string {
  const safe = name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'save'
  return `nato-sg-${safe}-T${meta.turn}-${meta.year}Q${meta.quarter}.json`
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
