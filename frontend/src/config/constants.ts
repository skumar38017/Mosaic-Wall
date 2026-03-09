export const DEFAULT_BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const QRCODE_URL = import.meta.env.VITE_QRCODE_URL || 'http://localhost:5173/';
export const ACCESS_CAMERA_URL = import.meta.env.VITE_ACCESS_CAMERA_URL || 'http://localhost:5173/';
export const OVERLAY_OPACITY = parseFloat(import.meta.env.VITE_OVERLAY_OPACITY || '0.5');

// AWS S3 Configuration
export const AWS_CONFIG = {
  region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
  bucketName: import.meta.env.VITE_AWS_S3_BUCKET_NAME || '',
  dayShiftFolder: import.meta.env.VITE_AWS_DAYSHIFT_FOLDER || 'dayshift',
  nightShiftFolder: import.meta.env.VITE_AWS_NIGHTSHIFT_FOLDER || 'nightshift',
  finalNightMosaicFolder: import.meta.env.VITE_AWS_FINAL_NIGHT_MOSAIC_FOLDER || 'FinalNightMosaic',
  finalDayMosaicFolder: import.meta.env.VITE_AWS_FINAL_DAY_MOSAIC_FOLDER || 'FinalDayMosaic',
};

export const CAMERA_CONSTRAINTS = {
  video: { 
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
};

export const PHOTO_SETTINGS = {
  maxPhotosOnScreen: 20,
  photoSize: 150,
  animationDuration: 500,
  maxRotation: 15, // degrees
};

export const WEBSOCKET_CONFIG = {
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  pools: 10, // Match backend WEBSOCKET_POOLS = 10
  baseUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
};

export const UPLOAD_CONFIG = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  quality: 0.8,
};
