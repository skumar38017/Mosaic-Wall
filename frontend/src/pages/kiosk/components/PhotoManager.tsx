import { useRef, useCallback } from 'react'
import { getRandomAnimation } from './Animations'
import { getGridPosition } from './PhotoPositioning'

interface Photo {
  id: string
  image_data: string
  timestamp: string
  x: number
  y: number
  animation: string
}

interface GridInfo {
  cols: number
  rows: number
}

interface PhotoManagerProps {
  photos: Photo[]
  gridInfo: GridInfo
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>
}

export const usePhotoManager = ({ photos, gridInfo, setPhotos }: PhotoManagerProps) => {
  const processedMessages = useRef(new Set<string>())
  const idCounter = useRef(0)
  const occupiedCells = useRef(new Set<string>())
  const isProcessing = useRef(false)
  const pendingQueue = useRef<any[]>([])
  const lastProcessTime = useRef(Date.now())

  const addPhoto = useCallback((data: any) => {
    // Rate limiting: Process max 50 photos per second for ultra-fast display
    const now = Date.now()
    if (now - lastProcessTime.current < 20) { // 20ms = 50 photos/second
      // Add to queue if too frequent
      pendingQueue.current.push(data)
      
      // Limit queue size to prevent memory overflow (max 50 pending)
      if (pendingQueue.current.length > 50) {
        pendingQueue.current = pendingQueue.current.slice(-25) // Keep only latest 25
        console.log('Queue overflow: keeping only latest 25 photos')
      }
      return
    }

    // Add to queue if currently processing
    if (isProcessing.current) {
      pendingQueue.current.push(data)
      return
    }

    // Lock processing
    isProcessing.current = true
    lastProcessTime.current = now

    const processPhoto = (photoData: any) => {
      // Create message hash for deduplication
      const messageHash = `${photoData.timestamp}-${photoData.image_data.substring(0, 50)}`
      
      // Skip if already processed
      if (processedMessages.current.has(messageHash)) {
        return
      }
      processedMessages.current.add(messageHash)
      
      // Clean old hashes (keep only last 1000)
      if (processedMessages.current.size > 1000) {
        const hashes = Array.from(processedMessages.current)
        processedMessages.current = new Set(hashes.slice(-500))
      }
      
      const randomAnimation = getRandomAnimation()
      
      // Generate truly unique ID with current datetime
      idCounter.current += 1
      const now = new Date()
      const uniqueId = `${now.getTime()}-${now.getMilliseconds()}-${idCounter.current}-${Math.random().toString(36).substr(2, 9)}`
    
      setPhotos(prev => {
        // Check if grid is full and cleanup first
        const maxPhotos = gridInfo.cols * gridInfo.rows
        let currentPhotos = prev
        
        // For high-volume: More aggressive cleanup when queue is large
        const queueSize = pendingQueue.current.length
        let cleanupPercentage = 0.3 // Default 30%
        
        if (queueSize > 20) {
          cleanupPercentage = 0.5 // 50% cleanup if queue is large
          console.log(`High volume detected (${queueSize} pending): increasing cleanup to 50%`)
        } else if (queueSize > 10) {
          cleanupPercentage = 0.4 // 40% cleanup if moderate queue
        }
        
        if (currentPhotos.length >= maxPhotos) {
          const removeCount = Math.floor(maxPhotos * cleanupPercentage)
          currentPhotos = currentPhotos.slice(removeCount)
          
          // Clean removed photos from Redis (async, don't wait)
          const removedIds = prev.slice(0, removeCount).map(p => p.timestamp)
          if (removedIds.length > 0) {
            fetch(`${import.meta.env.VITE_API_URL}/cleanup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(removedIds)
            }).catch(e => console.log('Redis cleanup failed:', e))
          }
          
          console.log(`Grid full! Removed ${removeCount} oldest photos (${Math.round(cleanupPercentage*100)}%), keeping ${currentPhotos.length} photos`)
        }
        
        // Update occupied cells tracker with current photos after cleanup
        occupiedCells.current.clear()
        currentPhotos.forEach(photo => {
          occupiedCells.current.add(`${photo.x},${photo.y}`)
        })
        
        // Find empty cell using synchronous tracker with boundary validation
        const { cols, rows } = gridInfo
        
        // Ensure grid dimensions are valid
        if (cols <= 0 || rows <= 0) {
          console.log('Invalid grid dimensions:', { cols, rows })
          return currentPhotos
        }
        
        const emptyCells = []
        
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (!occupiedCells.current.has(`${x},${y}`)) {
              emptyCells.push({ x, y })
            }
          }
        }
        
        // Skip if still no empty cells available (shouldn't happen after cleanup)
        if (emptyCells.length === 0) {
          console.log('Grid still full after cleanup, skipping photo')
          return currentPhotos
        }
        
        // Get random empty cell with bounds validation
        const randomIndex = Math.floor(Math.random() * emptyCells.length)
        const position = emptyCells[randomIndex]
        
        // Validate position is within grid bounds
        if (position.x < 0 || position.x >= cols || position.y < 0 || position.y >= rows) {
          console.log('Position out of bounds:', position, 'Grid:', { cols, rows })
          return currentPhotos
        }
        
        // Immediately mark this cell as occupied
        occupiedCells.current.add(`${position.x},${position.y}`)
        
        const newPhoto: Photo = {
          id: uniqueId,
          image_data: photoData.image_data,
          timestamp: photoData.timestamp,
          x: position.x,
          y: position.y,
          animation: randomAnimation
        }
        
        return [...currentPhotos, newPhoto]
      })
    }

    // Process current photo
    processPhoto(data)

    // Unlock and process queue with rate limiting
    setTimeout(() => {
      isProcessing.current = false
      if (pendingQueue.current.length > 0) {
        const nextPhoto = pendingQueue.current.shift()
        // Process next photo with appropriate delay based on queue size
        const delay = pendingQueue.current.length > 10 ? 10 : 20 // Burst mode: 100/sec vs 50/sec
        setTimeout(() => addPhoto(nextPhoto), delay)
      }
    }, 0)
    console.log(`Photo added to display (${pendingQueue.current.length} pending)`)
  }, [photos, gridInfo, setPhotos])

  return { addPhoto }
}

export default usePhotoManager
