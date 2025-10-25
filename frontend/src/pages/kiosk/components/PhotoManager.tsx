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

  const addPhoto = useCallback((data: any) => {
    // Create message hash for deduplication
    const messageHash = `${data.timestamp}-${data.image_data.substring(0, 50)}`
    
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
    
    // Get grid-based position
    const { x, y } = getGridPosition(photos, gridInfo)
    
    const newPhoto: Photo = {
      id: uniqueId,
      image_data: data.image_data,
      timestamp: data.timestamp,
      x: x,
      y: y,
      animation: randomAnimation
    }
    
    setPhotos(prev => {
      const updated = [...prev, newPhoto]
      
      // Use grid info from Grid component
      const maxPhotos = gridInfo.cols * gridInfo.rows
      
      // When grid is full, remove oldest photos
      console.log('maxPhotos :', maxPhotos);
      console.log('updated.length :', updated.length);
      if (updated.length >= maxPhotos) {
        const keepCount = Math.floor(maxPhotos * 0.8) // Keep 80%
        const removedPhotos = updated.slice(0, updated.length - keepCount)
        const cleanedPhotos = updated.slice(-keepCount)
        
        // Clean removed photos from Redis
        const removedIds = removedPhotos.map(p => p.timestamp)
        fetch(`${import.meta.env.VITE_API_URL}/cleanup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(removedIds)
        }).catch(e => console.log('Redis cleanup failed:', e))
        
        console.log(`Grid full! Cleaned ${removedPhotos.length} old photos, keeping ${cleanedPhotos.length}`)
        return [...cleanedPhotos, newPhoto]
      }
      
      return updated
    })
    console.log('Photo added to display')
  }, [photos, gridInfo, setPhotos])

  return { addPhoto }
}

export default usePhotoManager
