import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'

const SeedNode = ({ data, onPopoverOpen, id }) => {
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
    <div className="seed-node">
      <div className="node-header">
        <h3>Start Here</h3>
        {/* Hide reference ID from display but keep in data for backend access */}
        {/* {data.refId && (
          <span className="node-ref-id">{data.refId}</span>
        )} */}
      </div>
      <div className="node-input" onClick={(e) => e.stopPropagation()}>
        <textarea 
          ref={textareaRef}
          placeholder="Capture a single thought, idea, or question..."
          value={content}
          onChange={handleTextChange}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: '13px',
            lineHeight: '1.4',
            color: '#374151',
            minHeight: '24px',
            overflowY: 'hidden',
            background: 'transparent',
            padding: '4px 0'
          }}
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