import { useState, useRef, useEffect } from 'react'
import { QRCodeGenerator } from '../components/QRCodeGenerator'
import '../App.css'

function HomePage() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [showPermissionPopup, setShowPermissionPopup] = useState(false)
  const [showQR, setShowQR] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup camera when component unmounts or user leaves page
  useEffect(() => {
    const cleanup = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }

    window.addEventListener('beforeunload', cleanup)
    return () => {
      cleanup()
      window.removeEventListener('beforeunload', cleanup)
    }
  }, [stream])

  const startCamera = async () => {
    try {
      setError('')
      setShowPermissionPopup(true)
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      
      setStream(mediaStream)
      setShowPermissionPopup(false)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      setShowPermissionPopup(false)
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.')
        } else {
          setError(`Camera error: ${err.message}`)
        }
      } else {
        setError('Failed to access camera. Please check your permissions.')
      }
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob and upload
    canvas.toBlob(async (blob) => {
      if (blob) {
        await uploadPhoto(blob)
      }
    }, 'image/jpeg', 0.8)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await uploadPhoto(file)
    }
  }

  const uploadPhoto = async (file: Blob) => {
    setIsUploading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file, 'photo.jpg') // Changed from 'photo' to 'file'

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setSuccess('Photo uploaded successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        // Handle 422 and other error responses properly
        let errorMessage = 'Upload failed'
        
        try {
          const errorData = await response.json()
          // Extract the actual error message from the validation error
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map((err: any) => err.msg).join(', ')
            } else if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail
            }
          }
        } catch (parseError) {
          // If we can't parse JSON, use status text
          errorMessage = response.statusText || 'Upload failed'
        }
        
        setError(`Upload error: ${errorMessage}`)
      }
    } catch (err) {
      // Handle network errors properly
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(`Network error: ${errorMessage}. Please check your connection.`)
    } finally {
      setIsUploading(false)
    }
  }

  const toggleQR = () => {
    setShowQR(!showQR)
  }

  return (
    <div className="app">
      <div className="container">
        <h1>📸 Mosaic Wall</h1>
        <p>Take a photo or upload one to add to the mosaic wall!</p>

        {showQR && (
          <div className="qr-section">
            <QRCodeGenerator />
            <button onClick={toggleQR} className="toggle-qr-btn">
              Hide QR Code
            </button>
          </div>
        )}

        {!showQR && (
          <button onClick={toggleQR} className="toggle-qr-btn">
            Show QR Code
          </button>
        )}

        <div className="camera-section">
          {!stream ? (
            <button onClick={startCamera} className="start-camera-btn">
              📷 Start Camera
            </button>
          ) : (
            <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="video-preview"
              />
              <div className="camera-controls">
                <button onClick={capturePhoto} disabled={isUploading} className="capture-btn">
                  {isUploading ? '⏳ Uploading...' : '📸 Take Photo'}
                </button>
                <button onClick={stopCamera} className="stop-camera-btn">
                  ⏹️ Stop Camera
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="upload-section">
          <p>Or upload a photo from your device:</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="file-input"
          />
        </div>

        {showPermissionPopup && (
          <div className="permission-popup">
            <p>📷 Requesting camera permission...</p>
            <p>Please allow camera access in your browser</p>
          </div>
        )}

        {error && <div className="error-message">❌ {error}</div>}
        {success && <div className="success-message">✅ {success}</div>}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  )
}

export default HomePage