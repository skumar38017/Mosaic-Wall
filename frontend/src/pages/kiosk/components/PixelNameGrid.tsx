import { useMemo } from 'react'

interface Photo {
  id: string
  image_data: string
  timestamp: string
  x: number
  y: number
  animation: string
  isPopup?: boolean
}

interface PixelNameGridProps {
  name: string
  photos: Photo[]
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

export const PixelNameGrid = ({ name, photos }: PixelNameGridProps) => {
  const cellSizePercentage = parseInt(import.meta.env.VITE_NAME_DISPLAY_GRID || '2')
  const gridGapPercentage = parseInt(import.meta.env.VITE_GRID_GAP_PERCENTAGE || '1')
  
  const { pixelGrid, filledCells } = useMemo(() => {
    const cellSizePercentage = parseInt(import.meta.env.VITE_NAME_DISPLAY_GRID || '2')
    const gridGapPercentage = parseInt(import.meta.env.VITE_GRID_GAP_PERCENTAGE || '1')
    
    // Calculate how many letter cells can fit horizontally on screen
    const letterWidth = 5
    const spacing = 1
    const letterWithSpacing = letterWidth + spacing
    const maxLettersPerLine = Math.floor(100 / (cellSizePercentage + gridGapPercentage)) / letterWithSpacing
    const maxCharsPerLine = Math.floor(maxLettersPerLine) - 0 // Leave margin
    
    console.log('Max chars per line:', maxCharsPerLine)
    
    // Split text into words and wrap lines
    const words = name.toUpperCase().split(' ')
    const lines: string[] = []
    let currentLine = ''
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine
      } else {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          // Word is too long, break it
          lines.push(word.substring(0, maxCharsPerLine))
          currentLine = word.substring(maxCharsPerLine)
        }
      }
    })
    
    if (currentLine) {
      lines.push(currentLine)
    }
    
    console.log('Wrapped lines:', lines)
    
    const letterHeight = 5
    const lineSpacing = 1 // Space between lines
    
    // Calculate grid dimensions
    const maxLineWidth = Math.max(...lines.map(line => line.length))
    const totalWidth = maxLineWidth * letterWidth + (maxLineWidth - 1) * spacing
    const totalHeight = lines.length * letterHeight + (lines.length - 1) * lineSpacing
    
    // Create the pixel grid
    const grid: boolean[][] = []
    const filled: number[] = [] // Track filled cell indices
    
    for (let row = 0; row < totalHeight; row++) {
      grid[row] = new Array(totalWidth).fill(false)
    }
    
    // Fill in each line with center alignment
    lines.forEach((line, lineIndex) => {
      const lineStartRow = lineIndex * (letterHeight + lineSpacing)
      
      // Calculate center offset for this line
      const lineWidth = line.length * letterWidth + (line.length - 1) * spacing
      const centerOffset = Math.floor((totalWidth - lineWidth) / 2)
      
      line.split('').forEach((letter, letterIndex) => {
        const pattern = LETTER_PATTERNS[letter] || LETTER_PATTERNS[' ']
        const startCol = centerOffset + letterIndex * (letterWidth + spacing)
        
        pattern.forEach((row, rowIndex) => {
          for (let col = 0; col < letterWidth; col++) {
            if (row[col] === '█') {
              const gridRow = lineStartRow + rowIndex
              const gridCol = startCol + col
              if (gridRow < totalHeight && gridCol < totalWidth) {
                grid[gridRow][gridCol] = true
                filled.push(gridRow * totalWidth + gridCol)
              }
            }
          }
        })
      })
    })
    
    return { pixelGrid: grid, filledCells: filled }
  }, [name, photos])

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
      {pixelGrid.flat().map((isFilled, index) => {
        const filledIndex = filledCells.indexOf(index)
        const photo = filledIndex >= 0 && photos[filledIndex % photos.length]
        
        return (
          <div
            key={index}
            className="pixel-cell"
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: isFilled && !photo ? 'white' : 'transparent',
              borderRadius: '2px',
              boxShadow: isFilled ? '0 0 4px rgba(255, 255, 255, 0.5)' : 'none',
              animation: isFilled ? `pixelShow 0.5s ease-out ${index * 0.01}s both` : 'none',
              backgroundImage: photo ? `url(data:image/jpeg;base64,${photo.image_data})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          />
        )
      })}
    </div>
  )
}
