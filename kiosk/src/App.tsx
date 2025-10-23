import { useState, useEffect } from 'react'
import './App.css'
import Grid from './Grid'
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

  const handleGridUpdate = (cols: number, rows: number) => {
    setGridInfo({ cols, rows })
  }

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
