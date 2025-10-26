import { useState } from 'react'

interface CustomNameInputProps {
  onNameSubmit: (name: string) => void
}

export const CustomNameInput = ({ onNameSubmit }: CustomNameInputProps) => {
  const [name, setName] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = () => {
    if (name.trim()) {
      onNameSubmit(name.trim())
      setIsSubmitted(true)
    }
  }

  const handleEdit = () => {
    setIsSubmitted(false)
  }

  if (isSubmitted) {
    return (
      <div className="name-section">
        <div className="name-display">
          <span className="name-value">"{name}"</span>
          <button onClick={handleEdit} className="edit-btn">
            ✏️ Edit
          </button>
        </div>
        <p className="name-description">
          Name set successfully! Continue with photo options below.
        </p>
      </div>
    )
  }

  return (
    <div className="name-section">
      <input
        type="text"
        placeholder="Enter your name (e.g., HELLO WORLD)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="name-input"
        maxLength={50}
        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
      />
      <button 
        onClick={handleSubmit}
        className="submit-btn"
        disabled={!name.trim()}
      >
        Submit Name
      </button>
      <p className="name-description">
        Optional: Add your custom name to photos
      </p>
    </div>
  )
}
