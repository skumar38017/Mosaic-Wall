import { useState, useEffect } from 'react';
import { MobileApp } from './components/MobileApp';
import { KioskApp } from './components/KioskApp';
import { QRCodeGenerator } from './components/QRCodeGenerator';
import './styles/components.css';

function App() {
  const [mode, setMode] = useState<'select' | 'mobile' | 'kiosk'>('select');
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');

  // Auto-detect mode based on URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    const backendParam = urlParams.get('backend');
    
    if (backendParam) {
      setBackendUrl(backendParam);
    }
    
    if (modeParam === 'mobile' || modeParam === 'kiosk') {
      setMode(modeParam);
    }
  }, []);

  const mobileUrl = `${window.location.origin}${window.location.pathname}?mode=mobile&backend=${encodeURIComponent(backendUrl)}`;

  if (mode === 'mobile') {
    return <MobileApp backendUrl={backendUrl} />;
  }

  if (mode === 'kiosk') {
    return (
      <div>
        <KioskApp backendUrl={backendUrl} />
        <div style={{ position: 'fixed', bottom: 20, right: 20 }}>
          <QRCodeGenerator url={mobileUrl} size={150} />
        </div>
      </div>
    );
  }

  return (
    <div className="mode-selector">
      <h1>🖼️ Mosaic Wall</h1>
      <p>Choose your mode:</p>
      
      <div className="mode-options">
        <button 
          onClick={() => setMode('kiosk')}
          className="mode-btn kiosk-btn"
        >
          📺 Kiosk Display
          <span>Show photos on big screen</span>
        </button>
        
        <button 
          onClick={() => setMode('mobile')}
          className="mode-btn mobile-btn"
        >
          📱 Mobile Camera
          <span>Take and upload photos</span>
        </button>
      </div>

      <div className="backend-config">
        <label>
          Backend URL:
          <input 
            type="text" 
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="http://localhost:8000"
          />
        </label>
      </div>

      <div className="qr-section">
        <h3>Mobile QR Code:</h3>
        <QRCodeGenerator url={mobileUrl} />
      </div>

      <style>{`
        .mode-selector {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .mode-selector h1 {
          font-size: 3rem;
          margin-bottom: 20px;
        }

        .mode-options {
          display: flex;
          gap: 30px;
          margin: 30px 0;
          flex-wrap: wrap;
          justify-content: center;
        }

        .mode-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 30px;
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 15px;
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          transition: all 0.3s;
          min-width: 200px;
        }

        .mode-btn:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-5px);
        }

        .mode-btn span {
          font-size: 0.9rem;
          margin-top: 10px;
          opacity: 0.8;
        }

        .backend-config {
          margin: 30px 0;
        }

        .backend-config label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .backend-config input {
          padding: 10px;
          border: none;
          border-radius: 5px;
          font-size: 1rem;
          width: 300px;
          text-align: center;
        }

        .qr-section {
          margin-top: 30px;
        }
      `}</style>
    </div>
  );
}

export default App;
