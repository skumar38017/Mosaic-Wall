import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

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
  const wsRefs = useRef<WebSocket[]>([]) // Multiple WebSocket connections
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const isConnectingRef = useRef(false)
  const processedMessages = useRef(new Set<string>())
  const connectionCount = 5 // 5 WebSocket connections for ultra-speed

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
    
    const animations = [
      'fade', 'slideFromLeft', 'slideFromRight', 'slideFromTop', 'slideFromBottom', 
      'zoom', 'swipe', 'flip', 'rotate', 'cubeRotate', 'coverflow', 'cornerSwap', 
      'pump', 'bounce', 'fold', 'unfold', 'scaleIn', 'scaleOut', 'push', 'pull', 
      'reveal', 'overlay', 'stack', 'skew', 'parallaxSlide', 'curtain', 'roll', 
      'morph', 'wipe', 'shutter', 'blinds', 'glitch', 'crossfade'
    ]
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)]
    
    // Generate truly unique ID
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.floor(Math.random() * 10000)}`
    
    // Generate diagonal positioning keeping photos within screen bounds
    const photoSize = 150 // Photo width/height from CSS
    const maxX = window.innerWidth - photoSize
    const maxY = window.innerHeight - photoSize
    
    // Ensure photos stay within screen bounds
    const screenWidth = Math.max(maxX, 0)
    const screenHeight = Math.max(maxY, 0)
    
    // Create diagonal zones for better distribution
    const zone = Math.floor(Math.random() * 4) // 4 diagonal zones
    let x, y
    
    switch(zone) {
      case 0: // Top-left to center
        x = Math.random() * (screenWidth * 0.6)
        y = Math.random() * (screenHeight * 0.6)
        break
      case 1: // Top-right to center  
        x = (screenWidth * 0.4) + Math.random() * (screenWidth * 0.6)
        y = Math.random() * (screenHeight * 0.6)
        break
      case 2: // Bottom-left to center
        x = Math.random() * (screenWidth * 0.6)
        y = (screenHeight * 0.4) + Math.random() * (screenHeight * 0.6)
        break
      case 3: // Bottom-right to center
        x = (screenWidth * 0.4) + Math.random() * (screenWidth * 0.6)
        y = (screenHeight * 0.4) + Math.random() * (screenHeight * 0.6)
        break
      default: // Full random as fallback
        x = Math.random() * screenWidth
        y = Math.random() * screenHeight
    }
    
    // Final bounds check to ensure photos never go outside screen
    x = Math.min(Math.max(x, 0), maxX)
    y = Math.min(Math.max(y, 0), maxY)
    
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
      
      // Calculate how many photos can fit on screen (150px photos + spacing)
      const photosPerRow = Math.floor(window.innerWidth / 170)
      const photosPerCol = Math.floor(window.innerHeight / 170)
      const maxPhotosOnScreen = photosPerRow * photosPerCol
      
      // When screen is full, clean 80% of old photos
      if (updated.length >= maxPhotosOnScreen) {
        const keepCount = Math.floor(maxPhotosOnScreen * 0.2) // Keep 20%
        const removedPhotos = updated.slice(0, updated.length - keepCount) // Photos to remove
        const cleanedPhotos = updated.slice(-keepCount) // Keep newest 20%
        
        // Clean removed photos from Redis
        const removedIds = removedPhotos.map(p => p.timestamp)
        fetch(`${import.meta.env.VITE_API_URL}/cleanup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(removedIds)
        }).catch(e => console.log('Redis cleanup failed:', e))
        
        console.log(`Screen full! Cleaned ${removedPhotos.length} old photos, keeping ${cleanedPhotos.length}`)
        return [...cleanedPhotos, newPhoto]
      }
      
      return updated
    })
    console.log('Photo added to display')
  }, [])

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
