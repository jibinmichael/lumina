import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import EditIcon from '@mui/icons-material/Edit'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'

const SeedNode = ({ data, onPopoverOpen, id }) => {
  const textareaRef = useRef(null)
  const handleRef = useRef(null)
  const { getViewport, getNodes, setNodes } = useReactFlow()
  const [content, setContent] = useState(data.content || '')

  // Simplified auto-resize function
  const autoResize = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to auto to get the actual scroll height
      textarea.style.height = 'auto'
      
      // Calculate the new height based on content
      const scrollHeight = textarea.scrollHeight
      const minHeight = 24 // Minimum height
      const maxHeight = 800 // Increased max height for better usability
      
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
    }, 2000) // Increased delay to avoid disrupting typing
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

  // Simplified input handler for resize
  const handleInput = useCallback((e) => {
    // Trigger resize on input for immediate feedback
    requestAnimationFrame(() => {
      autoResize()
    })
  }, [autoResize])

  // Handle keydown for better responsiveness
  const handleKeyDown = useCallback((e) => {
    // Allow normal typing behavior
  }, [])

  // Handle edit button click
  const handleEditClick = useCallback((e) => {
    e.stopPropagation()
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current)
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
    <div style={{ position: 'relative' }}>
      {/* Drag Handle - positioned above the node */}
      <div 
        style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          cursor: 'grab'
        }}
        onMouseDown={(e) => e.stopPropagation()}
        title="Drag to move node"
      >
        <DragIndicatorIcon sx={{ fontSize: '16px', color: '#9ca3af', transform: 'rotate(90deg)' }} />
      </div>
      
      <div className="seed-node">
      <div className="node-header">
        <h3>Start Here</h3>
        {/* Edit button */}
        <button
          onClick={handleEditClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginLeft: 0,
            color: '#b0b0b0',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
            fontSize: '12px'
          }}
          title="Edit content"
        >
          <EditIcon sx={{ fontSize: '14px' }} />
        </button>
        {/* Hide reference ID from display but keep in data for backend access */}
        {/* {data.refId && (
          <span className="node-ref-id">{data.refId}</span>
        )} */}
      </div>
      <div className="node-input">
        <textarea 
          ref={textareaRef}
          placeholder="Capture a single thought, idea, or question..."
          value={content}
          onChange={handleTextChange}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#374151',
            minHeight: '24px',
            maxHeight: '800px',
            overflowY: 'hidden',
            background: 'transparent',
            padding: '4px 0',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            cursor: 'text',
            pointerEvents: 'auto'
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
    </div>
  )
}

export default SeedNode 