'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ComposableMap, Geographies, Geography, Graticule } from 'react-simple-maps'
import { useGameStore } from '@/lib/gameState'
import { NUMERIC_TO_ALPHA3, ALIGNMENT_COLORS, ALIGNMENT_HOVER_COLORS } from '@/lib/constants'

const GEO_URL = '/countries-110m.json'

const PROJECTION_CONFIGS = {
  'world': {
    projection: 'geoNaturalEarth1',
    config: { center: [0, 20] as [number, number], scale: 153 },
  },
  'nato-area': {
    projection: 'geoAzimuthalEqualArea',
    config: { center: [15, 54] as [number, number], scale: 600 },
  },
}

const LEGEND_ITEMS = [
  { color: '#1d4ed8', label: 'NATO Member',        dashed: false },
  { color: '#1e40af', label: 'Accession Candidate', dashed: true  },
  { color: '#374151', label: 'Neutral',             dashed: false },
  { color: '#991b1b', label: 'Adversary',           dashed: false },
]

function MapLegend() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        background: 'rgba(13,31,45,0.82)',
        borderRadius: 8,
        padding: '10px 12px',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {LEGEND_ITEMS.map(({ color, label, dashed }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: color,
              flexShrink: 0,
              border: dashed ? `2px dashed #93c5fd` : 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

export default function MapView() {
  const countries        = useGameStore((s) => s.countries)
  const selectedCountry  = useGameStore((s) => s.selectedCountry)
  const selectCountry    = useGameStore((s) => s.selectCountry)
  const registerCountry  = useGameStore((s) => s.registerCountry)
  const viewMode         = useGameStore((s) => s.viewMode)
  const crises           = useGameStore((s) => s.crises)

  // Set of country IDs that have an active or pending crisis
  const crisisCountryIds = useMemo(() => {
    const ids = new Set<string>()
    for (const c of crises) {
      if (c.status === 'active' || c.status === 'pending') ids.add(c.affectedCountryId)
    }
    return ids
  }, [crises])

  // Fade out → swap projection → fade in when viewMode changes
  const [opacity, setOpacity] = useState(1)
  const prevMode = useRef(viewMode)

  useEffect(() => {
    if (prevMode.current === viewMode) return
    setOpacity(0)
    const t = setTimeout(() => {
      prevMode.current = viewMode
      setOpacity(1)
    }, 180)
    return () => clearTimeout(t)
  }, [viewMode])

  const { projection, config } = PROJECTION_CONFIGS[viewMode]

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', opacity, transition: 'opacity 180ms ease' }}>
      {/* Crisis ring animation */}
      <style>{`
        @keyframes crisis-ring {
          0%, 100% { stroke: #f59e0b; stroke-width: 2; }
          50%       { stroke: #fbbf24; stroke-width: 3.5; }
        }
        .crisis-ring {
          animation: crisis-ring 1.5s ease-in-out infinite;
          stroke: #f59e0b !important;
          stroke-width: 2 !important;
        }
      `}</style>
      <ComposableMap
        projection={projection}
        projectionConfig={config}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {viewMode === 'world' && (
          <Graticule stroke="#1e3a5f" strokeWidth={0.3} />
        )}
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const alpha3        = NUMERIC_TO_ALPHA3[geo.id as string]
              const id            = alpha3 ?? (geo.id as string)
              const country       = countries[id]
              const alignment     = country?.alignment ?? 'neutral'
              const isSelected    = selectedCountry === id
              const isInProcess   = country?.inAccessionProcess === true

              const hasActiveCrisis = crisisCountryIds.has(id)
              const fill        = isInProcess ? '#60a5fa' : ALIGNMENT_COLORS[alignment]
              const hoverFill   = isInProcess ? '#93c5fd' : ALIGNMENT_HOVER_COLORS[alignment]
              const strokeColor = isSelected ? '#f1f5f9' : hasActiveCrisis ? '#f59e0b' : '#0d1f2d'
              const strokeWidth = isSelected ? 2 : hasActiveCrisis ? 2 : 0.4

              function handleClick() {
                if (!countries[id]) {
                  const props = geo.properties as { name?: string } | undefined
                  registerCountry({
                    id,
                    name:                props?.name ?? 'Unknown',
                    alignment:           'neutral',
                    region:              'Unknown',
                    readiness:           0,
                    fiscalPressure:      0,
                    allianceSatisfaction: 0,
                    threatLevel:         0,
                    gdpDefencePercent:   0,
                    population:          0,
                    notes:               'No strategic data available.',
                  })
                }
                selectCountry(id)
              }

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={handleClick}
                  className={hasActiveCrisis ? 'crisis-ring' : isInProcess ? 'accession-pulse' : undefined}
                  strokeDasharray={alignment === 'candidate' && !isInProcess ? '4 2' : undefined}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  style={{
                    default: { fill, outline: 'none' },
                    hover:   { fill: hoverFill, outline: 'none', cursor: 'pointer' },
                    pressed: { fill: hoverFill, outline: 'none' },
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      <MapLegend />
    </div>
  )
}
