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
  // Use grid info from Grid component
  const { cols, rows } = gridInfo
  if (cols === 0 || rows === 0) return { x: 0, y: 0 }
  
  // Create occupied grid map
  const occupiedCells = new Set<string>()
  existingPhotos.forEach(photo => {
    occupiedCells.add(`${photo.x}-${photo.y}`)
  })
  
  // Find random free cell
  const freeCells = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!occupiedCells.has(`${col}-${row}`)) {
        freeCells.push({ col, row })
      }
    }
  }
  
  // If no free cells, pick a random cell
  if (freeCells.length === 0) {
    return {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows)
    }
  }
  
  // Pick a random free cell
  const randomCell = freeCells[Math.floor(Math.random() * freeCells.length)]
  return {
    x: randomCell.col,
    y: randomCell.row
  }
}

export default { getGridPosition }
