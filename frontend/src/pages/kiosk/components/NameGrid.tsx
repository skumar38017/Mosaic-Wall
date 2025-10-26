import { useEffect, useState } from 'react'

interface NameGridProps {
  name: string
}

export const NameGrid = ({ name }: NameGridProps) => {
  const cellSizePercentage = parseInt(import.meta.env.VITE_NAME_DISPLAY_GRID || '4') // 4% of screen
  const gridGapPercentage = parseInt(import.meta.env.VITE_GRID_GAP_PERCENTAGE || '1') // 1% gap
  
  const cellSize = `${cellSizePercentage}vw`
  const gap = `${gridGapPercentage}vw`
  const cols = Math.floor(100 / (cellSizePercentage + gridGapPercentage))
  const rows = Math.ceil(100 / (cellSizePercentage + gridGapPercentage))

  return (
    <div 
      className="name-with-grid-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    >
      {/* Name Display */}
      <div
        className="name-display"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontWeight: 'bold',
          fontSize: 'clamp(2rem, 15vw, 20rem)',
          textShadow: '3px 3px 6px rgba(0, 0, 0, 0.9)',
          textAlign: 'center',
          zIndex: 1001,
          animation: 'nameShow 0.5s ease-out'
        }}
      >
        {name}
      </div>
      
      {/* Grid Overlay */}
      <div 
        className="grid-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellSize})`,
          gridTemplateRows: `repeat(${rows}, ${cellSize})`,
          gap: gap,
          padding: gap,
          boxSizing: 'border-box',
          zIndex: 1002
        }}
      >
        {Array.from({ length: cols * rows }).map((_, index) => (
          <div
            key={index}
            className="grid-cell"
            style={{
              border: '1px solid rgba(0, 0, 0, 0.8)',
              borderRadius: '4px'
            }}
          />
        ))}
      </div>
    </div>
  )
}
