import { useRef, useCallback, useEffect } from 'react'
import { getRandomAnimation } from './Animations'

interface Photo {
  id: string
  image_url: string
  timestamp: string
  x: number
  y: number
  animation: string
  isPopup?: boolean
}

interface GridInfo {
  cols: number
  rows: number
}

interface PhotoManagerProps {
  gridInfo: GridInfo
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>
  popupDuration: number
}

export const usePhotoManager = ({ gridInfo, setPhotos, popupDuration }: PhotoManagerProps) => {
  const idCounter = useRef(0)
  const occupiedCells = useRef(new Set<string>())
  const isProcessing = useRef(false)
  const pendingQueue = useRef<any[]>([])
  const processingInterval = useRef<NodeJS.Timeout | null>(null)

  const processPhoto = useCallback((photoData: any) => {
    isProcessing.current = true
    
    try {
      // No duplicate detection - show all images
      const randomAnimation = getRandomAnimation()
      
      // Generate truly unique ID
      idCounter.current += 1
      const now = new Date()
      const uniqueId = `${now.getTime()}-${now.getMilliseconds()}-${idCounter.current}-${Math.random().toString(36).substr(2, 9)}`
    
      console.log('Processing photo with grid:', gridInfo)
    
      setPhotos(prev => {
        // Check if grid is full and cleanup first
        const maxPhotos = gridInfo.cols * gridInfo.rows
        let currentPhotos = prev
        
        console.log(`Grid: ${gridInfo.cols}x${gridInfo.rows} = ${maxPhotos} cells, current photos: ${currentPhotos.length}`)
        
        // Cleanup logic
        const queueSize = pendingQueue.current.length
        let cleanupPercentage = 0.03
        
        if (queueSize > 20) {
          cleanupPercentage = 0.5
        } else if (queueSize > 10) {
          cleanupPercentage = 0.4
        }
        
        if (currentPhotos.length >= maxPhotos) {
          const removeCount = Math.floor(maxPhotos * cleanupPercentage)
          currentPhotos = currentPhotos.slice(removeCount)
          console.log(`Grid full! Removed ${removeCount} oldest photos`)
        }
        
        // Update occupied cells tracker
        occupiedCells.current.clear()
        currentPhotos.forEach(photo => {
          occupiedCells.current.add(`${photo.x},${photo.y}`)
        })
        
        // Find empty cell
        const { cols, rows } = gridInfo
        
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
        
        if (emptyCells.length === 0) {
          console.log('Grid still full after cleanup, skipping photo')
          return currentPhotos
        }
        
        const randomIndex = Math.floor(Math.random() * emptyCells.length)
        const position = emptyCells[randomIndex]
        
        if (position.x < 0 || position.x >= cols || position.y < 0 || position.y >= rows) {
          console.log('Position out of bounds:', position)
          return currentPhotos
        }
        
        occupiedCells.current.add(`${position.x},${position.y}`)
        
        const newPhoto: Photo = {
          id: uniqueId,
          image_url: photoData.image_url,
          timestamp: photoData.timestamp,
          x: position.x,
          y: position.y,
          animation: randomAnimation,
          isPopup: true
        }
        
        console.log(`Added photo at position (${position.x}, ${position.y})`)
        
        // Move to grid position after popup
        setTimeout(() => {
          setPhotos(prev => prev.map(p => 
            p.id === uniqueId ? { ...p, isPopup: false } : p
          ))
        }, popupDuration)
        
        return [...currentPhotos, newPhoto]
      })
      
      console.log(`Photo processed (${pendingQueue.current.length} pending)`)
    } catch (error) {
      console.error('Error processing photo:', error)
    } finally {
      isProcessing.current = false
    }
  }, [gridInfo, setPhotos, popupDuration])

  // Start queue processor on mount
  const startQueueProcessor = useCallback(() => {
    if (processingInterval.current) return
    
    console.log('🚀 Starting queue processor')
    processingInterval.current = setInterval(() => {
      if (pendingQueue.current.length > 0 && !isProcessing.current) {
        console.log(`📋 Processing queue: ${pendingQueue.current.length} pending`)
        const nextPhoto = pendingQueue.current.shift()
        if (nextPhoto) {
          processPhoto(nextPhoto)
        }
      }
    }, 50) // Process every 50ms = 20 photos/second max
  }, [processPhoto])

  // Stop queue processor
  const stopQueueProcessor = useCallback(() => {
    if (processingInterval.current) {
      clearInterval(processingInterval.current)
      processingInterval.current = null
    }
  }, [])

  const addPhoto = useCallback((data: any) => {
    // Add to queue
    pendingQueue.current.push(data)
    console.log(`📥 Added photo to queue: ${pendingQueue.current.length} total`)
    
    // Limit queue size
    if (pendingQueue.current.length > 100) {
      pendingQueue.current = pendingQueue.current.slice(-50)
      console.log('Queue overflow: keeping only latest 50 photos')
    }
    
    // Start processor if not running
    startQueueProcessor()
  }, [startQueueProcessor])

  // Cleanup on unmount
  useEffect(() => {
    startQueueProcessor()
    return () => {
      stopQueueProcessor()
    }
  }, [startQueueProcessor, stopQueueProcessor])

  const duplicateFill = useCallback(() => {
    console.log('🔄 Starting duplicate fill')
    
    setPhotos(prev => {
      const maxPhotos = gridInfo.cols * gridInfo.rows
      const currentCount = prev.length
      const emptyCells = maxPhotos - currentCount
      
      console.log(`Grid: ${gridInfo.cols}x${gridInfo.rows} = ${maxPhotos} cells`)
      console.log(`Current photos: ${currentCount}, Empty cells: ${emptyCells}`)
      
      if (emptyCells <= 0 || prev.length === 0) {
        console.log('Grid is full or no photos to duplicate')
        return prev
      }
      
      // Update occupied cells tracker
      occupiedCells.current.clear()
      prev.forEach(photo => {
        occupiedCells.current.add(`${photo.x},${photo.y}`)
      })
      
      // Find all empty positions
      const emptyPositions = []
      for (let y = 0; y < gridInfo.rows; y++) {
        for (let x = 0; x < gridInfo.cols; x++) {
          if (!occupiedCells.current.has(`${x},${y}`)) {
            emptyPositions.push({ x, y })
          }
        }
      }
      
      // Create duplicates to fill empty cells
      const duplicates = []
      for (let i = 0; i < emptyPositions.length; i++) {
        // Cycle through existing photos
        const sourcePhoto = prev[i % prev.length]
        const position = emptyPositions[i]
        
        const duplicateId = `duplicate-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`
        
        const duplicatePhoto: Photo = {
          id: duplicateId,
          image_url: sourcePhoto.image_url,
          timestamp: sourcePhoto.timestamp,
          x: position.x,
          y: position.y,
          animation: getRandomAnimation(),
          isPopup: false // No popup for duplicates
        }
        
        duplicates.push(duplicatePhoto)
        occupiedCells.current.add(`${position.x},${position.y}`)
      }
      
      console.log(`Created ${duplicates.length} duplicate photos`)
      return [...prev, ...duplicates]
    })
  }, [gridInfo, setPhotos])

  return { addPhoto, duplicateFill }
}

export default usePhotoManager
