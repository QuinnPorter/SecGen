'use client'

import HUD from './HUD'
import Sidebar from './Sidebar'
import MapView from './MapView'
import CountryPanel from './CountryPanel'

export default function Game() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: '#0d1f2d' }}>
      <HUD />
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MapView />
        </div>
        <CountryPanel />
      </div>
    </div>
  )
}
