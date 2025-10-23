import { useRef, useCallback } from 'react'

interface WebSocketManagerProps {
  onMessage: (data: any) => void
  onStatusChange: (status: string) => void
}

export const useWebSocketManager = ({ onMessage, onStatusChange }: WebSocketManagerProps) => {
  const wsRefs = useRef<WebSocket[]>([])
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const isConnectingRef = useRef(false)
  const connectionCount = 5

  const connectWebSocket = useCallback(() => {
    if (isConnectingRef.current) return
    
    isConnectingRef.current = true
    onStatusChange('Connecting...')
    
    // Close existing connections
    wsRefs.current.forEach(ws => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    })
    wsRefs.current = []
    
    // Create 5 WebSocket connections for ultra-fast delivery
    for (let i = 0; i < connectionCount; i++) {
      const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws`)
      
      ws.onopen = () => {
        if (wsRefs.current.filter(w => w.readyState === WebSocket.OPEN).length === 1) {
          onStatusChange('Connected')
          isConnectingRef.current = false
          console.log(`WebSocket ${i+1} connected - Total: ${connectionCount}`)
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.image_data) {
            console.log(`Received photo via WebSocket ${i+1}`)
            onMessage(data)
          }
        } catch (error) {
          console.log('Received non-JSON message (likely ping)')
        }
      }

      ws.onclose = (event) => {
        onStatusChange('Disconnected')
        isConnectingRef.current = false
        console.log(`WebSocket ${i+1} disconnected, code:`, event.code)
        
        // Reconnect after delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket()
        }, 2000)
      }

      ws.onerror = () => {
        onStatusChange('Connection Error')
        isConnectingRef.current = false
      }
      
      wsRefs.current.push(ws)
    }
  }, [onMessage, onStatusChange])

  const cleanup = useCallback(() => {
    wsRefs.current.forEach(ws => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    })
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
  }, [])

  return { connectWebSocket, cleanup }
}

export default useWebSocketManager
