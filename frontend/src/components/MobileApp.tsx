import { useState, useRef } from 'react';
import { uploadToS3 } from '../utils/s3Upload';

export const MobileApp = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
    } catch (error) {
      console.error('Camera error:', error);
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

    setUploadStatus('Uploading to S3...');
    
    try {
      const result = await uploadToS3(blob);
      
      if (result) {
        // Notify backend about successful S3 upload
        const response = await fetch(`${import.meta.env.VITE_BACKNED_URL}/notify-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: result.url,
            timestamp: result.timestamp,
            upload_id: result.filename.replace('.jpg', '')
          })
        });

        if (response.ok) {
          setUploadStatus('Photo uploaded successfully!');
          setTimeout(() => setUploadStatus(''), 3000);
        } else {
          setUploadStatus('Notification failed');
        }
      } else {
        setUploadStatus('S3 upload failed');
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
          <video ref={videoRef} autoPlay playsInline muted />
          <button onClick={capturePhoto} className="capture-btn">
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
