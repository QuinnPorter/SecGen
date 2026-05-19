'use client'

import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { useGameStore } from '@/lib/gameState'
import { NUMERIC_TO_ALPHA3, ALIGNMENT_COLORS, ALIGNMENT_HOVER_COLORS } from '@/lib/constants'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

export default function MapView() {
  const countries = useGameStore((s) => s.countries)
  const selectedCountry = useGameStore((s) => s.selectedCountry)
  const selectCountry = useGameStore((s) => s.selectCountry)

  return (
    <ComposableMap
      // Natural Earth 1 is visually near-identical to Robinson and is
      // available in d3-geo without additional packages.
      projection="geoNaturalEarth1"
      projectionConfig={{ center: [15, 54], scale: 680 }}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map((geo) => {
            const alpha3 = NUMERIC_TO_ALPHA3[geo.id as string]
            const country = alpha3 ? countries[alpha3] : undefined
            const alignment = country?.alignment ?? 'unknown'
            const isSelected = alpha3 !== undefined && selectedCountry === alpha3

            const fill = ALIGNMENT_COLORS[alignment]
            const hoverFill = ALIGNMENT_HOVER_COLORS[alignment]
            const strokeColor = isSelected ? '#f1f5f9' : '#0d1f2d'
            const strokeWidth = isSelected ? 2 : 0.4

            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                onClick={() => alpha3 && selectCountry(alpha3)}
                strokeDasharray={alignment === 'candidate' ? '4 2' : undefined}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                style={{
                  default: { fill, outline: 'none' },
                  hover: {
                    fill: hoverFill,
                    outline: 'none',
                    cursor: alpha3 ? 'pointer' : 'default',
                  },
                  pressed: { fill: hoverFill, outline: 'none' },
                }}
              />
            )
          })
        }
      </Geographies>
    </ComposableMap>
  )
}
