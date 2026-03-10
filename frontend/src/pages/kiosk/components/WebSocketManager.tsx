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
  const processedMessages = useRef(new Set<string>())

  const connectWebSocket = useCallback(() => {
    if (isConnectingRef.current) return
    
    isConnectingRef.current = true
    onStatusChange('Connecting...')
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }
    
    const ws = new WebSocket(`${WEBSOCKET_CONFIG.baseUrl}/ws`)
    wsRef.current = ws
    
    ws.onopen = () => {
      onStatusChange('Connected')
      isConnectingRef.current = false
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type) {
          console.log(`Received ${data.type}`)
          onMessage(data)
          return
        }
        
        if (data.image_url) {
          const messageHash = `${data.timestamp}-${data.image_url.substring(data.image_url.lastIndexOf('/') + 1, data.image_url.lastIndexOf('/') + 51)}`
          
          if (processedMessages.current.has(messageHash)) {
            return
          }
          processedMessages.current.add(messageHash)
          
          if (processedMessages.current.size > 50) {
            const hashes = Array.from(processedMessages.current)
            processedMessages.current = new Set(hashes.slice(-25))
          }
          
          console.log('Received photo')
          onMessage(data)
        }
      } catch (error) {
        console.log('Received ping/pong')
      }
    }

    ws.onclose = (event) => {
      onStatusChange('Disconnected')
      isConnectingRef.current = false
      console.log('WebSocket disconnected, code:', event.code)
      
      if (event.code !== 1000) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket()
        }, WEBSOCKET_CONFIG.reconnectInterval)
      }
    }

    ws.onerror = () => {
      onStatusChange('Connection Error')
      isConnectingRef.current = false
    }
  }, [onMessage, onStatusChange])

  const cleanup = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
  }, [])

  return { connectWebSocket, cleanup }
}

export default useWebSocketManager
