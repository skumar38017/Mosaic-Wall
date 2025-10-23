import { useEffect, useState } from 'react'
import './Grid.css'

interface GridProps {
  onGridUpdate: (cols: number, rows: number) => void
}

const Grid = ({ onGridUpdate }: GridProps) => {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  const minCellSize = 3  // 3% of screen width of cell size
  const maxCellPercentage = 7 // 7% of screen width of cell size
  
  // Calculate dynamic cell size
  const maxCellSize = (dimensions.width * maxCellPercentage) / 100
  const cellSize = Math.max(minCellSize, maxCellSize)
  
  const cols = Math.floor(dimensions.width / cellSize)
  const rows = Math.floor(dimensions.height / cellSize)
  
  // Adjust cell size to cover whole screen (square cells)
  const actualCellWidth = dimensions.width / cols
  const actualCellHeight = dimensions.height / rows

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
