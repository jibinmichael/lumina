import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'

const GeneratedNode = ({ data, onPopoverOpen, id }) => {
  const textareaRef = useRef(null)
  const handleRef = useRef(null)
  const { getViewport } = useReactFlow()
  const [content, setContent] = useState(data.content || '')

  // Auto-resize function (same as seed node)
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

  // Handle popover click with smart positioning (same as seed node)
  const handleClick = (e) => {
    e.stopPropagation()
    
    if (!handleRef.current || !onPopoverOpen) return

    // Get handle's screen coordinates
    const handleRect = handleRef.current.getBoundingClientRect()
    
    // Popover dimensions
    const popoverWidth = 240
    const popoverHeight = 5 * 56 + 16
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Calculate optimal position
    let popoverX = handleRect.right + 10
    let popoverY = handleRect.top
    
    // Horizontal positioning logic
    if (popoverX + popoverWidth > viewportWidth - 20) {
      popoverX = handleRect.left - popoverWidth - 10
      
      if (popoverX < 20) {
        popoverX = Math.max(20, (viewportWidth - popoverWidth) / 2)
      }
    }
    
    // Vertical positioning logic
    popoverY = handleRect.top + (handleRect.height / 2) - (popoverHeight / 2)
    
    if (popoverY < 20) {
      popoverY = 20
    }
    
    if (popoverY + popoverHeight > viewportHeight - 20) {
      popoverY = viewportHeight - popoverHeight - 20
    }
    
    // Final bounds check
    popoverX = Math.max(20, Math.min(popoverX, viewportWidth - popoverWidth - 20))
    popoverY = Math.max(20, Math.min(popoverY, viewportHeight - popoverHeight - 20))

    onPopoverOpen({ x: popoverX, y: popoverY }, id)
  }

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
    <div className="generated-node" style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px',
      minWidth: '200px',
      maxWidth: '300px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}>
      {/* Heading */}
      <div style={{
        marginBottom: '12px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
          lineHeight: 1.3
        }}>
          {data.heading || data.label || 'Generated Node'}
        </h3>
      </div>

      {/* Input Area */}
      <div className="node-input" onClick={(e) => e.stopPropagation()}>
        <textarea 
          ref={textareaRef}
          placeholder={data.placeholder || "Write your thought or insight here..."}
          value={content}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '13px',
            lineHeight: 1.4,
            color: '#374151',
            background: 'transparent',
            minHeight: '24px',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Source handle for creating more connections */}
      <Handle 
        ref={handleRef}
        type="source" 
        position={Position.Right} 
        style={handleStyle}
        className="custom-handle"
        onClick={handleClick}
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

export default GeneratedNode 