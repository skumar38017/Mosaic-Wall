import { useRef, useCallback } from 'react'
import { WEBSOCKET_CONFIG } from '../../../config/constants'

interface WebSocketManagerProps {
  onMessage: (data: any) => void
  onStatusChange: (status: string) => void
}

export const useWebSocketManager = ({ onMessage, onStatusChange }: WebSocketManagerProps) => {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isConnectingRef = useRef(false)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const processedMessages = useRef(new Set<string>())
  const currentPoolRef = useRef<number>(Math.floor(Math.random() * WEBSOCKET_CONFIG.pools))

  const getWebSocketUrl = useCallback(() => {
    const poolId = currentPoolRef.current
    return poolId === 0 ? `${WEBSOCKET_CONFIG.baseUrl}/ws` : `${WEBSOCKET_CONFIG.baseUrl}/ws${poolId}`
  }, [])

  const connectWebSocket = useCallback(() => {
    if (isConnectingRef.current) return
    
    isConnectingRef.current = true
    onStatusChange(`Connecting to Pool ${currentPoolRef.current}...`)
    
    // Close existing connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }
    
    const wsUrl = getWebSocketUrl()
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    
    ws.onopen = () => {
      onStatusChange(`Connected to Pool ${currentPoolRef.current}`)
      isConnectingRef.current = false
      console.log(`WebSocket connected to pool ${currentPoolRef.current}`)
      
      // Start heartbeat
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, 10000)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.image_data) {
          // Deduplication
          const messageHash = `${data.timestamp}-${data.image_data.substring(0, 50)}`
          
          if (processedMessages.current.has(messageHash)) {
            return
          }
          processedMessages.current.add(messageHash)
          
          // Clean old hashes
          if (processedMessages.current.size > 100) {
            const hashes = Array.from(processedMessages.current)
            processedMessages.current = new Set(hashes.slice(-50))
          }
          
          console.log(`Received photo via Pool ${currentPoolRef.current}`)
          onMessage(data)
        }
      } catch (error) {
        console.log('Received non-JSON message (likely ping)')
      }
    }

    ws.onclose = (event) => {
      onStatusChange('Disconnected')
      isConnectingRef.current = false
      console.log(`WebSocket pool ${currentPoolRef.current} disconnected, code:`, event.code)
      
      // Reconnect with load balancing
      if (event.code !== 1000) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          // Switch to different pool for load balancing
          currentPoolRef.current = Math.floor(Math.random() * WEBSOCKET_CONFIG.pools)
          connectWebSocket()
        }, WEBSOCKET_CONFIG.reconnectInterval)
      }
    }

    ws.onerror = () => {
      onStatusChange('Connection Error')
      isConnectingRef.current = false
    }
  }, [onMessage, onStatusChange, getWebSocketUrl])

  const cleanup = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
  }, [])

  return { connectWebSocket, cleanup }
}

export default useWebSocketManager
