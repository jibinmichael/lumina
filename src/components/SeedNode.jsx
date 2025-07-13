import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'

const SeedNode = ({ data, onPopoverOpen, id }) => {
  const textareaRef = useRef(null)
  const handleRef = useRef(null)
  const { getViewport } = useReactFlow()
  const [content, setContent] = useState(data.content || '')

  // Auto-resize function
  const autoResize = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.max(24, textarea.scrollHeight) + 'px'
    }
  }, [])

  // Handle text change
  const handleTextChange = useCallback((e) => {
    setContent(e.target.value)
    autoResize()
  }, [autoResize])

  // Handle blur (when clicking outside) - save content
  const handleBlur = useCallback((e) => {
    // Update the node data
    if (data) {
      data.content = content
    }
  }, [content, data])

  // Initial resize
  useEffect(() => {
    autoResize()
  }, [autoResize])

  // Handle click with smart positioning
  const handleClick = (e) => {
    e.stopPropagation()
    
    if (!handleRef.current || !onPopoverOpen) return

    // Get handle's screen coordinates
    const handleRect = handleRef.current.getBoundingClientRect()
    
    // Popover dimensions - updated for hierarchical menu
    const popoverWidth = 240
    const popoverHeight = 5 * 56 + 16 // 5 categories * 56px height + padding
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Calculate optimal position
    let popoverX = handleRect.right + 10 // Default: right of handle
    let popoverY = handleRect.top
    
    // Horizontal positioning logic
    if (popoverX + popoverWidth > viewportWidth - 20) {
      // Not enough space on right, try left
      popoverX = handleRect.left - popoverWidth - 10
      
      // If still not enough space on left, center horizontally
      if (popoverX < 20) {
        popoverX = Math.max(20, (viewportWidth - popoverWidth) / 2)
      }
    }
    
    // Vertical positioning logic
    // Try to center popover vertically relative to handle
    popoverY = handleRect.top + (handleRect.height / 2) - (popoverHeight / 2)
    
    // Ensure popover doesn't go above viewport
    if (popoverY < 20) {
      popoverY = 20
    }
    
    // Ensure popover doesn't go below viewport
    if (popoverY + popoverHeight > viewportHeight - 20) {
      popoverY = viewportHeight - popoverHeight - 20
    }
    
    // Final bounds check
    popoverX = Math.max(20, Math.min(popoverX, viewportWidth - popoverWidth - 20))
    popoverY = Math.max(20, Math.min(popoverY, viewportHeight - popoverHeight - 20))

    onPopoverOpen({ x: popoverX, y: popoverY }, id)
  }

  // Custom handle style
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
    <div className="seed-node">
      <div className="node-header">
        <h3>What's on your mind?</h3>
        {/* Hide reference ID from display but keep in data for backend access */}
        {/* {data.refId && (
          <span className="node-ref-id">{data.refId}</span>
        )} */}
      </div>
      <div className="node-input" onClick={(e) => e.stopPropagation()}>
        <textarea 
          ref={textareaRef}
          placeholder="Type your thoughts here..."
          value={content}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
      </div>
      {/* Only source handle (right side) - no target handle */}
      <Handle 
        ref={handleRef}
        type="source" 
        position={Position.Right} 
        style={handleStyle}
        className="custom-handle"
        onClick={handleClick}
      />
    </div>
  )
}

export default SeedNode 