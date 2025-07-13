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
        { id: 'quick-question', label: 'Quick Question…', nodeType: 'question', emoji: '❓' },
        { id: 'different-angles', label: 'See Different Angles', nodeType: 'analyze', emoji: '🔄' },
        { id: 'perspective-shift', label: 'Perspective Shift', nodeType: 'custom', emoji: '👁️' },
        { id: 'similar-stuff', label: 'Similar Stuff', nodeType: 'teach', emoji: '🔗' }
      ]
    },
    {
      id: 'expand',
      icon: '💡',
      title: 'Expand with Creativity',
      items: [
        { id: 'fresh-ideas', label: 'Find Fresh Ideas', nodeType: 'ideate', emoji: '🌟' },
        { id: 'do-opposite', label: 'Do the Opposite', nodeType: 'custom', emoji: '🔄' },
        { id: 'ideate', label: 'Ideate!', nodeType: 'ideate', emoji: '💫' },
        { id: 'give-me', label: 'Give Me…', nodeType: 'custom', emoji: '🎁' }
      ]
    },
    {
      id: 'clarify',
      icon: '🎯',
      title: 'Clarify the Problem',
      items: [
        { id: 'what-problem', label: 'What Problem is This Solving?', nodeType: 'question', emoji: '🤔' },
        { id: 'define-problem', label: 'Define the Problem', nodeType: 'analyze', emoji: '📝' },
        { id: 'key-insights', label: 'See Key Insights Here', nodeType: 'analyze', emoji: '🔍' },
        { id: 'summarize', label: 'Summarize', nodeType: 'summarize', emoji: '📋' }
      ]
    },
    {
      id: 'test',
      icon: '🧪',
      title: 'Test Your Thinking',
      items: [
        { id: 'try-out', label: 'Try It Out', nodeType: 'custom', emoji: '🧪' },
        { id: 'pros-cons', label: 'Pros & Cons', nodeType: 'analyze', emoji: '⚖️' },
        { id: 'rewrite', label: 'Rewrite This…', nodeType: 'custom', emoji: '✏️' },
        { id: 'turn-into', label: 'Turn This Into A…', nodeType: 'custom', emoji: '🔄' }
      ]
    },
    {
      id: 'build',
      icon: '✍️',
      title: 'Build Toward a Solution',
      items: [
        { id: 'lumina-draft', label: 'Add to Lumina Draft', nodeType: 'custom', emoji: '📝' },
        { id: 'code-up', label: 'Code This Up', nodeType: 'custom', emoji: '💻' },
        { id: 'my-idea', label: 'Add My Own Idea', nodeType: 'ideate', emoji: '🧠' }
      ]
    }
  ]

  // Get sections to display
  const sectionsToShow = showAllSections ? menuStructure : menuStructure.slice(0, 2)

  // Handle item selection
  const handleItemSelect = (item, event) => {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    
    const nodeTypeMap = {
      question: { id: 'question', label: item.label, icon: item.emoji, color: '#84cc16' },
      teach: { id: 'teach', label: item.label, icon: item.emoji, color: '#3b82f6' },
      rabbithole: { id: 'rabbithole', label: item.label, icon: item.emoji, color: '#6366f1' },
      summarize: { id: 'summarize', label: item.label, icon: item.emoji, color: '#8b5cf6' },
      ideate: { id: 'ideate', label: item.label, icon: item.emoji, color: '#eab308' },
      analyze: { id: 'analyze', label: item.label, icon: item.emoji, color: '#06b6d4' },
      custom: { id: 'custom', label: item.label, icon: item.emoji, color: '#6b7280' }
    }
    
    console.log('Item clicked:', item.label, 'NodeType:', item.nodeType)
    
    // Make sure we're using the correct nodeType
    const selectedNodeType = nodeTypeMap[item.nodeType]
    if (!selectedNodeType) {
      console.error('Unknown node type:', item.nodeType)
      return
    }
    
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
          {section.items.map((item) => (
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
                {item.emoji}
              </span>
              <span style={{ flex: 1, color: '#374151' }}>
                {item.label}
              </span>
            </div>
          ))}
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