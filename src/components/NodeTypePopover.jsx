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
        { id: 'quick-question', label: 'Quick Question', nodeType: 'question' },
        { id: 'different-angles', label: 'See Different Angles', nodeType: 'analyze' },
        { id: 'perspective-shift', label: 'Perspective Shift', nodeType: 'custom' },
        { id: 'similar-stuff', label: 'Find Similar Ideas', nodeType: 'teach' }
      ]
    },
    {
      id: 'expand',
      icon: '💡',
      title: 'Expand with Creativity',
      items: [
        { id: 'fresh-ideas', label: 'Find Fresh Ideas', nodeType: 'ideate' },
        { id: 'do-opposite', label: 'Do the Opposite', nodeType: 'custom' },
        { id: 'brainstorm', label: 'Brainstorm More', nodeType: 'ideate' },
        { id: 'explore-deeper', label: 'Explore Deeper', nodeType: 'rabbithole' }
      ]
    },
    {
      id: 'clarify',
      icon: '🎯',
      title: 'Clarify the Problem',
      items: [
        { id: 'what-problem', label: 'What Problem Does This Solve?', nodeType: 'question' },
        { id: 'define-problem', label: 'Define the Problem', nodeType: 'analyze' },
        { id: 'key-insights', label: 'Find Key Insights', nodeType: 'analyze' },
        { id: 'summarize', label: 'Summarize This', nodeType: 'summarize' }
      ]
    },
    {
      id: 'test',
      icon: '🧪',
      title: 'Test Your Thinking',
      items: [
        { id: 'try-out', label: 'Try It Out', nodeType: 'custom' },
        { id: 'pros-cons', label: 'List Pros & Cons', nodeType: 'analyze' },
        { id: 'rewrite', label: 'Rewrite This', nodeType: 'custom' },
        { id: 'alternative', label: 'Find an Alternative', nodeType: 'ideate' }
      ]
    },
    {
      id: 'build',
      icon: '✍️',
      title: 'Build Toward a Solution',
      items: [
        { id: 'draft-solution', label: 'Draft a Solution', nodeType: 'custom' },
        { id: 'action-steps', label: 'Create Action Steps', nodeType: 'analyze' },
        { id: 'my-idea', label: 'Add My Own Idea', nodeType: 'ideate' }
      ]
    }
  ]

  // Standard node type definitions with consistent emojis
  const nodeTypeDefinitions = {
    question: { id: 'question', label: 'Quick Question', icon: '❓', color: '#84cc16' },
    teach: { id: 'teach', label: 'Learn About', icon: '📚', color: '#3b82f6' },
    rabbithole: { id: 'rabbithole', label: 'Explore Deeper', icon: '🌀', color: '#6366f1' },
    summarize: { id: 'summarize', label: 'Summarize', icon: '📋', color: '#8b5cf6' },
    ideate: { id: 'ideate', label: 'Brainstorm', icon: '💡', color: '#eab308' },
    analyze: { id: 'analyze', label: 'Analyze', icon: '🔍', color: '#06b6d4' },
    custom: { id: 'custom', label: 'Custom', icon: '⚙️', color: '#6b7280' }
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
    
    // Create node type with custom label but standard icon
    const selectedNodeType = {
      ...baseNodeType,
      label: item.label // Use the specific label from the menu item
    }
    
    console.log('Creating node:', selectedNodeType.label, 'Type:', selectedNodeType.id)
    
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
                  marginRight: '4px'
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
            marginTop: '6px',
            borderTop: '1px solid #f3f4f6'
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