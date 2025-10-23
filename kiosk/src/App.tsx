import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import Grid from './Grid'
import { getRandomAnimation } from './Animations'

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
  const wsRefs = useRef<WebSocket[]>([]) // Multiple WebSocket connections
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const isConnectingRef = useRef(false)
  const processedMessages = useRef(new Set<string>())
  const connectionCount = 5 // 5 WebSocket connections for ultra-speed

  // Grid-based positioning system
  const getGridPosition = useCallback((existingPhotos: Photo[]) => {
    // Use grid info from Grid component
    const { cols, rows } = gridInfo
    if (cols === 0 || rows === 0) return { x: 0, y: 0 }
    
    const cellWidth = window.innerWidth / cols
    const cellHeight = window.innerHeight / rows
    
    // Create occupied grid map
    const occupiedCells = new Set<string>()
    existingPhotos.forEach(photo => {
      const gridX = Math.floor(photo.x / cellWidth)
      const gridY = Math.floor(photo.y / cellHeight)
      occupiedCells.add(`${gridX}-${gridY}`)
    })
    
    // Find random free cell
    const freeCells = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!occupiedCells.has(`${col}-${row}`)) {
          freeCells.push({ col, row })
        }
      }
    }
    
    if (freeCells.length === 0) return { x: 0, y: 0 }
    
    const randomCell = freeCells[Math.floor(Math.random() * freeCells.length)]
    return {
      x: randomCell.col * cellWidth,
      y: randomCell.row * cellHeight
    }
  }, [gridInfo])
  const handleGridUpdate = useCallback((cols: number, rows: number) => {
    setGridInfo({ cols, rows })
  }, [])


  const addPhoto = useCallback((data: any) => {
    // Create message hash for deduplication
    const messageHash = `${data.timestamp}-${data.image_data.substring(0, 50)}`
    
    // Skip if already processed
    if (processedMessages.current.has(messageHash)) {
      return
    }
    processedMessages.current.add(messageHash)
    
    // Clean old hashes (keep only last 1000)
    if (processedMessages.current.size > 1000) {
      const hashes = Array.from(processedMessages.current)
      processedMessages.current = new Set(hashes.slice(-500))
    }
    
    const randomAnimation = getRandomAnimation()
    
    // Generate truly unique ID
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.floor(Math.random() * 10000)}`
    
    // Get grid-based position
    const { x, y } = getGridPosition(photos)
    
    const newPhoto: Photo = {
      id: uniqueId,
      image_data: data.image_data,
      timestamp: data.timestamp,
      x: x,
      y: y,
      animation: randomAnimation
    }
    
    setPhotos(prev => {
      const updated = [...prev, newPhoto]
      
      // Use grid info from Grid component
      const maxPhotos = gridInfo.cols * gridInfo.rows
      
      // When grid is full, remove oldest photos
      if (updated.length >= maxPhotos) {
        const keepCount = Math.floor(maxPhotos * 0.8) // Keep 80%
        const removedPhotos = updated.slice(0, updated.length - keepCount)
        const cleanedPhotos = updated.slice(-keepCount)
        
        // Clean removed photos from Redis
        const removedIds = removedPhotos.map(p => p.timestamp)
        fetch(`${import.meta.env.VITE_API_URL}/cleanup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(removedIds)
        }).catch(e => console.log('Redis cleanup failed:', e))
        
        console.log(`Grid full! Cleaned ${removedPhotos.length} old photos, keeping ${cleanedPhotos.length}`)
        return [...cleanedPhotos, newPhoto]
      }
      
      return updated
    })
    console.log('Photo added to display')
  }, [getGridPosition, gridInfo])

  const connectWebSocket = useCallback(() => {
    if (isConnectingRef.current) return
    
    isConnectingRef.current = true
    setConnectionStatus('Connecting...')
    
    // Close existing connections
    wsRefs.current.forEach(ws => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    })
    wsRefs.current = []
    
    // Create 5 WebSocket connections for ultra-fast delivery
    for (let i = 0; i < connectionCount; i++) {
      const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws`)
      
      ws.onopen = () => {
        if (wsRefs.current.filter(w => w.readyState === WebSocket.OPEN).length === 1) {
          setConnectionStatus('Connected')
          isConnectingRef.current = false
          console.log(`WebSocket ${i+1} connected - Total: ${connectionCount}`)
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.image_data) {
            console.log(`Received photo via WebSocket ${i+1}`)
            addPhoto(data)
          }
        } catch (error) {
          console.log('Received non-JSON message (likely ping)')
        }
      }

      ws.onclose = (event) => {
        setConnectionStatus('Disconnected')
        isConnectingRef.current = false
        console.log(`WebSocket ${i+1} disconnected, code:`, event.code)
        
        // Reconnect after delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket()
        }, 2000)
      }

      ws.onerror = () => {
        setConnectionStatus('Connection Error')
        isConnectingRef.current = false
      }
      
      wsRefs.current.push(ws)
    }
  }, [addPhoto])

  const cleanup = useCallback(() => {
    wsRefs.current.forEach(ws => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    })
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    connectWebSocket()
    return cleanup
  }, [connectWebSocket, cleanup])

  return (
    <div className={`kiosk-container ${connectionStatus.toLowerCase().replace(' ', '')}`}>
      <div className="watermark">MOSAIC WALL</div>
      <div className="status">{connectionStatus}</div>
      
      <Grid onGridUpdate={handleGridUpdate} />
      
      <div className="photo-wall">
        {photos.map((photo) => (
          <img
            key={photo.id}
            src={`data:image/jpeg;base64,${photo.image_data}`}
            alt="Mosaic"
            className={`mosaic-photo ${photo.animation}`}
            style={{
              left: `${photo.x}px`,
              top: `${photo.y}px`,
            }}
            onLoad={() => console.log('Photo rendered on screen')}
          />
        ))}
      </div>
    </div>
  )
}

export default App
