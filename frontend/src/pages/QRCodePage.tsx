import { QRCodeGenerator } from '../components/QRCodeGenerator'
import { ACCESS_CAMERA_URL } from '../config/constants'

function QRCodePage() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      position: 'relative'
    }}>
      {/* Logo in top-right corner */}
      <img 
        src="/logo.png" 
        alt="Logo" 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '80px',
          height: 'auto',
          zIndex: 1000
        }}
      />
      
      <div style={{
        textAlign: 'center',
        padding: '2rem'
      }}>
        <h1 style={{ color: 'white', marginBottom: '2rem' }}></h1>
        <QRCodeGenerator url={ACCESS_CAMERA_URL} />
      </div>
    </div>
  )
}

export default QRCodePage
