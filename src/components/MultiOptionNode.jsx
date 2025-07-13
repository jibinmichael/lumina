import React, { useState, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'

const MultiOptionNode = ({ data, id }) => {
  const [selectedButtons, setSelectedButtons] = useState(new Set())
  const handleRef = useRef(null)

  // Handle button click - creates a new connected node
  const handleButtonClick = (option, index) => {
    // Mark button as selected
    setSelectedButtons(prev => new Set([...prev, index]))
    
    // Trigger node creation through data callback
    if (data.onOptionClick) {
      data.onOptionClick(option, index, id)
    }
  }

  // Get options based on node type
  const getOptionsForType = () => {
    switch (data.nodeType) {
      case 'see-different-angles':
        return [
          'User perspective',
          'Competitor perspective', 
          'Ethical perspective',
          'Technical perspective',
          'Business perspective'
        ]
      case 'similar-stuff':
        return [
          'Related concepts',
          'Similar examples',
          'Analogous ideas',
          'Parallel patterns',
          'Connected themes'
        ]
      case 'rabbit-hole':
        return [
          'What if we...',
          'Why does this...',
          'How might this...',
          'What happens when...',
          'Could this lead to...'
        ]
      case 'ideate':
        return [
          'Creative variation',
          'Bold experiment',
          'Simple solution',
          'Future possibility',
          'Unexpected angle'
        ]
      case 'give-me':
        return [
          'Benefits',
          'Features', 
          'Variations',
          'Examples',
          'Applications'
        ]
      case 'key-insights':
        return [
          'Core insight',
          'Hidden pattern',
          'Key challenge'
        ]
      case 'pros-cons':
        return [
          'Pros',
          'Cons'
        ]
      default:
        return ['Option 1', 'Option 2', 'Option 3']
    }
  }

  const options = getOptionsForType()

  const handleStyle = {
    width: '16px',
    height: '16px',
    background: '#d1d5db',
    border: '2px solid #fff',
    borderRadius: '50%',
    right: '-20px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    cursor: 'pointer'
  }

  return (
    <div className="multi-option-node" style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px',
      minWidth: '200px',
      maxWidth: '280px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}>
      {/* Title */}
      <div style={{
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #f3f4f6'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 600,
          color: '#374151',
          lineHeight: 1.3
        }}>
          {data.label || 'Choose an option...'}
        </h3>
      </div>

      {/* Option Buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleButtonClick(option, index)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: selectedButtons.has(index) ? '2px solid #ec4899' : '1px solid #e5e7eb',
              borderRadius: '8px',
              background: selectedButtons.has(index) ? '#fdf2f8' : '#ffffff',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              if (!selectedButtons.has(index)) {
                e.target.style.background = '#f9fafb'
                e.target.style.borderColor = '#d1d5db'
              }
            }}
            onMouseLeave={(e) => {
              if (!selectedButtons.has(index)) {
                e.target.style.background = '#ffffff'
                e.target.style.borderColor = '#e5e7eb'
              }
            }}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Source handle for connections */}
      <Handle 
        ref={handleRef}
        type="source" 
        position={Position.Right} 
        style={handleStyle}
        className="custom-handle"
      />
      
      {/* Target handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{
          width: '16px',
          height: '16px',
          background: '#d1d5db',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: '-20px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10
        }}
        className="custom-handle"
      />
    </div>
  )
}

export default MultiOptionNode 