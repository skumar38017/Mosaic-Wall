import { useState, useEffect, useCallback } from 'react'
import './App.css'
import Grid, { getInitialGrid } from './components/Grid'
import { useWebSocketManager } from './components/WebSocketManager'
import { usePhotoManager } from './components/PhotoManager'

interface Photo {
  id: string
  image_data: string
  timestamp: string
  x: number
  y: number
  animation: string
  isPopup?: boolean
}

function App() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const [gridInfo, setGridInfo] = useState(getInitialGrid())
  const [overlayImage, setOverlayImage] = useState<string | null>(null)

  // Get overlay image from backend
  const getOverlayImage = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKNED_URL}/upload-overlay`)
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No overlay image found')
          return null
        }
        throw new Error(`HTTP ${response.status}`)
      }
      
      const imageBlob = await response.blob()
      const imageUrl = URL.createObjectURL(imageBlob)
      
      console.log('Overlay retrieved successfully')
      return imageUrl
    } catch (error) {
      console.error('Overlay retrieval failed:', error)
      return null
    }
  }

  // Load overlay on component mount and poll for updates
  useEffect(() => {
    const loadOverlay = async () => {
      const overlayUrl = await getOverlayImage()
      if (overlayUrl) {
        setOverlayImage(overlayUrl)
        console.log('Overlay loaded from backend')
      }
    }
    
    // Load initially
    loadOverlay()
    
    // Poll every 2 seconds for new overlays
    const interval = setInterval(loadOverlay, 2000)
    
    return () => clearInterval(interval)
  }, [])

  const handleGridUpdate = useCallback((cols: number, rows: number, cellWidth: number, cellHeight: number, gapX: number, gapY: number) => {
    setGridInfo(prev => {
      if (prev.cols !== cols || prev.rows !== rows || prev.cellWidth !== cellWidth || prev.cellHeight !== cellHeight || prev.gapX !== gapX || prev.gapY !== gapY) {
        return { cols, rows, cellWidth, cellHeight, gapX, gapY }
      }
      return prev
    })
  }, [])

  // Calculate fill percentage and background settings
  const totalCells = gridInfo.cols * gridInfo.rows
  const currentPhotoCount = photos.length
  // fillPercentage as a percentage (0-100)
  const fillPercentage = totalCells > 0 ? (currentPhotoCount / totalCells) * 100 : 0

  const { addPhoto } = usePhotoManager({ photos, gridInfo, setPhotos })
  
  // Handle WebSocket messages (photos and overlays)
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.filename === 'OVERLAY_IMAGE.png') {
      // Handle overlay image - don't add to grid
      const dataUrl = `data:image/jpeg;base64,${message.image_data}`
      setOverlayImage(dataUrl)
      console.log('Overlay updated via WebSocket')
      return
    }
    
    // Handle regular photo - add to grid
    addPhoto(message)
  }, [addPhoto])
  
  const { connectWebSocket, cleanup } = useWebSocketManager({
    onMessage: handleWebSocketMessage,
    onStatusChange: setConnectionStatus
  })

  useEffect(() => {
    connectWebSocket()
    return cleanup
  }, [connectWebSocket, cleanup])

  return (
    <div 
      className={`kiosk-container ${connectionStatus.toLowerCase().replace(' ', '')}`}
    >
      {photos.length > 0 && (
        <div className="background-layer" />
      )}
      <div className="watermark">MOSAIC WALL</div>
      <div className="status">{connectionStatus}</div>
      
      <Grid onGridUpdate={handleGridUpdate} photosCount={photos.length} />
      
      <div className="photo-wall">
        {photos.map((photo) => {
          // Use actual cell dimensions from Grid component
          const cellWidth = gridInfo.cellWidth || window.innerWidth / gridInfo.cols
          const cellHeight = gridInfo.cellHeight || window.innerHeight / gridInfo.rows
          const gapX = gridInfo.gapX || 0
          const gapY = gridInfo.gapY || 0
          
          // Popup animation: show in center for 1 second, then move to position
          if (photo.isPopup) {
            return (
              <img
                key={photo.id}
                src={`data:image/jpeg;base64,${photo.image_data}`}
                alt="Mosaic"
                className="mosaic-photo popup-animation"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '60vmin',
                  height: '60vmin',
                  objectFit: 'cover',
                  zIndex: 100
                }}
              />
            )
          }
          
          return (
            <img
              key={photo.id}
              src={`data:image/jpeg;base64,${photo.image_data}`}
              alt="Mosaic"
              className={`mosaic-photo ${photo.animation}`}
              style={{
                left: `${photo.x * (cellWidth + gapX)}px`,
                top: `${photo.y * (cellHeight + gapY)}px`,
                width: `${cellWidth}px`,
                height: `${cellHeight}px`
              }}
            />
          )
        })}
        {currentPhotoCount > 0 && overlayImage && (
          <img 
            src={overlayImage}
            alt="Overlay"
            className="pm-overlay"
            style={{
              opacity: (fillPercentage / 100) * 0.40
            }}
          />
        )}
      </div>
    </div>
  )
}

export default App
