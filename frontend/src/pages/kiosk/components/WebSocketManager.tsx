import { useRef, useCallback } from 'react'

interface WebSocketManagerProps {
  onMessage: (data: any) => void
  onStatusChange: (status: string) => void
}

export const useWebSocketManager = ({ onMessage, onStatusChange }: WebSocketManagerProps) => {
  const wsRefs = useRef<WebSocket[]>([])
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isConnectingRef = useRef(false)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const processedMessages = useRef(new Set<string>())
  const connectionCount = 1 // Single connection for better performance

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
    
    // Create single WebSocket connection for optimal performance
    for (let i = 0; i < connectionCount; i++) {
      const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws`)
      
      ws.onopen = () => {
        if (wsRefs.current.filter(w => w.readyState === WebSocket.OPEN).length === 1) {
          onStatusChange('Connected')
          isConnectingRef.current = false
          console.log(`WebSocket ${i+1} connected - Total: ${connectionCount}`)
          
          // Start heartbeat to keep connection alive
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = setInterval(() => {
            wsRefs.current.forEach(socket => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send('ping')
              }
            })
          }, 10000) // Ping every 10 seconds (more frequent)
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.image_data) {
            // Create message hash for deduplication
            const messageHash = `${data.timestamp}-${data.image_data.substring(0, 50)}`
            
            // Skip if already processed
            if (processedMessages.current.has(messageHash)) {
              return
            }
            processedMessages.current.add(messageHash)
            
            // Clean old hashes (keep only last 100)
            if (processedMessages.current.size > 100) {
              const hashes = Array.from(processedMessages.current)
              processedMessages.current = new Set(hashes.slice(-50))
            }
            
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
        
        // Only reconnect if not intentionally closed
        if (event.code !== 1000) {
          // Longer delay to prevent rapid reconnection
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket()
          }, 5000) // 5 second delay instead of 2
        }
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
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
  }, [])

  return { connectWebSocket, cleanup }
}

export default useWebSocketManager
