'use client'

import { useGameStore, Country } from '@/lib/gameState'

const NATO_ACCESSION_YEAR: Record<string, number> = {
  USA: 1949, CAN: 1949, GBR: 1949, FRA: 1949, ITA: 1949,
  NLD: 1949, BEL: 1949, PRT: 1949, DNK: 1949, NOR: 1949,
  ISL: 1949, LUX: 1949,
  GRC: 1952, TUR: 1952,
  DEU: 1955,
  ESP: 1982,
  CZE: 1999, HUN: 1999, POL: 1999,
  BGR: 2004, EST: 2004, LVA: 2004, LTU: 2004,
  ROU: 2004, SVK: 2004, SVN: 2004,
  ALB: 2009, HRV: 2009,
  MNE: 2017,
  MKD: 2020,
}

const ALIGNMENT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  nato:      { label: 'NATO Member',  bg: '#1d4ed8', color: '#fff' },
  adversary: { label: 'Adversary',    bg: '#991b1b', color: '#fff' },
  candidate: { label: 'Candidate',    bg: '#1e3a8a', color: '#93c5fd' },
  neutral:   { label: 'Neutral',      bg: '#374151', color: '#d1d5db' },
}

function StatBar({
  label,
  value,
  max = 100,
  barColor,
}: {
  label: string
  value: number
  max?: number
  barColor: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: '#9ca3af' }}>
        <span>{label}</span>
        <span style={{ color: '#e8edf2' }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#0d1f2d' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  )
}

function GdpBar({ country }: { country: Country }) {
  const pct = country.gdpDefencePercent
  const barColor = pct >= 2 ? '#16a34a' : '#dc2626'
  const textColor = pct >= 2 ? '#4ade80' : '#f87171'
  const barWidth = Math.min(100, (pct / 5) * 100) // scale: 5% = full bar

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: '#9ca3af' }}>
        <span>Defence spending</span>
        <span style={{ color: textColor }}>
          {pct > 0 ? `${pct.toFixed(1)}% GDP` : 'N/A'}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#0d1f2d' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%`, background: barColor }}
        />
      </div>
      <div className="flex justify-between text-xs mt-0.5" style={{ color: '#4b5563' }}>
        <span>0%</span>
        <span>2%</span>
        <span>5%</span>
      </div>
    </div>
  )
}

export default function CountryPanel() {
  const selectedCountry = useGameStore((s) => s.selectedCountry)
  const countries = useGameStore((s) => s.countries)
  const selectCountry = useGameStore((s) => s.selectCountry)

  const isOpen = selectedCountry !== null
  const country = selectedCountry ? countries[selectedCountry] : null
  const badge = country ? ALIGNMENT_BADGE[country.alignment] : null

  return (
    <div
      className="absolute right-0 top-0 h-full overflow-y-auto z-20"
      style={{
        width: 380,
        background: '#152840',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 280ms ease-in-out',
        borderLeft: '1px solid #1e3a5f',
      }}
    >
      {country && badge && (
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h2 className="font-semibold leading-tight" style={{ fontSize: 24, color: '#e8edf2' }}>
                {country.name}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>
                {country.region}
              </p>
            </div>
            <button
              onClick={() => selectCountry(null)}
              className="flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
              style={{
                width: 28,
                height: 28,
                background: '#1e3a5f',
                color: '#9ca3af',
              }}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          {/* Alignment badge */}
          <div className="flex items-center gap-3 mb-5">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
            {country.alignment === 'nato' && NATO_ACCESSION_YEAR[country.id] && (
              <span className="text-xs" style={{ color: '#6b7280' }}>
                Member since {NATO_ACCESSION_YEAR[country.id]}
              </span>
            )}
          </div>

          {/* Stats */}
          <div
            className="rounded-lg p-4 mb-5"
            style={{ background: '#0d1f2d' }}
          >
            <GdpBar country={country} />

            {country.alignment === 'nato' && (
              <StatBar
                label="Alliance satisfaction"
                value={country.allianceSatisfaction}
                barColor="#2563eb"
              />
            )}

            <StatBar
              label="Threat level"
              value={country.threatLevel}
              barColor={country.threatLevel >= 60 ? '#dc2626' : '#f59e0b'}
            />

            <StatBar
              label="Fiscal pressure"
              value={country.fiscalPressure}
              barColor={country.fiscalPressure >= 60 ? '#f59e0b' : '#6b7280'}
            />
          </div>

          {/* Flavour text */}
          <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
            {country.notes}
          </p>
        </div>
      )}
    </div>
  )
}
