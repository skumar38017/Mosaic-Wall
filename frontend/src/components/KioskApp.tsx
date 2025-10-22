import { useState, useEffect, useRef } from 'react';

interface Photo {
  id: string;
  data: string;
  x: number;
  y: number;
  rotation: number;
}

interface KioskAppProps {
  backendUrl: string;
}

export const KioskApp = ({ backendUrl }: KioskAppProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [backendUrl]);

  const connectWebSocket = () => {
    const wsUrl = backendUrl.replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('Connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.image_data) {
          addNewPhoto(data.image_data);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('Disconnected');
      // Reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('Connection error');
    };
  };

  const addNewPhoto = (photoData: string) => {
    const newPhoto: Photo = {
      id: Date.now().toString(),
      data: photoData,
      x: Math.random() * (window.innerWidth - window.innerWidth * 0.15),
      y: Math.random() * (window.innerHeight - window.innerHeight * 0.2) + window.innerHeight * 0.1,
      rotation: Math.random() * 30 - 15,
    };

    setPhotos(prev => [...prev, newPhoto]);

    // Remove old photos if too many (keep last 20)
    setTimeout(() => {
      setPhotos(prev => prev.slice(-20));
    }, 100);
  };

  return (
    <div className="kiosk-app">
      <div className="status-bar">
        <h1>🖼️ Mosaic Wall Display</h1>
        <span className={`status ${connectionStatus.toLowerCase()}`}>
          {connectionStatus}
        </span>
      </div>

      <div className="photo-container">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="photo-frame"
            style={{
              left: photo.x,
              top: photo.y,
              transform: `rotate(${photo.rotation}deg)`,
            }}
          >
            <img
              src={`data:image/jpeg;base64,${photo.data}`}
              alt="Mosaic photo"
              className="photo"
            />
          </div>
        ))}
      </div>

      {photos.length === 0 && connectionStatus === 'Connected' && (
        <div className="empty-state">
          <p>Waiting for photos...</p>
          <p>Scan the QR code with your phone to add photos!</p>
        </div>
      )}
    </div>
  );
};
