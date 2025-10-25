import { DEFAULT_BACKEND_URL } from '../config/constants';

export interface WSStatusResponse {
  total_connections: number;
  pools: Record<string, number>;
  timestamp: string;
}

export const getWebSocketStatus = async (): Promise<WSStatusResponse | null> => {
  try {
    const response = await fetch(`${DEFAULT_BACKEND_URL}/ws-status`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch WebSocket status:', error);
    return null;
  }
};

export const logConnectionDistribution = async () => {
  const status = await getWebSocketStatus();
  if (status) {
    console.log('WebSocket Connection Distribution:', status);
  }
};
