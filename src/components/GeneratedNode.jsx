import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'

const GeneratedNode = ({ data, onPopoverOpen, id }) => {
  const textareaRef = useRef(null)
  const handleRef = useRef(null)
  const { getViewport, getNodes, setNodes } = useReactFlow()
  const [content, setContent] = useState(data.content || '')

  // Lightweight auto-resize function with micro-debounce
  const resizeTimeoutRef = useRef(null)
  
  const autoResize = useCallback(() => {
    // Clear any pending resize to avoid excessive calls
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current)
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      const textarea = textareaRef.current
      if (textarea) {
        // Reset height to auto to get the actual scroll height
        textarea.style.height = 'auto'
        
        // Calculate the new height based on content
        const scrollHeight = textarea.scrollHeight
        const minHeight = 24 // Minimum height
        const maxHeight = 400 // Maximum height before showing scroll
        
        // Set the height to fit content, within min/max bounds
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
        textarea.style.height = newHeight + 'px'
        
        // If content exceeds max height, enable scrolling
        if (scrollHeight > maxHeight) {
          textarea.style.overflowY = 'auto'
        } else {
          textarea.style.overflowY = 'hidden'
        }
      }
    }, 10) // Very short delay to batch resize calls
  }, [])

  // Lightweight update for seamless typing
  const debouncedSaveRef = useRef(null)
  
  // Handle text change with immediate updates and minimal interference
  const handleTextChange = useCallback((e) => {
    const newContent = e.target.value
    setContent(newContent)
    
    // Update data immediately for instant access (no React Flow re-render)
    if (data) {
      data.content = newContent
    }
    
    // Auto-resize immediately for smooth experience
    autoResize()
    
    // Debounce the React Flow state update to avoid disrupting typing
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current)
    }
    
    debouncedSaveRef.current = setTimeout(() => {
      const nodes = getNodes()
      const updatedNodes = nodes.map(node => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              content: newContent
            }
          }
        }
        return node
      })
      setNodes(updatedNodes)
    }, 1000) // Longer delay to avoid disrupting typing
  }, [autoResize, id, getNodes, setNodes, data])

  // Handle blur (when clicking outside) - ensure data is saved immediately
  const handleBlur = useCallback((e) => {
    // Clear any pending debounced save
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current)
      debouncedSaveRef.current = null
    }
    
    // Ensure the node data is updated immediately
    if (data) {
      data.content = content
    }
    
    // Force immediate React Flow state update on blur
    const nodes = getNodes()
    const updatedNodes = nodes.map(node => {
      if (node.id === id) {
        return {
          ...node,
          data: {
            ...node.data,
            content: content
          }
        }
      }
      return node
    })
    setNodes(updatedNodes)
  }, [content, data, id, getNodes, setNodes])

  // Simplified input handler - no longer needed since we handle resize in onChange
  const handleInput = useCallback((e) => {
    // Minimal resize check only if needed
    autoResize()
  }, [autoResize])

  // Remove keydown handler - onChange handles all resize needs
  const handleKeyDown = useCallback((e) => {
    // No resize handling - let onChange handle everything for seamless typing
  }, [])

  // Initial resize and resize on content changes
  useEffect(() => {
    autoResize()
  }, [autoResize, content])

  // Resize on window resize
  useEffect(() => {
    const handleWindowResize = () => {
      autoResize()
    }
    
    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [autoResize])

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current)
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [])

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
          onInput={handleInput}
          onKeyDown={handleKeyDown}
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
            overflowY: 'hidden',
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