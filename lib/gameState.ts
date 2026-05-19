import { create } from 'zustand'
import countriesData from '../data/countries.json'
import { applyPassiveChanges } from './turnEngine'

export interface Country {
  id: string
  name: string
  alignment: 'nato' | 'neutral' | 'adversary' | 'candidate'
  region: string
  readiness: number          // 0–100, NATO members only
  fiscalPressure: number     // 0–100
  allianceSatisfaction: number // 0–100
  threatLevel: number        // 0–100
  gdpDefencePercent: number  // e.g. 1.8 for 1.8%
  population: number         // millions
  notes: string
}

export interface GameState {
  turn: number
  year: number
  quarter: 1 | 2 | 3 | 4
  approvalRating: number
  selectedCountry: string | null
  countries: Record<string, Country>

  selectCountry: (id: string | null) => void
  advanceTurn: () => void
}

export const useGameStore = create<GameState>((set) => ({
  turn: 1,
  year: 2024,
  quarter: 1 as const,
  approvalRating: 65,
  selectedCountry: null,
  countries: countriesData as Record<string, Country>,

  selectCountry: (id) => set({ selectedCountry: id }),

  advanceTurn: () =>
    set((state) => {
      const nextQ = state.quarter + 1
      const rollYear = nextQ > 4
      const passive = applyPassiveChanges(state)
      return {
        ...passive,
        turn: state.turn + 1,
        quarter: (rollYear ? 1 : nextQ) as 1 | 2 | 3 | 4,
        year: rollYear ? state.year + 1 : state.year,
      }
    }),
}))

export function selectAllianceReadiness(countries: Record<string, Country>): number {
  const members = Object.values(countries).filter((c) => c.alignment === 'nato')
  if (members.length === 0) return 0
  return Math.round(members.reduce((sum, c) => sum + c.readiness, 0) / members.length)
}
