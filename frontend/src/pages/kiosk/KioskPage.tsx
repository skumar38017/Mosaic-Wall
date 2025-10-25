import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import Grid from '../kiosk/components/Grid'
import { useWebSocketManager } from '../kiosk/components/WebSocketManager'
import { usePhotoManager } from '../kiosk/components/PhotoManager'

interface Photo {
  id: string
  image_data: string
  timestamp: string
  x: number
  y: number
  animation: string
}

function App() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const [gridInfo, setGridInfo] = useState({ cols: 0, rows: 0 })

  const handleGridUpdate = useCallback((cols: number, rows: number) => {
    setGridInfo(prev => {
      if (prev.cols !== cols || prev.rows !== rows) {
        return { cols, rows }
      }
      return prev
    })
  }, [])

  const { addPhoto } = usePhotoManager({ photos, gridInfo, setPhotos })
  const { connectWebSocket, cleanup } = useWebSocketManager({
    onMessage: addPhoto,
    onStatusChange: setConnectionStatus
  })

  useEffect(() => {
    connectWebSocket()
    return cleanup
  }, [connectWebSocket, cleanup])

  // map photo.id -> assigned grid index (persists across renders)
  const photoCellMapRef = useRef<Map<string, number>>(new Map())

  // Ensure each photo is assigned a random empty cell index (when possible)
  useEffect(() => {
    const cols = Math.max(1, gridInfo.cols)
    const rows = Math.max(1, gridInfo.rows)
    const total = cols * rows
    const map = photoCellMapRef.current

    // remove mappings for photos that no longer exist
    for (const id of Array.from(map.keys())) {
      if (!photos.find(p => p.id === id)) map.delete(id)
    }

    // occupied indices
    const used = new Set<number>(Array.from(map.values()).filter(i => i >= 0 && i < total))
    const available: number[] = []
    for (let i = 0; i < total; i++) if (!used.has(i)) available.push(i)

    // shuffle available indices (Fisher-Yates)
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[available[i], available[j]] = [available[j], available[i]]
    }

    let ai = 0
    for (const p of photos) {
      if (!map.has(p.id)) {
        if (ai < available.length) {
          map.set(p.id, available[ai++])
        } else {
          // no empty cells: pick a random cell
          map.set(p.id, Math.floor(Math.random() * total))
        }
      } else {
        // ensure mapped index is in range if grid size changed
        const idx = map.get(p.id)!
        if (idx < 0 || idx >= total) {
          if (ai < available.length) map.set(p.id, available[ai++])
          else map.set(p.id, Math.floor(Math.random() * total))
        }
      }
    }
  }, [photos, gridInfo])

  return (
    <div className={`kiosk-container ${connectionStatus.toLowerCase().replace(' ', '')}`}>
      <div className="watermark">MOSAIC WALL</div>
      <div className="status">{connectionStatus}</div>
      
      <Grid onGridUpdate={handleGridUpdate} />
      
      <div className="photo-wall" style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        {photos.map((photo) => {
          const cols = Math.max(1, gridInfo.cols)
          const rows = Math.max(1, gridInfo.rows)
          const cellWidth = window.innerWidth / cols
          const cellHeight = window.innerHeight / rows

          const index = photoCellMapRef.current.get(photo.id) ?? 0
          const col = index % cols
          const row = Math.floor(index / cols)

          const inset = 2
          const left = Math.round(col * cellWidth) + 1
          const top = Math.round(row * cellHeight) + 1

          return (
            <img
              key={photo.id}
              src={`data:image/jpeg;base64,${photo.image_data}`}
              alt="Mosaic"
              className={`mosaic-photo ${photo.animation}`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${Math.max(1, Math.round(cellWidth) - inset)}px`,
                height: `${Math.max(1, Math.round(cellHeight) - inset)}px`,
                position: 'absolute'
              }}
              onLoad={() => console.log('Photo rendered on screen', photo.id, 'cell', index)}
            />
          )
        })}
      </div>
    </div>
  )
}

export default App
