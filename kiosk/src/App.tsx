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
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const isConnectingRef = useRef(false)
  const processedMessages = useRef(new Set<string>())

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
    
    const animations = ['slideFromLeft', 'slideFromRight', 'slideFromTop', 'slideFromBottom', 'pump', 'bounce', 'flip', 'zoom']
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)]
    
    // Generate truly unique ID
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.floor(Math.random() * 10000)}`
    
    const newPhoto: Photo = {
      id: uniqueId,
      image_data: data.image_data,
      timestamp: data.timestamp,
      x: Math.random() * (window.innerWidth - 200),
      y: Math.random() * (window.innerHeight - 200),
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
        const cleanedPhotos = updated.slice(-keepCount) // Keep newest 20%
        console.log(`Screen full! Cleaned ${updated.length - cleanedPhotos.length} old photos, keeping ${cleanedPhotos.length}`)
        return [...cleanedPhotos, newPhoto]
      }
      
      return updated
    })
    console.log('Photo added to display')
  }, [])

  const connectWebSocket = useCallback(() => {
    if (isConnectingRef.current || (wsRef.current?.readyState === WebSocket.OPEN)) {
      return
    }

    isConnectingRef.current = true
    console.log('Connecting to WebSocket...')

    const ws = new WebSocket('ws://localhost:8000/ws')
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('Connected')
      isConnectingRef.current = false
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.image_data) {
          console.log('Received photo via WebSocket')
          addPhoto(data)
        }
      } catch (error) {
        console.log('Received non-JSON message (likely ping)')
      }
    }

    ws.onclose = (event) => {
      setConnectionStatus('Disconnected')
      isConnectingRef.current = false
      console.log('WebSocket disconnected, code:', event.code)
      
      // Reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket()
      }, 2000)
    }

    ws.onerror = (error) => {
      setConnectionStatus('Connection Error')
      isConnectingRef.current = false
      console.error('WebSocket error:', error)
    }
  }, [addPhoto])

  useEffect(() => {
    connectWebSocket()

    // Send ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping')
      }
    }, 30000)

    return () => {
      clearInterval(pingInterval)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connectWebSocket])

  return (
    <div className={`kiosk-container ${connectionStatus.toLowerCase().replace(' ', '')}`}>
      <div className="watermark">🖼️ Mosaic Wall</div>
      
      <div className="photo-wall">
        {photos.map((photo) => (
          <img
            key={photo.id}
            src={`data:image/jpeg;base64,${photo.image_data}`}
            alt="Mosaic photo"
            className={`mosaic-photo ${photo.animation}`}
            style={{
              left: photo.x,
              top: photo.y
            }}
            onLoad={() => console.log('Photo rendered on screen')}
          />
        ))}
      </div>
    </div>
  )
}

export default App
