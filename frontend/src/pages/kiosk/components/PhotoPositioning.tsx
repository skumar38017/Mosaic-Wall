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
  
  const cellWidth = window.innerWidth / cols
  const cellHeight = window.innerHeight / rows
  
  // Create occupied grid map
  const occupiedCells = new Set<string>()
  existingPhotos.forEach(photo => {
    const gridX = Math.floor(photo.x / cellWidth)
    const gridY = Math.floor(photo.y / cellHeight)
    occupiedCells.add(`${gridX}-${gridY}`)
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
  
  if (freeCells.length === 0) return { x: 0, y: 0 }
  
  const randomCell = freeCells[Math.floor(Math.random() * freeCells.length)]
  return {
    x: randomCell.col * cellWidth,
    y: randomCell.row * cellHeight
  }
}

export default { getGridPosition }
