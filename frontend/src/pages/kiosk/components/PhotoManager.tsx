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

  const addPhoto = useCallback((data: any) => {
    // Add to queue if currently processing
    if (isProcessing.current) {
      pendingQueue.current.push(data)
      return
    }

    // Lock processing
    isProcessing.current = true

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
        // Update occupied cells tracker with current photos
        occupiedCells.current.clear()
        prev.forEach(photo => {
          occupiedCells.current.add(`${photo.x},${photo.y}`)
        })
        
        // Find empty cell using synchronous tracker
        const { cols, rows } = gridInfo
        const emptyCells = []
        
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (!occupiedCells.current.has(`${x},${y}`)) {
              emptyCells.push({ x, y })
            }
          }
        }
        
        // Skip if no empty cells available
        if (emptyCells.length === 0) {
          console.log('Grid is full, skipping photo')
          return prev
        }
        
        // Get random empty cell
        const randomIndex = Math.floor(Math.random() * emptyCells.length)
        const position = emptyCells[randomIndex]
        
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
        
        const updated = [...prev, newPhoto]
        
        // Use grid info from Grid component
        const maxPhotos = gridInfo.cols * gridInfo.rows
        
        // When grid is full, remove 30% oldest photos
        if (updated.length > maxPhotos) {
          const removeCount = Math.floor(maxPhotos * 0.3) // Remove 30%
          const removedPhotos = updated.slice(0, removeCount)
          const remainingPhotos = updated.slice(removeCount)
          
          // Clean removed photos from Redis
          const removedIds = removedPhotos.map(p => p.timestamp)
          fetch(`${import.meta.env.VITE_API_URL}/cleanup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(removedIds)
          }).catch(e => console.log('Redis cleanup failed:', e))
          
          console.log(`Grid full! Removed ${removeCount} oldest photos (30%), keeping ${remainingPhotos.length} photos (70%)`)
          return remainingPhotos
        }
        
        return updated
      })
    }

    // Process current photo
    processPhoto(data)

    // Unlock and process queue
    setTimeout(() => {
      isProcessing.current = false
      if (pendingQueue.current.length > 0) {
        const nextPhoto = pendingQueue.current.shift()
        addPhoto(nextPhoto)
      }
    }, 0)
    console.log('Photo added to display')
  }, [photos, gridInfo, setPhotos])

  return { addPhoto }
}

export default usePhotoManager
