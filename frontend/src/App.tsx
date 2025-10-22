import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const checkCameraPermissions = async () => {
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName })
      console.log('Camera permission:', permissions.state)
      setError(`Camera permission: ${permissions.state}`)
    } catch (error) {
      console.log('Permission check failed:', error)
    }
  }

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
      setError(`Camera error: ${error.message}. Try using HTTPS or file upload.`)
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
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
      <h1>📷 Mosaic Wall Camera</h1>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
      {!stream ? (
        <div className="options">
          <button onClick={startCamera} className="start-btn">
            📷 Start Camera
          </button>
          <button onClick={checkCameraPermissions} className="upload-btn">
            🔍 Check Permissions
          </button>
          <div className="or">OR</div>
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
          <p style={{ fontSize: '12px', color: '#ccc', textAlign: 'center' }}>
            Camera Status: {stream ? 'Connected' : 'Disconnected'}<br/>
            Click video area if black screen appears
          </p>
          <div className="controls">
            <button 
              onClick={() => {
                if (videoRef.current) {
                  const video = videoRef.current
                  console.log('🔍 Video Debug Info:')
                  console.log('- readyState:', video.readyState)
                  console.log('- paused:', video.paused)
                  console.log('- videoWidth:', video.videoWidth)
                  console.log('- videoHeight:', video.videoHeight)
                  console.log('- srcObject:', video.srcObject)
                  console.log('- currentTime:', video.currentTime)
                }
              }}
              className="upload-btn"
              style={{ fontSize: '12px', padding: '5px 10px' }}
            >
              🔍 Debug Video
            </button>
            <button 
              onClick={capturePhoto} 
              disabled={isUploading}
              className="capture-btn"
            >
              {isUploading ? 'Uploading...' : '📸 Capture'}
            </button>
            <button 
              onClick={() => {
                stream.getTracks().forEach(track => track.stop())
                setStream(null)
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
