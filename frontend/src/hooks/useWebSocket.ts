import { useState, useEffect, useRef, useCallback } from 'react';
import { WEBSOCKET_CONFIG } from '../config/constants';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  poolId?: number; // Optional specific pool
}

// Load balancer: distribute connections across pools
const getOptimalPool = (): number => {
  return Math.floor(Math.random() * WEBSOCKET_CONFIG.pools);
};

export const useWebSocket = (baseUrl?: string, options: UseWebSocketOptions = {}) => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const poolIdRef = useRef<number>(options.poolId ?? getOptimalPool());

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = WEBSOCKET_CONFIG.reconnectInterval
  } = options;

  const getWebSocketUrl = useCallback(() => {
    const url = baseUrl || WEBSOCKET_CONFIG.baseUrl;
    const poolId = poolIdRef.current;
    return poolId === 0 ? `${url}/ws` : `${url}/ws${poolId}`;
  }, [baseUrl]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      onDisconnect?.();
      
      // Auto-reconnect with new pool selection
      reconnectTimeoutRef.current = setTimeout(() => {
        poolIdRef.current = getOptimalPool(); // Get new pool for reconnection
        connect();
      }, reconnectInterval);
    };

    ws.onerror = (error) => {
      setConnectionStatus('error');
      onError?.(error);
    };
  }, [getWebSocketUrl, onMessage, onConnect, onDisconnect, onError, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
  }, []);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionStatus,
    sendMessage,
    connect,
    disconnect,
    currentPool: poolIdRef.current
  };
};
