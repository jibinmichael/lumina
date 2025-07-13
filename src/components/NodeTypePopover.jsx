import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const NodeTypePopover = ({ position, onSelect, onClose, sourceNodeId }) => {
  const [showAllSections, setShowAllSections] = useState(false)
  const popoverRef = useRef(null)
  
  const menuStructure = [
    {
      id: 'explore',
      icon: '🔍',
      title: 'Explore the Idea',
      items: [
        { id: 'quick-question', label: 'Question to Consider', nodeType: 'question', behaviorType: '1-to-1' },
        { id: 'different-angles', label: 'See Different Angles', nodeType: 'multi-option', behaviorType: '1-to-many', multiType: 'see-different-angles' },
        { id: 'perspective-shift', label: 'Perspective Shift', nodeType: 'custom', behaviorType: '1-to-1' },
        { id: 'similar-stuff', label: 'Find Similar Ideas', nodeType: 'multi-option', behaviorType: '1-to-many', multiType: 'similar-stuff' }
      ]
    },
    {
      id: 'expand',
      icon: '💡',
      title: 'Expand with Creativity',
      items: [
        { id: 'fresh-ideas', label: 'Find Fresh Ideas', nodeType: 'ideate', behaviorType: '1-to-1' },
        { id: 'do-opposite', label: 'Do the Opposite', nodeType: 'custom', behaviorType: '1-to-1' },
        { id: 'brainstorm', label: 'Generate Variations', nodeType: 'multi-option', behaviorType: '1-to-many', multiType: 'ideate' },
        { id: 'explore-deeper', label: 'Explore Further', nodeType: 'multi-option', behaviorType: '1-to-many', multiType: 'rabbit-hole' }
      ]
    },
    {
      id: 'clarify',
      icon: '🎯',
      title: 'Clarify the Problem',
      items: [
        { id: 'what-problem', label: 'What Problem Does This Solve?', nodeType: 'question', behaviorType: '1-to-1' },
        { id: 'define-problem', label: 'Define the Problem', nodeType: 'analyze', behaviorType: '1-to-1' },
        { id: 'key-insights', label: 'Extract Key Insights', nodeType: 'multi-option', behaviorType: '1-to-many', multiType: 'key-insights' },
        { id: 'summarize', label: 'Key Takeaway', nodeType: 'summarize', behaviorType: '1-to-1' }
      ]
    },
    {
      id: 'test',
      icon: '🧪',
      title: 'Test Your Thinking',
      items: [
        { id: 'try-out', label: 'Try It Out', nodeType: 'custom', behaviorType: '1-to-1' },
        { id: 'pros-cons', label: 'List Pros & Cons', nodeType: 'multi-option', behaviorType: '1-to-many', multiType: 'pros-cons' },
        { id: 'rewrite', label: 'Rewrite This', nodeType: 'custom', behaviorType: '1-to-1' },
        { id: 'alternative', label: 'Find an Alternative', nodeType: 'ideate', behaviorType: '1-to-1' }
      ]
    },
    {
      id: 'build',
      icon: '✍️',
      title: 'Build Toward a Solution',
      items: [
        { id: 'draft-solution', label: 'Draft a Solution', nodeType: 'custom', behaviorType: '1-to-1' },
        { id: 'action-steps', label: 'Create Action Steps', nodeType: 'analyze', behaviorType: '1-to-1' },
        { id: 'decision-made', label: 'Decision Made', nodeType: 'decision', behaviorType: '1-to-1' },
        { id: 'my-idea', label: 'Add My Own Idea', nodeType: 'ideate', behaviorType: '1-to-1' }
      ]
    }
  ]

  // Standard node type definitions with consistent emojis
  const nodeTypeDefinitions = {
    question: { id: 'question', label: 'Question to Consider', icon: '❓', color: '#84cc16' },
    teach: { id: 'teach', label: 'Background Context', icon: '📚', color: '#3b82f6' },
    rabbithole: { id: 'rabbithole', label: 'Expand This Topic', icon: '🌀', color: '#6366f1' },
    summarize: { id: 'summarize', label: 'Key Takeaway', icon: '📋', color: '#8b5cf6' },
    ideate: { id: 'ideate', label: 'New Idea', icon: '💡', color: '#eab308' },
    analyze: { id: 'analyze', label: 'Insight or Tension', icon: '🔍', color: '#06b6d4' },
    custom: { id: 'custom', label: 'Open Prompt', icon: '⚙️', color: '#6b7280' },
    decision: { id: 'decision', label: 'Decision Made', icon: '✅', color: '#10b981' },
    'multi-option': { id: 'multi-option', label: 'Multi Option', icon: '🎯', color: '#8b5cf6' }
  }

  // Get sections to display
  const sectionsToShow = showAllSections ? menuStructure : menuStructure.slice(0, 2)

  // Handle item selection
  const handleItemSelect = (item, event) => {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    
    const baseNodeType = nodeTypeDefinitions[item.nodeType]
    if (!baseNodeType) {
      console.error('Unknown node type:', item.nodeType)
      return
    }
    
    // Create node type with behavior information
    const selectedNodeType = {
      ...baseNodeType,
      label: item.label,
      behaviorType: item.behaviorType,
      multiType: item.multiType // For multi-option nodes
    }
    
    console.log('Creating node:', selectedNodeType.label, 'Type:', selectedNodeType.id, 'Behavior:', selectedNodeType.behaviorType)
    
    setTimeout(() => {
      onSelect(selectedNodeType)
      onClose()
    }, 0)
  }

  // Handle load more
  const handleLoadMore = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setShowAllSections(true)
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return createPortal(
    <div 
      ref={popoverRef}
      className="node-type-popover" 
      style={{ 
        left: position.x, 
        top: position.y,
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {sectionsToShow.map((section) => (
        <div key={section.id} style={{ marginBottom: '10px' }}>
          {/* Section Heading */}
          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            fontWeight: '400',
            padding: '4px 12px 2px 12px',
            letterSpacing: '0.3px'
          }}>
            {section.title}
          </div>
          
          {/* Section Items */}
          {section.items.map((item) => {
            const nodeTypeDef = nodeTypeDefinitions[item.nodeType]
            const isMultiOption = item.behaviorType === '1-to-many'
            
            return (
              <div 
                key={item.id}
                className="popover-item"
                onClick={(e) => handleItemSelect(item, e)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px 6px 8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '13px',
                  transition: 'background-color 0.1s ease',
                  color: '#374151',
                  userSelect: 'none',
                  marginLeft: '4px',
                  marginRight: '4px',
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '14px', marginRight: '8px' }}>
                  {nodeTypeDef?.icon || '⚙️'}
                </span>
                <span style={{ flex: 1, color: '#374151' }}>
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>
      ))}
      
      {/* Load More Button */}
      {!showAllSections && (
        <div 
          className="load-more-button"
          onClick={handleLoadMore}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '13px',
            transition: 'background-color 0.1s ease',
            color: '#6b7280',
            userSelect: 'none',
            marginTop: '6px'
          }}
        >
          Load more options...
        </div>
      )}
    </div>,
    document.body
  )
}

export default NodeTypePopover 