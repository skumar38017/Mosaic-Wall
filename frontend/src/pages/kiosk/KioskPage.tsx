import { useState, useEffect, useRef } from 'react'
import './App.css'
import Grid from '../kiosk/components/Grid'
import { useWebSocketManager } from '../kiosk/components/WebSocketManager'
import { usePhotoManager } from '../kiosk/components/PhotoManager'

// Calculate initial grid dimensions
const calculateGridDimensions = () => {
  const cellPercentage = 5 // Fixed 5% of smaller dimension
  const smallerDimension = Math.min(window.innerWidth, window.innerHeight)
  const cellSize = (smallerDimension * cellPercentage) / 100
  return {
    cols: Math.floor(window.innerWidth / cellSize),
    rows: Math.floor(window.innerHeight / cellSize)
  }
}

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
  const [gridInfo, setGridInfo] = useState(calculateGridDimensions())
  
  // Update grid info on window resize
  useEffect(() => {
    const handleResize = () => {
      setGridInfo(calculateGridDimensions())
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, []);

  const handleGridUpdate = (cols: number, rows: number) => {
    setGridInfo(prev => {
      if (prev.cols !== cols || prev.rows !== rows) {
        return { cols, rows }
      }
      return prev
    })
  }

  const { addPhoto } = usePhotoManager({ photos, gridInfo, setPhotos })
  const { connectWebSocket, cleanup } = useWebSocketManager({
    onMessage: addPhoto,
    onStatusChange: setConnectionStatus
  })

  // Connect websocket once on mount and clean up on unmount only
  useEffect(() => {
    connectWebSocket()
    return () => {
      try { cleanup() } catch (e) { console.warn('cleanup error', e) }
    }
    // Intentionally run once on mount -- hooks from manager are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // map photo.id -> assigned grid index (persists across renders)
  const photoCellMapRef = useRef<Map<string, number>>(new Map())
  // flag to avoid repeated trimming while grid remains full
  const hasTrimmedRef = useRef(false)

  // When grid becomes full (photos >= total cells) trim oldest ~30% and call cleanup once
  useEffect(() => {
    const cols = Math.max(1, gridInfo.cols)
    const rows = Math.max(1, gridInfo.rows)
    const total = cols * rows
    if (total <= 0) return

    if (photos.length >= total && !hasTrimmedRef.current) {
      hasTrimmedRef.current = true
      // call cleanup once when grid first becomes full
      try { cleanup() } catch (e) { console.warn('cleanup during trim failed', e) }

      // remove oldest 30% of photos, keep newest ~70%
      const removeRatio = 0.3
      const keepCount = Math.max(1, Math.round(photos.length * (1 - removeRatio)))
      // sort by timestamp ascending (oldest first). If timestamp invalid, fallback to insertion order
      const sorted = [...photos].sort((a, b) => {
        const ta = new Date(a.timestamp).getTime() || 0
        const tb = new Date(b.timestamp).getTime() || 0
        return ta - tb
      })
      const toKeep = sorted.slice(-keepCount)
      const toKeepIds = new Set(toKeep.map(p => p.id))

      // update state with kept photos
      setPhotos(toKeep)

      // remove mappings for removed photos
      const map = photoCellMapRef.current
      for (const id of Array.from(map.keys())) {
        if (!toKeepIds.has(id)) map.delete(id)
      }
    } else if (photos.length < total) {
      // allow future trims when grid fills again
      hasTrimmedRef.current = false
    }
  }, [photos, gridInfo, cleanup])

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
          if (ai < available.length) {
            map.set(p.id, available[ai++])
          } else {
            map.set(p.id, Math.floor(Math.random() * total))
          }
        }
      }
    }
  }, [photos, gridInfo])

  return (
    <div className={`kiosk-container ${connectionStatus.toLowerCase().replace(/\s+/g, '')}`}>
      <div className="watermark">MOSAIC WALL</div>
      <div className="status">{connectionStatus}</div>
      
      <Grid onGridUpdate={handleGridUpdate} />
      
      <div className="photo-wall" style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        {photos.map((photo) => {
          const cols = Math.max(1, gridInfo.cols)
          const rows = Math.max(1, gridInfo.rows)
          const cellWidth = window.innerWidth / cols
          const cellHeight = window.innerHeight / rows

          // Get cell position from photo's x/y coordinates
          const col = photo.x % cols
          const row = photo.y % rows
          
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
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`,
                width: `${Math.max(1, Math.round(cellWidth) - inset)}px`,
                height: `${Math.max(1, Math.round(cellHeight) - inset)}px`,
                objectFit: 'cover'
              }}
              onLoad={() => console.log('Photo rendered on screen', photo.id, 'cell', `${col}/${row}`)}
            />
          )
        })}
      </div>
    </div>
  )
}

export default App
