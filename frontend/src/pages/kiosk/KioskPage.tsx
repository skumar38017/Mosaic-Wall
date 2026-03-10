import { useState, useEffect, useCallback } from 'react'
import './App.css'
import Grid, { getInitialGrid } from './components/Grid'
import { useWebSocketManager } from './components/WebSocketManager'
import { usePhotoManager } from './components/PhotoManager'
import { PixelNameGrid } from './components/PixelNameGrid'
import { DEFAULT_BACKEND_URL } from '../../config/constants'

interface Photo {
  id: string
  image_url: string
  timestamp: string
  x: number
  y: number
  animation: string
  isPopup?: boolean
}

function App() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const [gridInfo, setGridInfo] = useState(() => getInitialGrid(10))
  const [overlayImage, setOverlayImage] = useState<string | null>(null)
  const [overlayType, setOverlayType] = useState<'image' | 'video' | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [showWatermark, setShowWatermark] = useState(true)
  const [showCellNumbers, setShowCellNumbers] = useState(true)
  const [gridCellPercentage, setGridCellPercentage] = useState(10)
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)
  const [popupDuration, setPopupDuration] = useState(2000)

  // Get display settings from backend
  const getDisplaySettings = async () => {
    try {
      const response = await fetch(`${DEFAULT_BACKEND_URL}/get-display-settings`)
      const data = await response.json()
      if (data.settings) {
        console.log('📺 Display settings loaded:', data.settings)
        setShowWatermark(data.settings.show_watermark)
        setShowCellNumbers(data.settings.show_cell_numbers)
        setGridCellPercentage(data.settings.grid_cell_percentage || 10)
        // Update grid info when percentage changes
        setGridInfo(getInitialGrid(data.settings.grid_cell_percentage || 10))
        setOverlayOpacity(data.settings.overlay_opacity || 0.5)
        setPopupDuration(data.settings.popup_duration || 2000)
      }
    } catch (error) {
      console.error('Get display settings failed:', error)
    }
  }

  // Get current name from backend
  const getCurrentName = async () => {
    try {
      const response = await fetch(`${DEFAULT_BACKEND_URL}/get-name`)
      const result = await response.json()
      
      if (result.status === 'name_found') {
        return result.name
      }
      return null
    } catch (error) {
      console.error('Get name failed:', error)
      return null
    }
  }

  // Get overlay image from backend
  const getOverlayImage = async () => {
    try {
      const response = await fetch(`${DEFAULT_BACKEND_URL}/upload-overlay`)
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No overlay found')
          return null
        }
        throw new Error(`HTTP ${response.status}`)
      }
      
      const imageBlob = await response.blob()
      const imageUrl = URL.createObjectURL(imageBlob)
      
      // Detect if it's video or image
      const isVideo = imageBlob.type.startsWith('video/')
      
      console.log('Overlay retrieved successfully:', isVideo ? 'video' : 'image')
      return { url: imageUrl, type: isVideo ? 'video' : 'image' }
    } catch (error) {
      console.error('Overlay retrieval failed:', error)
      return null
    }
  }

  // Load overlay and name on component mount only
  useEffect(() => {
    const loadOverlay = async () => {
      const overlay = await getOverlayImage()
      if (overlay) {
        setOverlayImage(overlay.url)
        setOverlayType(overlay.type as 'image' | 'video')
        console.log('Overlay loaded from backend:', overlay.type)
      }
    }
    
    const loadName = async () => {
      const name = await getCurrentName()
      setDisplayName(name)
      if (name) {
        console.log('Current user:', name)
      }
    }
    
    // Load once on mount
    loadOverlay()
    loadName()
    getDisplaySettings()
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

  const { addPhoto, duplicateFill } = usePhotoManager({ gridInfo, setPhotos, popupDuration })
  
  // Handle WebSocket messages (photos and overlays)
  const handleWebSocketMessage = useCallback((message: any) => {
  console.log('message :', message);
    // Handle shift images - convert to PhotoManager format
    if (message.type === 'shift_image') {
      const photoData = {
        image_url: message.image_url,
        timestamp: message.timestamp,
        id: message.id
      }
      addPhoto(photoData)
      console.log('📸 Added shift image to kiosk')
      return
    }

    // Handle duplicate fill request
    if (message.type === 'duplicate_fill_request') {
      duplicateFill()
      console.log('🔄 Duplicate fill completed')
      return
    }

    // Handle clear grid
    if (message.type === 'clear_grid') {
      setPhotos([])
      console.log('🧹 Grid cleared')
      return
    }
    
    // Handle overlay update
    if (message.type === 'overlay_update') {
      getOverlayImage().then(overlay => {
        if (overlay) {
          setOverlayImage(overlay.url)
          setOverlayType(overlay.type as 'image' | 'video')
        }
      })
      return
    }
    
    // Handle name update
    if (message.type === 'name_update') {
      setDisplayName(message.name)
      return
    }
    
    // Handle settings update
    if (message.type === 'settings_update') {
      const s = message.settings
      setShowWatermark(s.show_watermark)
      setShowCellNumbers(s.show_cell_numbers)
      setGridCellPercentage(s.grid_cell_percentage || 10)
      // Update grid info when percentage changes
      setGridInfo(getInitialGrid(s.grid_cell_percentage || 10))
      setOverlayOpacity(s.overlay_opacity || 0.5)
      setPopupDuration(s.popup_duration || 2000)
      return
    }
    
    if (message.filename === 'OVERLAY_IMAGE.png') {
      // Handle overlay image - don't add to grid
      const dataUrl = `data:image/jpeg;base64,${message.image_data}`
      setOverlayImage(dataUrl)
      console.log('Overlay updated via WebSocket')
      return
    }
    
    // Handle regular photo - add to grid
    addPhoto(message)
  }, [addPhoto, gridInfo])
  
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
      {showWatermark && photos.length === 0 && <div className="watermark">MOSAIC WALL</div>}
      {photos.length === 0 && <div className="status">{connectionStatus}</div>}
      
      <Grid onGridUpdate={handleGridUpdate} photosCount={photos.length} showCellNumbers={showCellNumbers} cellPercentage={gridCellPercentage} />
      
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
                src={photo.image_url}
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
              src={photo.image_url}
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
        
        {/* Pixel Name Grid Display */}
        {displayName && <PixelNameGrid name={displayName} photos={photos} />}
        
        {currentPhotoCount > 0 && overlayImage && (
          overlayType === 'video' ? (
            <video 
              src={overlayImage}
              className="pm-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                opacity: (fillPercentage / 100) * overlayOpacity,
                objectFit: 'cover',
                zIndex: 10
              }}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img 
              src={overlayImage}
              alt="Overlay"
              className="pm-overlay"
              style={{
                opacity: (fillPercentage / 100) * overlayOpacity
              }}
            />
          )
        )}
      </div>
    </div>
  )
}

export default App
