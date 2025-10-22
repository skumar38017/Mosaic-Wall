import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeGeneratorProps {
  url: string
}

export const QRCodeGenerator = ({ url }: QRCodeGeneratorProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeUrl(qrDataUrl)
      } catch (error) {
        console.error('QR Code generation failed:', error)
      }
    }

    generateQR()
  }, [url])

  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '20px',
      background: 'white',
      borderRadius: '10px',
      margin: '20px 0'
    }}>
      <h3 style={{ color: '#333', marginBottom: '15px' }}>📱 Scan to Open Camera</h3>
      {qrCodeUrl && (
        <img 
          src={qrCodeUrl} 
          alt="QR Code" 
          style={{ 
            border: '2px solid #ddd',
            borderRadius: '8px'
          }}
        />
      )}
      <p style={{ 
        color: '#666', 
        fontSize: '14px', 
        marginTop: '10px',
        wordBreak: 'break-all'
      }}>
        {url}
      </p>
    </div>
  )
}
