export const DEFAULT_BACKEND_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api`;
export const QRCODE_URL = import.meta.env.VITE_QRCODE_URL || `${window.location.protocol}//${window.location.host}/`;
export const ACCESS_CAMERA_URL = import.meta.env.VITE_ACCESS_CAMERA_URL || `${window.location.protocol}//${window.location.host}/`;
export const OVERLAY_OPACITY = parseFloat(import.meta.env.VITE_OVERLAY_OPACITY || '0.5');

// AWS S3 Configuration
export const AWS_CONFIG = {
  region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
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

const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/^http/, 'ws');
  }
  
  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000`;
};

export const WEBSOCKET_CONFIG = {
  reconnectInterval: 10000, // Increased to 10 seconds
  maxReconnectAttempts: 3,  // Reduced attempts
  pools: 1,
  baseUrl: getWebSocketUrl(),
};

export const UPLOAD_CONFIG = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  quality: 0.8,
};
