export const DEFAULT_BACKEND_URL = 'http://localhost:8000';

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
};

export const UPLOAD_CONFIG = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  quality: 0.8,
};
