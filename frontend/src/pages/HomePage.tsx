import { useState, useRef, useEffect } from 'react'
import { QRCodeGenerator } from '../components/QRCodeGenerator'
import '../App.css'

function App() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [showPermissionPopup, setShowPermissionPopup] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get current URL for QR code
  // const currentUrl = window.location.href

  // Cleanup camera when component unmounts or user leaves page
  useEffect(() => {
    const cleanupCamera = () => {
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop()
          console.log('🔴 Camera cleanup - track stopped:', track.kind)
        })
      }
    }

    // Cleanup on page unload/back button
    const handleBeforeUnload = () => {
      cleanupCamera()
    }

    // Cleanup on visibility change (tab switch/minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanupCamera()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup on component unmount
    return () => {
      cleanupCamera()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [stream])

  // Auto-start camera when QR code is scanned
  useEffect(() => {
    const autoStartCamera = async () => {
      // Auto-start camera for QR code users
      if (!stream && !error && !success) {
        console.log('🔄 Auto-starting camera from QR scan...')
        try {
          await startCamera()
        } catch (err) {
          console.log('Auto-start failed, user will see manual options')
        }
      }
    }

    // Small delay to ensure component is mounted
    const timer = setTimeout(autoStartCamera, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Re-attach stream to video element when component updates
  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      console.log('🔄 Re-attaching stream to video element')
      const video = videoRef.current
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      
      const playVideo = async () => {
        try {
          await video.play()
          console.log('✅ Video re-attached and playing')
        } catch (error) {
          console.log('❌ Re-attach play failed:', error)
        }
      }
      
      setTimeout(playVideo, 100)
      video.onloadedmetadata = playVideo
    }
  }, [stream])

  const startCamera = async () => {
    try {
      setError('')
      setSuccess('')
      
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      
      console.log('Requesting camera access...')
      
      // Simple camera request
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false
      })
      
      console.log('Camera stream obtained:', mediaStream)
      setStream(mediaStream)
      
      // Set stream to video element with persistence
      if (videoRef.current) {
        const video = videoRef.current
        video.srcObject = mediaStream
        video.muted = true
        video.playsInline = true
        video.autoplay = true
        
        console.log('📹 Stream attached to video element')
        
        // Check video tracks
        const videoTracks = mediaStream.getVideoTracks()
        console.log('Video tracks:', videoTracks.length)
        if (videoTracks[0]) {
          console.log('Video track enabled:', videoTracks[0].enabled)
          console.log('Video track readyState:', videoTracks[0].readyState)
        }
        
        // Force play
        const forcePlay = async () => {
          try {
            await video.play()
            console.log('✅ Video playing successfully')
            
            // Check video dimensions after play
            setTimeout(() => {
              console.log('📐 Video dimensions:', video.videoWidth, 'x', video.videoHeight)
            }, 1000)
          } catch (error) {
            console.log('❌ Play failed:', error)
          }
        }
        
        setTimeout(forcePlay, 100)
        video.onloadedmetadata = forcePlay
      }
      
    } catch (error) {
      console.error('Camera error:', error)
      setShowPermissionPopup(true)
    }
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsUploading(true)
    setError('')
    setSuccess('')

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context?.drawImage(video, 0, 0)

    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          await uploadPhoto(blob)
          setSuccess('📸 Photo uploaded and broadcasted to kiosks!')
          setTimeout(() => setSuccess(''), 3000)
        } catch (error) {
          // Error already handled in uploadPhoto
        } finally {
          setIsUploading(false)
        }
      }
    }, 'image/jpeg', 0.8)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      setIsUploading(true)
      setError('')
      setSuccess('')
      
      for (let i = 0; i < files.length; i++) {
        await uploadPhoto(files[i])
        // Small delay between uploads to avoid overwhelming the server
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      setIsUploading(false)
      setSuccess(`📸 ${files.length} photos uploaded and broadcasted to kiosks!`)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const uploadPhoto = async (file: Blob | File) => {
    const formData = new FormData()
    formData.append('file', file, 'photo.jpg')

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKNED_URL}/upload`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Upload failed:', error)
      setError('Upload failed. Make sure backend is running.')
      throw error
    }
  }

  return (
    <div className="mobile-app">
      {/* Permission Popup Modal */}
      {showPermissionPopup && (
        <div className="popup-overlay">
          <div className="popup-modal">
            <div className="popup-header">
              <h3>🔒 Camera Permission Required</h3>
            </div>
            <div className="popup-content">
              <p>To use the Mosaic Wall Camera, please allow camera access:</p>
              
              <div className="permission-section">
                <h4>📱 On Mobile:</h4>
                <ul>
                  <li>Tap the camera icon in your browser's address bar</li>
                  <li>Select "Allow" when prompted</li>
                  <li>Or go to Settings → Site Settings → Camera → Allow</li>
                </ul>
              </div>

              <div className="permission-section">
                <h4>💻 On Desktop:</h4>
                <ul>
                  <li>Click the camera icon in the address bar</li>
                  <li>Choose "Always allow" for this site</li>
                  <li>Refresh the page after allowing</li>
                </ul>
              </div>

              <div className="permission-section">
                <p><strong>🔄 Alternative:</strong> Use "📁 Choose Photos" to select images from your gallery instead.</p>
              </div>
            </div>
            <div className="popup-buttons">
              <button 
                onClick={() => {
                  setShowPermissionPopup(false)
                  startCamera()
                }}
                className="popup-btn primary"
              >
                🔄 Try Again
              </button>
              <button 
                onClick={() => setShowPermissionPopup(false)}
                className="popup-btn close"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="header">
        <h1>📷 Mosaic Wall Camera</h1>
      </div>

      {!stream && (
        // <QRCodeGenerator url={currentUrl} />
        <QRCodeGenerator />
      )}
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
      {!stream ? (
        <div className="options">
          <div className="camera-section">
            <button onClick={startCamera} className="start-btn">
              📷 Start Camera
            </button>
            <p className="camera-description">
              Take photos instantly with your camera
            </p>
          </div>
          
          <div className="divider">
            <span>OR</span>
          </div>
          
          <div className="upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="upload-btn"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : '📁 Choose Photos'}
            </button>
            <p className="upload-description">
              Select multiple photos from your gallery
            </p>
          </div>
        </div>
      ) : (
        <div className="camera-container">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            controls={false}
            onClick={async () => {
              if (videoRef.current) {
                try {
                  videoRef.current.currentTime = 0
                  await videoRef.current.play()
                  console.log('🎬 Manual play successful')
                } catch (e) {
                  console.log('🚫 Manual play failed:', e)
                }
              }
            }}
            style={{ 
              width: '100%', 
              maxWidth: '400px', 
              height: '300px',
              backgroundColor: '#000',
              objectFit: 'cover',
              cursor: 'pointer',
              border: '2px solid #fff'
            }}
          />
          <div className="controls">
            <button 
              onClick={capturePhoto} 
              disabled={isUploading}
              className="capture-btn"
            >
              {isUploading ? 'Uploading...' : '📸 Capture'}
            </button>
            <button 
              onClick={() => {
                // Stop all camera tracks to turn off device camera
                if (stream) {
                  stream.getTracks().forEach(track => {
                    track.stop()
                    console.log('📴 Camera track stopped:', track.kind)
                  })
                }
                
                // Clear video element
                if (videoRef.current) {
                  videoRef.current.srcObject = null
                }
                
                // Reset state
                setStream(null)
                console.log('✅ Device camera turned off')
              }}
              className="stop-btn"
            >
              ❌ Stop
            </button>
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default App
