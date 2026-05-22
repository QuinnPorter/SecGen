import type { GameState } from './gameState'

// ── Storage keys ──────────────────────────────────────────────────────────────

export const SAVE_KEY = 'nato-sg-save'
export const META_KEY = 'nato-sg-meta'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SaveMeta {
  savedAt: string        // ISO-8601 timestamp
  turn: number
  year: number
  quarter: number
  approvalRating: number
  memberCount: number
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(message: string): void {
  if (typeof document === 'undefined') return
  // Remove any existing toast
  document.getElementById('nato-sg-toast')?.remove()

  const toast = document.createElement('div')
  toast.id = 'nato-sg-toast'
  toast.textContent = message
  Object.assign(toast.style, {
    position:      'fixed',
    bottom:        '80px',
    left:          '50%',
    transform:     'translateX(-50%)',
    background:    '#0d1f2d',
    color:         '#93c5fd',
    border:        '1px solid #1e3a5f',
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
  setTimeout(() => toast.remove(), 1500)
}

// ── Save ──────────────────────────────────────────────────────────────────────

export function saveGame(state: GameState): void {
  if (typeof localStorage === 'undefined') return
  try {
    const natoMembers = Object.values(state.countries).filter((c) => c.alignment === 'nato')
    const meta: SaveMeta = {
      savedAt:       new Date().toISOString(),
      turn:          state.turn,
      year:          state.year,
      quarter:       state.quarter,
      approvalRating: state.approvalRating,
      memberCount:   natoMembers.length,
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    localStorage.setItem(META_KEY, JSON.stringify(meta))
    showToast('Game saved')
  } catch {
    // Storage unavailable or quota exceeded — silently ignore
  }
}

// ── Load ──────────────────────────────────────────────────────────────────────

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

export function loadGame(): GameState | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isValidState(parsed)) {
      localStorage.removeItem(SAVE_KEY)
      localStorage.removeItem(META_KEY)
      return null
    }
    // Migrate older saves missing the informationWarfare subsystem
    if (!parsed.informationWarfare || typeof parsed.informationWarfare.pressure !== 'number') {
      parsed.informationWarfare = { pressure: 20 }
    }
    // Migrate older saves missing the crisisPhase pacing state machine
    if (!parsed.crisisPhase || typeof parsed.crisisPhase.mode !== 'string') {
      parsed.crisisPhase = { mode: 'normal', turnsRemaining: 4 }
    }
    return parsed
  } catch {
    localStorage.removeItem(SAVE_KEY)
    localStorage.removeItem(META_KEY)
    return null
  }
}

export function loadMeta(): SaveMeta | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SaveMeta
  } catch {
    return null
  }
}

// ── Clear ─────────────────────────────────────────────────────────────────────

export function clearSave(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(SAVE_KEY)
  localStorage.removeItem(META_KEY)
}
