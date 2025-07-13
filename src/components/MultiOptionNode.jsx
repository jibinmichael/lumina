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

  // Get options and emoji based on node type
  const getNodeConfig = () => {
    switch (data.nodeType) {
      case 'see-different-angles':
        return {
          emoji: '🔄',
          options: [
            'User Perspective',
            'Competitor View',
            'Ethical Lens',
            'Technical Constraint',
            'Opposite Assumption'
          ]
        }
      case 'similar-stuff':
        return {
          emoji: '🧩',
          options: [
            'Related Theme',
            'Analogous Situation',
            'Parallel Case',
            'Adjacent Idea',
            'Shared Pattern'
          ]
        }
      case 'rabbit-hole':
        return {
          emoji: '🚀',
          options: [
            'What if…',
            'Why might…',
            'How else…',
            'What happens when…',
            'Could it also…'
          ]
        }
      case 'ideate':
        return {
          emoji: '🌱',
          options: [
            'Wild Take',
            'Simple Fix',
            'Bold Experiment',
            'Long-Term Vision',
            'Underdog Strategy'
          ]
        }

      case 'key-insights':
        return {
          emoji: '🔑',
          options: [
            'Core Theme',
            'Underlying Pattern',
            'Root Challenge'
          ]
        }
      case 'pros-cons':
        return {
          emoji: '⚖️',
          options: [
            'Possible Upside',
            'Possible Risk'
          ]
        }
      case 'shift-perspectives':
        return {
          emoji: '🔀',
          options: [
            'What would an outsider say?',
            'Use a metaphor',
            'Zoom out 10x',
            'Flip this idea',
            'Imagine the opposite'
          ]
        }
      case 'clarify-problem':
        return {
          emoji: '🧩',
          options: [
            'What problem is this solving?',
            'Root cause?',
            'What\'s not the problem?',
            'One-sentence definition'
          ]
        }
      case 'build-on-this':
        return {
          emoji: '🧱',
          options: [
            'Make this more useful',
            'Turn into framework',
            'Draft something here',
            'Shape a solution'
          ]
        }
      case 'test-thinking':
        return {
          emoji: '🧪',
          options: [
            'Edge case scenario',
            'What could go wrong?',
            'Simulate it',
            'Real-world walk-through'
          ]
        }
      default:
        return {
          emoji: '📝',
          options: ['Option 1', 'Option 2', 'Option 3']
        }
    }
  }

  const nodeConfig = getNodeConfig()
  const { emoji, options } = nodeConfig

  const handleStyle = {
    width: '12px',
    height: '12px',
    background: '#d1d5db',
    border: '2px solid #fff',
    borderRadius: '50%',
    right: '-18px',
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
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
          lineHeight: 1.3,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>{emoji}</span>
          {data.label || 'Choose an option...'}
        </h3>
      </div>

      {/* Option Buttons */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleButtonClick(option, index)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: selectedButtons.has(index) ? '2px solid #ec4899' : '1px solid #e5e7eb',
              borderRadius: '8px',
              background: selectedButtons.has(index) ? '#fdf2f8' : '#ffffff',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 400,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            onMouseEnter={(e) => {
              if (!selectedButtons.has(index)) {
                e.target.style.background = '#f1f5f9'
                e.target.style.borderColor = '#cbd5e1'
                e.target.style.transform = 'translateY(-1px)'
                e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (!selectedButtons.has(index)) {
                e.target.style.background = '#ffffff'
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)'
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
          width: '12px',
          height: '12px',
          background: '#d1d5db',
          border: '2px solid #fff',
          borderRadius: '50%',
          left: '-18px',
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