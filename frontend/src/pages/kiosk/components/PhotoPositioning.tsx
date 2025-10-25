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

export const getGridPosition = (existingPhotos: Photo[], gridInfo: GridInfo) => {
  const { cols, rows } = gridInfo
  if (cols === 0 || rows === 0) return null
  
  // Create set of occupied positions
  const occupied = new Set()
  existingPhotos.forEach(photo => {
    occupied.add(`${photo.x},${photo.y}`)
  })
  
  // Find all empty cells
  const emptyCells = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(`${x},${y}`)) {
        emptyCells.push({ x, y })
      }
    }
  }
  
  // Return random empty cell or null if grid is full
  if (emptyCells.length === 0) return null
  
  const randomIndex = Math.floor(Math.random() * emptyCells.length)
  return emptyCells[randomIndex]
}

export default { getGridPosition }
