import { useState, useEffect, useCallback } from 'react'
import './App.css'
import Grid from './Grid'
import QRCode from './QRCode'
import { useWebSocketManager } from './WebSocketManager'
import { usePhotoManager } from './PhotoManager'

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

  return (
    <div className={`kiosk-container ${connectionStatus.toLowerCase().replace(' ', '')}`}>
      <div className="watermark">MOSAIC WALL</div>
      <div className="status">{connectionStatus}</div>
      
      <Grid onGridUpdate={handleGridUpdate} />
      
      <div className="photo-wall">
        {photos.map((photo) => {
          const cellWidth = window.innerWidth / gridInfo.cols
          const cellHeight = window.innerHeight / gridInfo.rows
          return (
            <img
              key={photo.id}
              src={`data:image/jpeg;base64,${photo.image_data}`}
              alt="Mosaic"
              className={`mosaic-photo ${photo.animation}`}
              style={{
                left: `${photo.x + 1}px`,
                top: `${photo.y + 1}px`,
                width: `${cellWidth - 2}px`,
                height: `${cellHeight - 2}px`,
              }}
              onLoad={() => console.log('Photo rendered on screen')}
            />
          )
        })}
      </div>
    </div>
  )
}

export default App
