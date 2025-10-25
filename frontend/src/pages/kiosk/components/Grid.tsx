import { useEffect, useState } from 'react'
import './Grid.css'

interface GridProps {
  onGridUpdate: (cols: number, rows: number, cellWidth: number, cellHeight: number, gapX: number, gapY: number) => void
}

// Get cell percentage from environment variable with fallback
const CELL_PERCENTAGE = Number(import.meta.env.VITE_GRID_CELL_PERCENTAGE) || 25
const GRID_GAP = Number(import.meta.env.VITE_GRID_GAP_PERCENTAGE) || 1 // 1px gap both sides

// Calculate initial dynamic grid based on screen size
export const getInitialGrid = () => {
  const smallerDimension = Math.min(window.innerWidth, window.innerHeight)
  const cellSize = (smallerDimension * CELL_PERCENTAGE) / 100
  const gapX = GRID_GAP // horizontal gap
  const gapY = GRID_GAP // vertical gap
  const cols = Math.floor(window.innerWidth / (cellSize + gapX))
  const rows = Math.floor(window.innerHeight / (cellSize + gapY))
  const cellWidth = (window.innerWidth - (cols - 1) * gapX) / cols
  const cellHeight = (window.innerHeight - (rows - 1) * gapY) / rows
  return { cols, rows, cellWidth, cellHeight, gapX, gapY }
}

const Grid = ({ onGridUpdate }: GridProps) => {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  const cellPercentage = CELL_PERCENTAGE // Use environment variable
  const gapX = GRID_GAP // horizontal gap (1px)
  const gapY = GRID_GAP // vertical gap (1px)
  
  // Calculate cell size based on smaller dimension for consistent sizing in both orientations
  const smallerDimension = Math.min(dimensions.width, dimensions.height)
  const cellSize = (smallerDimension * cellPercentage) / 100
  
  const cols = Math.floor(dimensions.width / (cellSize + gapX))
  const rows = Math.floor(dimensions.height / (cellSize + gapY))
  
  // Adjust cell size to cover whole screen with gaps
  const actualCellWidth = (dimensions.width - (cols - 1) * gapX) / cols
  const actualCellHeight = (dimensions.height - (rows - 1) * gapY) / rows

  // Calculate dynamic font size based on cell size
  const minFontSize = 9
  const maxFontSize = 28
  const cellSizeForFont = Math.min(actualCellWidth, actualCellHeight)
  const fontSize = Math.min(Math.max(cellSizeForFont * 0.25, minFontSize), maxFontSize)

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Update parent with grid info after render
  useEffect(() => {
    onGridUpdate(cols, rows, actualCellWidth, actualCellHeight, gapX, gapY)
  }, [cols, rows, actualCellWidth, actualCellHeight, gapX, gapY])

  return (
    <div className="grid-overlay">
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => (
          <div
            key={`${col}-${row}`}
            className="grid-cell"
            style={{
              left: `${col * (actualCellWidth + gapX)}px`,
              top: `${row * (actualCellHeight + gapY)}px`,
              width: `${actualCellWidth}px`,
              height: `${actualCellHeight}px`,
              fontSize: `${fontSize}px`
            }}
          >
            {col}/{row}
          </div>
        ))
      )}
    </div>
  )
}

export default Grid