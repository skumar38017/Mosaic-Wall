import { useState, useEffect, useRef } from 'react'
import './App.css'

interface Photo {
  id: string
  image_data: string
  timestamp: string
  x: number
  y: number
}

function App() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const ws = new WebSocket('ws://localhost:8000/ws')
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('Connected')
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.image_data) {
          const newPhoto: Photo = {
            id: Date.now().toString(),
            image_data: data.image_data,
            timestamp: data.timestamp,
            x: Math.random() * (window.innerWidth - 200),
            y: Math.random() * (window.innerHeight - 200)
          }
          
          setPhotos(prev => [...prev, newPhoto])
        }
      } catch (error) {
        // Ignore ping messages or invalid JSON
      }
    }

    ws.onclose = () => {
      setConnectionStatus('Disconnected')
      console.log('WebSocket disconnected, reconnecting...')
      
      // Reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket()
      }, 2000)
    }

    ws.onerror = () => {
      setConnectionStatus('Connection Error')
    }
  }

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
  }, [])

  return (
    <div className="kiosk-container">
      <div className="status-bar">
        <h1>🖼️ Mosaic Wall</h1>
        <span className={`status ${connectionStatus.toLowerCase().replace(' ', '')}`}>
          {connectionStatus}
        </span>
      </div>
      
      <div className="photo-wall">
        {photos.map((photo) => (
          <img
            key={photo.id}
            src={`data:image/jpeg;base64,${photo.image_data}`}
            alt="Mosaic photo"
            className="mosaic-photo"
            style={{
              left: photo.x,
              top: photo.y + 60
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default App
