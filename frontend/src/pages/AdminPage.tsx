import { useState, useEffect, useRef } from 'react'
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
  const [popupDuration, setPopupDuration] = useState(2000)
  const sliderTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
          setPopupDuration(data.settings.popup_duration || 2000)
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
      overlay_opacity: overlayOpacity,
      popup_duration: popupDuration
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

  const handleSliderChange = (setting: 'gridCell' | 'opacity' | 'popup', value: number) => {
    // Update state immediately
    if (setting === 'gridCell') setGridCellPercentage(value)
    if (setting === 'opacity') setOverlayOpacity(value)
    if (setting === 'popup') setPopupDuration(value)

    // Clear existing timeout
    if (sliderTimeoutRef.current) {
      clearTimeout(sliderTimeoutRef.current)
    }

    // Debounce API call - only send after 500ms of no changes
    sliderTimeoutRef.current = setTimeout(async () => {
      const newSettings = {
        show_watermark: showWatermark,
        show_cell_numbers: showCellNumbers,
        grid_cell_percentage: setting === 'gridCell' ? value : gridCellPercentage,
        overlay_opacity: setting === 'opacity' ? value : overlayOpacity,
        popup_duration: setting === 'popup' ? value : popupDuration
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
      }
    }, 500)
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

  const handleDuplicate = async () => {
    console.log('🔄 Activating duplicate fill')
    setError('')
    setSuccess('')
    
    try {
      console.log(`📡 Sending request to: ${DEFAULT_BACKEND_URL}/duplicate-fill`)
      
      const response = await fetch(`${DEFAULT_BACKEND_URL}/duplicate-fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      console.log(`📊 Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Response error:`, errorText)
        throw new Error(`Failed to duplicate fill: ${response.status}`)
      }
      
      const result = await response.json()
      console.log(`✅ Duplicate fill completed:`, result)
      console.log(`📺 Empty cells filled with duplicate images`)
      
      setSuccess(`✅ Duplicate fill completed! Empty cells filled with existing images.`)
      setTimeout(() => setSuccess(''), 5000)
      
    } catch (error) {
      console.error('❌ Duplicate fill failed:', error)
      setError(`Failed to duplicate fill. Check console for details.`)
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleShiftChange = async (shift: string) => {
    console.log(`🔄 Activating shift: ${shift}`)
    setError('')
    setSuccess('')
    
    try {
      console.log(`📡 Sending request to: ${DEFAULT_BACKEND_URL}/set-shift`)
      console.log(`📦 Payload:`, { shift })
      
      const response = await fetch(`${DEFAULT_BACKEND_URL}/set-shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift })
      })
      
      console.log(`📊 Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Response error:`, errorText)
        throw new Error(`Failed to set shift: ${response.status}`)
      }
      
      const result = await response.json()
      console.log(`✅ Shift activated successfully:`, result)
      console.log(`📺 Backend will now load images for: ${shift}`)
      
      if (shift === 'Day Shift') {
        console.log(`☀️ Day Shift: Loading images from 11 AM to 7 PM`)
      } else if (shift === 'Night Shift') {
        console.log(`🌙 Night Shift: Loading images from 7 PM to 11 AM`)
      } else if (shift === 'Merge') {
        console.log(`🔀 Merge: Loading all images from all shifts`)
      }
      
      setActiveShift(shift)
      setSuccess(`✅ ${shift} activated! Check /kiosk to see images loading.`)
      setTimeout(() => setSuccess(''), 5000)
      
    } catch (error) {
      console.error('❌ Set shift failed:', error)
      setError(`Failed to set ${shift}. Check console for details.`)
      setTimeout(() => setError(''), 5000)
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
    <div className="app" style={{width: "100vw", paddingBlock: "24px", height: "100vh", display:"flex", flexDirection: "column", }}>
      <div className="header">
        <h1>📷 Mosaic Wall Admin</h1>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="admin-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', width: "100%", display: "flex", flexDirection: "column", gap: "30px" }}>
        
        {/* Shift Buttons */}
        <div style={{ marginBottom: '30px', width: "100%" }}>
          <h3 style={{ color: 'white', marginBottom: '15px' }}>Select Shift</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
            <button
              onClick={handleDuplicate}
              style={{
                padding: '15px 30px',
                fontSize: '16px',
                backgroundColor: '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🔄 Duplicate
            </button>
          </div>
        </div>

        {/* Name Input */}
        <div style={{ marginBottom: '30px' }}>
          <CustomNameInput onNameSubmit={handleNameSubmit} />
        </div>

        {/* Overlay Upload */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: 'black', marginBottom: '15px' }}>🖼️ Upload Overlay Image</h3>
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
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: '10px' }}>
                Popup Duration: {(popupDuration / 1000).toFixed(1)}s
              </label>
              <input
                type="range"
                min="500"
                max="5000"
                step="100"
                value={popupDuration}
                onChange={(e) => handleSliderChange('popup', parseFloat(e.target.value))}
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
