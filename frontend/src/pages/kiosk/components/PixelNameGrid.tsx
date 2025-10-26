import { useMemo } from 'react'

interface PixelNameGridProps {
  name: string
}

// Compact 3 * 5 pixel font patterns for each letter
const LETTER_PATTERNS: { [key: string]: string[] } = {
  'A': [
    ' ███ ',
    '█   █',
    '█████',
    '█   █',
    '█   █'
  ],
  'B': [
    '████ ',
    '█   █',
    '████ ',
    '█   █',
    '████ '
  ],
  'C': [
    ' ███ ',
    '█    ',
    '█    ',
    '█    ',
    ' ███ '
  ],
  'D': [
    '████ ',
    '█   █',
    '█   █',
    '█   █',
    '████ '
  ],
  'E': [
    '█████',
    '█    ',
    '███  ',
    '█    ',
    '█████'
  ],
  'F': [
    '█████',
    '█    ',
    '███  ',
    '█    ',
    '█    '
  ],
  'G': [
    ' ███ ',
    '█    ',
    '█ ██ ',
    '█  █ ',
    ' ███ '
  ],
  'H': [
    '█   █',
    '█   █',
    '█████',
    '█   █',
    '█   █'
  ],
  'I': [
    '█████',
    '  █  ',
    '  █  ',
    '  █  ',
    '█████'
  ],
  'J': [
    '█████',
    '    █',
    '    █',
    '█   █',
    ' ███ '
  ],
  'K': [
    '█   █',
    '█  █ ',
    '███  ',
    '█  █ ',
    '█   █'
  ],
  'L': [
    '█    ',
    '█    ',
    '█    ',
    '█    ',
    '█████'
  ],
  'M': [
    '█   █',
    '██ ██',
    '█ █ █',
    '█   █',
    '█   █'
  ],
  'N': [
    '█   █',
    '██  █',
    '█ █ █',
    '█  ██',
    '█   █'
  ],
  'O': [
    ' ███ ',
    '█   █',
    '█   █',
    '█   █',
    ' ███ '
  ],
  'P': [
    '████ ',
    '█   █',
    '████ ',
    '█    ',
    '█    '
  ],
  'Q': [
    ' ███ ',
    '█   █',
    '█ █ █',
    '█  ██',
    ' ████'
  ],
  'R': [
    '████ ',
    '█   █',
    '████ ',
    '█  █ ',
    '█   █'
  ],
  'S': [
    ' ███ ',
    '█    ',
    ' ███ ',
    '    █',
    ' ███ '
  ],
  'T': [
    '█████',
    '  █  ',
    '  █  ',
    '  █  ',
    '  █  '
  ],
  'U': [
    '█   █',
    '█   █',
    '█   █',
    '█   █',
    ' ███ '
  ],
  'V': [
    '█   █',
    '█   █',
    '█   █',
    ' █ █ ',
    '  █  '
  ],
  'W': [
    '█   █',
    '█   █',
    '█ █ █',
    '██ ██',
    '█   █'
  ],
  'X': [
    '█   █',
    ' █ █ ',
    '  █  ',
    ' █ █ ',
    '█   █'
  ],
  'Y': [
    '█   █',
    ' █ █ ',
    '  █  ',
    '  █  ',
    '  █  '
  ],
  'Z': [
    '█████',
    '   █ ',
    '  █  ',
    ' █   ',
    '█████'
  ],
  ' ': [
    '     ',
    '     ',
    '     ',
    '     ',
    '     '
  ]
}

export const PixelNameGrid = ({ name }: PixelNameGridProps) => {
  const cellSizePercentage = parseInt(import.meta.env.VITE_NAME_DISPLAY_GRID || '4')
  const gridGapPercentage = parseInt(import.meta.env.VITE_GRID_GAP_PERCENTAGE || '1')
  
  const pixelGrid = useMemo(() => {
    const letters = name.toUpperCase().split('')
    const letterHeight = 5 // Reduced from 7 to 5
    const letterWidth = 5
    const spacing = 1 // Space between letters
    
    // Calculate total width needed
    const totalWidth = letters.length * letterWidth + (letters.length - 1) * spacing
    
    // Create the pixel grid
    const grid: boolean[][] = []
    for (let row = 0; row < letterHeight; row++) {
      grid[row] = new Array(totalWidth).fill(false)
    }
    
    // Fill in each letter
    letters.forEach((letter, letterIndex) => {
      const pattern = LETTER_PATTERNS[letter] || LETTER_PATTERNS[' ']
      const startCol = letterIndex * (letterWidth + spacing)
      
      pattern.forEach((row, rowIndex) => {
        for (let col = 0; col < letterWidth; col++) {
          if (row[col] === '█') {
            grid[rowIndex][startCol + col] = true
          }
        }
      })
    })
    
    return grid
  }, [name])

  const cellSize = `${cellSizePercentage}vw`
  const gap = `${gridGapPercentage}vw`
  const gridWidth = pixelGrid[0]?.length || 0
  const gridHeight = pixelGrid.length

  return (
    <div 
      className="pixel-name-grid"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'grid',
        gridTemplateColumns: `repeat(${gridWidth}, ${cellSize})`,
        gridTemplateRows: `repeat(${gridHeight}, ${cellSize})`,
        gap: gap,
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    >
      {pixelGrid.flat().map((isFilled, index) => (
        <div
          key={index}
          className="pixel-cell"
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: isFilled ? 'white' : 'transparent',
            border: '1px solid rgba(0, 0, 0, 0.3)',
            borderRadius: '2px',
            boxShadow: isFilled ? '0 0 4px rgba(255, 255, 255, 0.5)' : 'none',
            animation: isFilled ? `pixelShow 0.5s ease-out ${index * 0.01}s both` : 'none'
          }}
        />
      ))}
    </div>
  )
}
