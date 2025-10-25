import { useEffect } from 'react'
import './Grid.css'

interface GridProps {
  onGridUpdate: (cols: number, rows: number) => void
}

const Grid = ({ onGridUpdate }: GridProps) => {
  const dimensions = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  const cellPercentage = import.meta.env.VITE_GRID_CELL_PERCENTAGE // Fixed 5% of smaller dimension
  const smallerDimension = Math.min(dimensions.width, dimensions.height)
  const cellSize = (smallerDimension * cellPercentage) / 100
  
  const cols = Math.floor(dimensions.width / cellSize)
  const rows = Math.floor(dimensions.height / cellSize)
  
  // Adjust cell size to cover whole screen (square cells)
  const actualCellWidth = dimensions.width / cols
  const actualCellHeight = dimensions.height / rows

  // Calculate dynamic font size based on cell size
  const minFontSize = 9
  const maxFontSize = 28
  const cellSizeForFont = Math.min(actualCellWidth, actualCellHeight)
  const fontSize = Math.min(Math.max(cellSizeForFont * 0.25, minFontSize), maxFontSize)

  // Call onGridUpdate after mount and whenever cols/rows change
  useEffect(() => {
    onGridUpdate(cols, rows)
  }, [cols, rows, onGridUpdate])

  // Update parent with grid info after render
  useEffect(() => {
    onGridUpdate(cols, rows)
  }, [cols, rows])

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
