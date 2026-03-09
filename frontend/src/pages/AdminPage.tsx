import { useState, useEffect } from 'react'
import { CustomNameInput } from '../components/CustomNameInput'
import { DEFAULT_BACKEND_URL } from '../config/constants'
import '../App.css'

function AdminPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [activeShift, setActiveShift] = useState<string>('')
  const [showWatermark, setShowWatermark] = useState(true)
  const [showCellNumbers, setShowCellNumbers] = useState(true)
  const [gridCellPercentage, setGridCellPercentage] = useState(10)
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)

  // Load display settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`${DEFAULT_BACKEND_URL}/get-display-settings`)
        const data = await response.json()
        if (data.settings) {
          setShowWatermark(data.settings.show_watermark)
          setShowCellNumbers(data.settings.show_cell_numbers)
          setGridCellPercentage(data.settings.grid_cell_percentage || 10)
          setOverlayOpacity(data.settings.overlay_opacity || 0.5)
        }
      } catch (error) {
        console.error('Failed to load display settings:', error)
      }
    }
    loadSettings()
  }, [])

  const handleDisplaySettingsChange = async (setting: 'watermark' | 'cellNumbers', value: boolean) => {
    // Update state immediately for responsive UI
    if (setting === 'watermark') setShowWatermark(value)
    if (setting === 'cellNumbers') setShowCellNumbers(value)

    const newSettings = {
      show_watermark: setting === 'watermark' ? value : showWatermark,
      show_cell_numbers: setting === 'cellNumbers' ? value : showCellNumbers,
      grid_cell_percentage: gridCellPercentage,
      overlay_opacity: overlayOpacity
    }

    console.log('Updating display settings:', newSettings)

    try {
      const response = await fetch(`${DEFAULT_BACKEND_URL}/set-display-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })

      if (!response.ok) throw new Error('Failed to update settings')

      const result = await response.json()
      console.log('Settings updated:', result)

      setSuccess('✅ Display settings updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Update settings failed:', error)
      setError('Failed to update settings. Make sure backend is running.')
      // Revert state on error
      if (setting === 'watermark') setShowWatermark(!value)
      if (setting === 'cellNumbers') setShowCellNumbers(!value)
    }
  }

  const handleSliderChange = async (setting: 'gridCell' | 'opacity', value: number) => {
    // Update state immediately
    if (setting === 'gridCell') setGridCellPercentage(value)
    if (setting === 'opacity') setOverlayOpacity(value)

    const newSettings = {
      show_watermark: showWatermark,
      show_cell_numbers: showCellNumbers,
      grid_cell_percentage: setting === 'gridCell' ? value : gridCellPercentage,
      overlay_opacity: setting === 'opacity' ? value : overlayOpacity
    }

    console.log('Updating display settings:', newSettings)

    try {
      const response = await fetch(`${DEFAULT_BACKEND_URL}/set-display-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })

      if (!response.ok) throw new Error('Failed to update settings')

      const result = await response.json()
      console.log('Settings updated:', result)

      setSuccess('✅ Display settings updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Update settings failed:', error)
      setError('Failed to update settings. Make sure backend is running.')
      // Revert state on error
      if (setting === 'watermark') setShowWatermark(!value)
      if (setting === 'cellNumbers') setShowCellNumbers(!value)
    }
  }

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

        {/* Display Settings */}
        <div style={{ 
          marginBottom: '30px',
          backgroundColor: '#222',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #444'
        }}>
          <h3 style={{ color: 'white', marginBottom: '15px' }}>🎨 Display Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '10px',
              backgroundColor: '#fff',
              borderRadius: '5px'
            }}>
              <input
                type="checkbox"
                checked={showWatermark}
                onChange={(e) => handleDisplaySettingsChange('watermark', e.target.checked)}
                style={{ 
                  marginRight: '10px', 
                  width: '20px', 
                  height: '20px', 
                  cursor: 'pointer',
                  accentColor: '#4CAF50'
                }}
              />
              <span style={{ color: '#000', fontWeight: 'bold' }}>Show Watermark</span>
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '10px',
              backgroundColor: '#fff',
              borderRadius: '5px'
            }}>
              <input
                type="checkbox"
                checked={showCellNumbers}
                onChange={(e) => handleDisplaySettingsChange('cellNumbers', e.target.checked)}
                style={{ 
                  marginRight: '10px', 
                  width: '20px', 
                  height: '20px', 
                  cursor: 'pointer',
                  accentColor: '#4CAF50'
                }}
              />
              <span style={{ color: '#000', fontWeight: 'bold' }}>Show Cell Numbers</span>
            </label>
          </div>

          {/* Sliders */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#fff', display: 'block', marginBottom: '10px' }}>
                Grid Cell Size: {gridCellPercentage}%
              </label>
              <input
                type="range"
                min="3"
                max="50"
                step="1"
                value={gridCellPercentage}
                onChange={(e) => handleSliderChange('gridCell', parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '10px' }}>
                Overlay Opacity: {overlayOpacity.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => handleSliderChange('opacity', parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default AdminPage
