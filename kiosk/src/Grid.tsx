import { useEffect } from 'react'
import './Grid.css'

interface GridProps {
  onGridUpdate: (cols: number, rows: number) => void
}

const Grid = ({ onGridUpdate }: GridProps) => {
  const minCellSize = 150
  const maxCellPercentage = 7 // 16% of screen width
  
  // Calculate dynamic cell size
  const maxCellSize = (window.innerWidth * maxCellPercentage) / 100
  const cellSize = Math.max(minCellSize, maxCellSize)
  
  const cols = Math.floor(window.innerWidth / cellSize)
  const rows = Math.floor(window.innerHeight / cellSize)
  
  // Adjust cell size to cover whole screen (square cells)
  const actualCellWidth = window.innerWidth / cols
  const actualCellHeight = window.innerHeight / rows
  const squareCellSize = Math.min(actualCellWidth, actualCellHeight)

  // Update parent with grid info after render
  useEffect(() => {
    onGridUpdate(cols, rows)
  }, [cols, rows, onGridUpdate])

  return (
    <div className="grid-overlay">
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => (
          <div
            key={`${col}-${row}`}
            className="grid-cell"
            style={{
              left: `${col * actualCellWidth}px`,
              top: `${row * actualCellHeight}px`,
              width: `${actualCellWidth}px`,
              height: `${actualCellHeight}px`
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
