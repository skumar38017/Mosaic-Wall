export interface Photo {
  id: string;
  data: string; // base64 encoded image
  timestamp: number;
  x?: number;
  y?: number;
  rotation?: number;
}

export interface WebSocketMessage {
  type: 'new_photo' | 'photo_deleted' | 'connection_count';
  photo?: string;
  count?: number;
  timestamp?: number;
}

export interface UploadResponse {
  success: boolean;
  message?: string;
  photoId?: string;
}

export type AppMode = 'select' | 'mobile' | 'kiosk';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
