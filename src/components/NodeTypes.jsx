import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'

// Base node component with shared functionality
const BaseNode = ({ data, onPopoverOpen, id, className, icon, title, placeholder, color }) => {
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
    <div className={`base-node ${className}`}>
      <div className="node-header">
        <span className="node-icon">{data.icon || icon}</span>
        <h3>{data.label || title}</h3>
        {/* Reference ID hidden from UI but available for backend access */}
      </div>
      <div className="node-input" onClick={(e) => e.stopPropagation()}>
        <textarea 
          ref={textareaRef}
          placeholder={placeholder}
          value={content}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
      </div>
      <Handle 
        ref={handleRef}
        type="source" 
        position={Position.Right} 
        style={handleStyle}
        className="custom-handle"
        onClick={handleClick}
      />
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

// Question Node - standardized emoji
export const QuestionNode = (props) => (
  <BaseNode 
    {...props}
    className="question-node"
    icon="❓"
    title="Question to Consider"
    placeholder="Ask a clarifying or thought-provoking question..."
    color="#84cc16"
  />
)

// Teach Node - standardized emoji
export const TeachNode = (props) => (
  <BaseNode 
    {...props}
    className="teach-node"
    icon="📚"
    title="Background Context"
    placeholder="Note what you'd want to understand better..."
    color="#3b82f6"
  />
)

// Rabbit Hole Node - standardized emoji
export const RabbitholeNode = (props) => (
  <BaseNode 
    {...props}
    className="rabbithole-node"
    icon="🌀"
    title="Expand This Topic"
    placeholder="Explore new angles, sub-questions, or adjacent thoughts..."
    color="#6366f1"
  />
)

// Summarize Node - standardized emoji
export const SummarizeNode = (props) => (
  <BaseNode 
    {...props}
    className="summarize-node"
    icon="📋"
    title="Key Takeaway"
    placeholder="What's the essence of this idea in your words?"
    color="#8b5cf6"
  />
)

// Ideate Node - standardized emoji
export const IdeateNode = (props) => (
  <BaseNode 
    {...props}
    className="ideate-node"
    icon="💡"
    title="New Idea"
    placeholder="Add an original idea, variation, or bold take..."
    color="#eab308"
  />
)

// Analyze Node - standardized emoji
export const AnalyzeNode = (props) => (
  <BaseNode 
    {...props}
    className="analyze-node"
    icon="🔍"
    title="Insight or Tension"
    placeholder="What stands out, confuses you, or creates friction here?"
    color="#06b6d4"
  />
)

// Custom Node - standardized emoji
export const CustomNode = (props) => (
  <BaseNode 
    {...props}
    className="custom-node"
    icon="⚙️"
    title="Open Prompt"
    placeholder="Frame your own challenge, thought, or pattern..."
    color="#6b7280"
  />
)

// Decision Node - for capturing decisions
export const DecisionNode = (props) => (
  <BaseNode 
    {...props}
    className="decision-node"
    icon="✅"
    title="Decision Made"
    placeholder="State your decision and the reasoning behind it..."
    color="#10b981"
  />
) 