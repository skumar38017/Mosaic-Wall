import { useState } from 'react'
import { CustomNameInput } from '../components/CustomNameInput'
import { DEFAULT_BACKEND_URL } from '../config/constants'
import '../App.css'

function AdminPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [activeShift, setActiveShift] = useState<string>('')

  const handleNameSubmit = async (name: string) => {
    if (name.trim()) {
      try {
        const response = await fetch(`${DEFAULT_BACKEND_URL}/set-name`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() })
        })
        
        if (!response.ok) throw new Error('Failed to set name')
        
        setSuccess('✅ Name set successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } catch (error) {
        console.error('Set name failed:', error)
        setError('Failed to set name. Make sure backend is running.')
      }
    }
  }

  const handleShiftChange = async (shift: string) => {
    try {
      const response = await fetch(`${DEFAULT_BACKEND_URL}/set-shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift })
      })
      
      if (!response.ok) throw new Error('Failed to set shift')
      
      setActiveShift(shift)
      setSuccess(`✅ ${shift} activated!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Set shift failed:', error)
      setError('Failed to set shift. Make sure backend is running.')
    }
  }

  const handleOverlayUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsUploading(true)
      setError('')
      setSuccess('')

      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch(`${DEFAULT_BACKEND_URL}/upload-overlay`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) throw new Error('Overlay upload failed')

        setSuccess('✅ Overlay uploaded successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } catch (error) {
        console.error('Overlay upload failed:', error)
        setError('Overlay upload failed. Make sure backend is running.')
      } finally {
        setIsUploading(false)
      }
    }
  }

  return (
    <div className="app">
      <div className="header">
        <h1>📷 Mosaic Wall Admin</h1>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="admin-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        
        {/* Shift Buttons */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: 'white', marginBottom: '15px' }}>Select Shift</h3>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => handleShiftChange('Day Shift')}
              style={{
                padding: '15px 30px',
                fontSize: '16px',
                backgroundColor: activeShift === 'Day Shift' ? '#4CAF50' : '#555',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              ☀️ Day Shift
            </button>
            <button
              onClick={() => handleShiftChange('Night Shift')}
              style={{
                padding: '15px 30px',
                fontSize: '16px',
                backgroundColor: activeShift === 'Night Shift' ? '#2196F3' : '#555',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🌙 Night Shift
            </button>
            <button
              onClick={() => handleShiftChange('Merge')}
              style={{
                padding: '15px 30px',
                fontSize: '16px',
                backgroundColor: activeShift === 'Merge' ? '#FF9800' : '#555',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🔀 Merge
            </button>
          </div>
        </div>

        {/* Name Input */}
        <div style={{ marginBottom: '30px' }}>
          <CustomNameInput onNameSubmit={handleNameSubmit} />
        </div>

        {/* Overlay Upload */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: 'white', marginBottom: '15px' }}>🖼️ Upload Overlay Image</h3>
          <input
            type="file"
            accept="image/*,.gif"
            onChange={handleOverlayUpload}
            disabled={isUploading}
            style={{
              padding: '10px',
              backgroundColor: '#333',
              color: 'white',
              border: '2px solid #555',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%'
            }}
          />
          <p style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>
            Upload photo or video to overlay on photos (.jpg, .gif, etc.)
          </p>
        </div>

      </div>
    </div>
  )
}

export default AdminPage
