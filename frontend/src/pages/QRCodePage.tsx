import { QRCodeGenerator } from '../components/QRCodeGenerator'
import { ACCESS_CAMERA_URL } from '../config/constants'

function QRCodePage() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem'
      }}>
        <h1 style={{ color: 'white', marginBottom: '2rem' }}>📱 Scan to Open Camera</h1>
        <QRCodeGenerator url={ACCESS_CAMERA_URL} />
      </div>
    </div>
  )
}

export default QRCodePage
