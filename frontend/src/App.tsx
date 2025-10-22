import { useState, useRef } from 'react'
import './App.css'

function App() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    try {
      setError('')
      setSuccess('')
      // Try back camera first, then front camera
      let mediaStream
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        })
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        })
      }
      
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      setError('Camera access denied. Please use file upload instead.')
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
      const response = await fetch('http://localhost:8000/upload', {
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
          <video ref={videoRef} autoPlay playsInline />
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
