import { useState, useRef } from 'react';

interface MobileAppProps {
  backendUrl: string;
}

export const MobileApp = ({ backendUrl }: MobileAppProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
    } catch (error) {
      console.error('Camera access denied:', error);
      setUploadStatus('Camera access denied');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context?.drawImage(video, 0, 0);

    canvas.toBlob(uploadPhoto, 'image/jpeg', 0.8);
  };

  const uploadPhoto = async (blob: Blob | null) => {
    if (!blob) return;

    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('photo', blob, 'photo.jpg');

    try {
      const response = await fetch(`${backendUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadStatus('Photo uploaded successfully!');
        setTimeout(() => setUploadStatus(''), 3000);
      } else {
        setUploadStatus('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Upload failed');
    }
  };

  return (
    <div className="mobile-app">
      <h1>📸 Mosaic Wall</h1>
      
      {!isCapturing ? (
        <button onClick={startCamera} className="start-camera-btn">
          Start Camera
        </button>
      ) : (
        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline />
          <button onClick={capturePhoto} className="capture-btn">
            Capture Photo
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {uploadStatus && (
        <div className="status-message">{uploadStatus}</div>
      )}
    </div>
  );
};
