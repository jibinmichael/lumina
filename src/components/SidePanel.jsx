import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  TextField,
  Button,
  CircularProgress,
  Alert
} from '@mui/material'
import { 
  MenuOpen,
  Share,
  Refresh
} from '@mui/icons-material'
import { boardStore } from '../stores/boardStore'
import synthesisStore from '../stores/synthesisStore.js'
import aiService from '../services/aiService.js'

// Helper to render synthesis content with clickable node IDs
const renderSynthesisContentWithLinks = (content, scrollToNodeByRefId) => {
  if (!content) return null
  // Regex to match node IDs like N001, N002, etc.
  const nodeIdRegex = /N\d{3}/g
  const parts = []
  let lastIndex = 0
  let match
  let key = 0
  while ((match = nodeIdRegex.exec(content)) !== null) {
    const { index } = match
    if (index > lastIndex) {
      parts.push(content.slice(lastIndex, index))
    }
    const refId = match[0]
    parts.push(
      <span
        key={`node-link-${key++}`}
        onClick={() => scrollToNodeByRefId?.(refId)}
        style={{
          color: '#8b5cf6',
          cursor: 'pointer',
          textDecoration: 'underline',
          fontWeight: 600,
          transition: 'color 0.2s',
        }}
        onMouseOver={e => (e.currentTarget.style.color = '#6d28d9')}
        onMouseOut={e => (e.currentTarget.style.color = '#8b5cf6')}
      >
        {refId}
      </span>
    )
    lastIndex = index + refId.length
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }
  return parts
}

// Helper to render synthesis content as separate items with per-line citations
const renderSynthesisItemsWithCitations = (content, scrollToNodeByRefId) => {
  if (!content) return null
  const lines = content.split(/\n+/).filter(line => line.trim())
  const nodeIdRegex = /N\d{3}/g
  return lines.map((line, idx) => {
    const isHeading = /^###\s+/.test(line)
    const nodeIds = [...line.matchAll(nodeIdRegex)].map(match => match[0])
    let displayLine = line.replace(nodeIdRegex, '').replace(/\(\s*\)/g, '').trim()
    if (isHeading) displayLine = displayLine.replace(/^###\s+/, '')
    return (
      <div
        key={idx}
        style={{
          display: 'flex',
          alignItems: isHeading ? 'flex-end' : 'baseline',
          marginBottom: isHeading ? 10 : 6,
          marginTop: isHeading ? 22 : 0,
        }}
      >
        <span
          style={{
            fontSize: isHeading ? '15.5px' : '14px',
            color: isHeading ? '#1f2937' : '#374151',
            fontWeight: isHeading ? 700 : 400,
            letterSpacing: isHeading ? '0.01em' : undefined,
            flex: 1,
          }}
        >
          {displayLine}
          {nodeIds.length > 0 && !isHeading && (
            <span style={{ marginLeft: 6, display: 'inline-flex', gap: 4 }}>
              {nodeIds.map((refId, i) => (
                <span
                  key={refId + i}
                  onClick={() => scrollToNodeByRefId?.(refId)}
                  style={{
                    color: '#b5b5c3',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 300,
                    textDecoration: 'underline',
                    marginLeft: i > 0 ? 4 : 0,
                    userSelect: 'none',
                  }}
                  onMouseOver={e => (e.currentTarget.style.color = '#8b5cf6')}
                  onMouseOut={e => (e.currentTarget.style.color = '#b5b5c3')}
                >
                  {refId}
                </span>
              ))}
            </span>
          )}
        </span>
      </div>
    )
  })
}

// Helper to narratively group synthesis items
const renderNarrativeSynthesis = (nodes, content, scrollToNodeByRefId) => {
  if (!content) return null
  // Classify nodes
  const seed = nodes.find(n => n.type === 'seed' && n.data?.content?.trim())
  const questions = nodes.filter(n => n.type === 'question' && n.data?.content?.trim())
  const ideas = nodes.filter(n => n.type !== 'seed' && n.type !== 'question' && n.data?.content?.trim())

  // Parse lines from synthesis
  const lines = content.split(/\n+/).filter(line => line.trim())
  const nodeIdRegex = /N\d{3}/g

  // Helper to render a line with citation
  const renderLine = (line, idx) => {
    const nodeIds = [...line.matchAll(nodeIdRegex)].map(match => match[0])
    let displayLine = line.replace(nodeIdRegex, '').replace(/\(\s*\)/g, '').trim()
    return (
      <div key={idx} style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: '14px', color: '#374151', fontWeight: 400, flex: 1 }}>
          {displayLine}
        </span>
        {nodeIds.length > 0 && (
          <span style={{ marginLeft: 8, display: 'flex', gap: 4 }}>
            {nodeIds.map((refId, i) => (
              <span
                key={refId + i}
                onClick={() => scrollToNodeByRefId?.(refId)}
                style={{
                  color: '#b5b5c3',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 300,
                  textDecoration: 'underline',
                  marginLeft: i > 0 ? 4 : 0,
                  userSelect: 'none',
                }}
                onMouseOver={e => (e.currentTarget.style.color = '#8b5cf6')}
                onMouseOut={e => (e.currentTarget.style.color = '#b5b5c3')}
              >
                {refId}
              </span>
            ))}
          </span>
        )}
      </div>
    )
  }

  let idx = 0
  return (
    <>
      {/* Where we started */}
      {seed && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, color: '#8b5cf6', fontSize: '13px', marginBottom: 2 }}>Where we started</div>
          {renderLine(seed.data.content + (seed.data.refId ? ` (${seed.data.refId})` : ''), idx++)}
        </div>
      )}
      {/* Key questions addressed */}
      {questions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, color: '#8b5cf6', fontSize: '13px', marginBottom: 2 }}>Key questions addressed</div>
          {questions.map(q => renderLine(q.data.content + (q.data.refId ? ` (${q.data.refId})` : ''), idx++))}
        </div>
      )}
      {/* Key ideas/insights */}
      {ideas.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, color: '#8b5cf6', fontSize: '13px', marginBottom: 2 }}>Key ideas & insights</div>
          {ideas.map(i => renderLine(i.data.content + (i.data.refId ? ` (${i.data.refId})` : ''), idx++))}
        </div>
      )}
      {/* Any remaining lines from synthesis not matched above */}
      {lines.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {lines.map((line, i) => renderLine(line, idx++))}
        </div>
      )}
    </>
  )
}

// Remove classifyNodes, CitationLink, CurvedThreadLine, and renderHierarchicalSynthesis
// Restore original renderSynthesisContent to show the summary as a single block with clickable node IDs

const SidePanel = ({ isOpen, onClose, activeBoard, onBoardUpdate, nodes, scrollToNodeByRefId }) => {
  const [timeAgo, setTimeAgo] = useState('')
  const [lastModified, setLastModified] = useState(new Date())
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editableTitle, setEditableTitle] = useState('')
  const [synthesis, setSynthesis] = useState({ content: '', status: 'idle', error: null })
  const [animationPosition, setAnimationPosition] = useState(0)

  // Capitalize first letter function
  const capitalizeFirstLetter = (str) => {
    if (!str) return 'Untitled'
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Always load the latest synthesis from storage when activeBoard changes
  useEffect(() => {
    const boardTitle = activeBoard?.name || 'Untitled'
    setEditableTitle(boardTitle)

    if (activeBoard?.id) {
      synthesisStore.loadSynthesis(activeBoard.id)
      const currentSynthesis = synthesisStore.getSynthesis(activeBoard.id)
      setSynthesis(currentSynthesis)
    }
  }, [activeBoard])

  // Listen for storage events (cross-tab sync)
  useEffect(() => {
    if (!activeBoard?.id) return
    const storageKey = `lumina_synthesis_${activeBoard.id}`
    const handleStorage = (e) => {
      if (e.key === storageKey) {
        synthesisStore.loadSynthesis(activeBoard.id)
        const currentSynthesis = synthesisStore.getSynthesis(activeBoard.id)
        setSynthesis(currentSynthesis)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [activeBoard])

  // Subscribe to synthesis updates
  useEffect(() => {
    const unsubscribe = synthesisStore.addListener((event) => {
      if (event.boardId === activeBoard?.id || event.event === 'enabledChanged') {
        const currentSynthesis = synthesisStore.getSynthesis(activeBoard?.id)
        setSynthesis(currentSynthesis)
      }
    })

    return unsubscribe
  }, [activeBoard])

  // Update time ago
  useEffect(() => {
    const updateTimeAgo = () => {
      if (activeBoard?.lastModified) {
        const now = new Date()
        const lastModified = new Date(activeBoard.lastModified)
        const diffInSeconds = Math.floor((now - lastModified) / 1000)
        
        if (diffInSeconds < 10) {
          setTimeAgo('just now')
        } else if (diffInSeconds < 60) {
          setTimeAgo('few seconds ago')
        } else if (diffInSeconds < 3600) {
          const minutes = Math.floor(diffInSeconds / 60)
          setTimeAgo(`updated ${minutes} minute${minutes > 1 ? 's' : ''} ago`)
        } else if (diffInSeconds < 86400) {
          const hours = Math.floor(diffInSeconds / 3600)
          setTimeAgo(`updated ${hours} hour${hours > 1 ? 's' : ''} ago`)
        } else {
          const days = Math.floor(diffInSeconds / 86400)
          setTimeAgo(`updated ${days} day${days > 1 ? 's' : ''} ago`)
        }
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 1000) // Update every second

    return () => clearInterval(interval)
  }, [activeBoard])

  // Animated gradient effect
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPosition(prev => (prev + 1) % 100)
    }, 50) // Update every 50ms for smooth animation

    return () => clearInterval(interval)
  }, [])

  const handleTitleClick = () => {
    setIsEditingTitle(true)
  }

  const handleTitleSave = () => {
    const trimmedTitle = editableTitle.trim()
    const finalTitle = trimmedTitle || 'Untitled'
    
    if (finalTitle !== activeBoard?.name) {
      const capitalizedTitle = capitalizeFirstLetter(finalTitle)
      const result = boardStore.renameBoard(activeBoard.id, capitalizedTitle)
      if (result.success) {
        setEditableTitle(capitalizedTitle)
        onBoardUpdate?.()
      }
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setEditableTitle(activeBoard?.name || 'Untitled')
      setIsEditingTitle(false)
    }
  }

  const handleShare = () => {
    console.log('Share functionality')
  }

  const handleRefresh = () => {
    if (activeBoard?.id && nodes) {
      synthesisStore.refreshSynthesis(activeBoard.id, nodes)
    }
  }

  // Render synthesis content based on status
  const renderSynthesisContent = () => {
    if (!aiService.hasApiKey() || (!synthesis.content && !synthesis.error && synthesis.status !== 'processing')) {
      // Show nothing if no API key or no synthesis content/error/processing
      return null
    }

    if (synthesis.error) {
      return (
        <Box sx={{ px: 1.5, py: 2 }}>
          <Alert 
            severity="error" 
            sx={{ 
              fontSize: '13px',
              '& .MuiAlert-message': { fontSize: '13px' }
            }}
          >
            {synthesis.error}
          </Alert>
        </Box>
      )
    }

    if (synthesis.content) {
      return (
        <Box sx={{ px: 0, py: 0, flex: 1, overflowY: 'auto', width: '100%' }}>
          <div style={{ padding: '16px 0 0 0', width: '100%' }}>
            {renderSynthesisItemsWithCitations(synthesis.content, scrollToNodeByRefId)}
          </div>
        </Box>
      )
    }

    return null
  }

  // Render animated status text
  const renderAnimatedStatus = () => {
    const hasContent = nodes && nodes.filter(n => n.data?.content?.trim()).length >= 2
    const isProcessing = synthesis.status === 'processing'
    
    if (!aiService.hasApiKey()) {
      return (
        <Box sx={{ px: 0, pt: 2, pb: 1 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#9ca3af',
              fontSize: '13px',
              fontWeight: 400,
              pl: 0, // Ensure no extra left padding
            }}
          >
            waiting for you to fill in your ideas
          </Typography>
        </Box>
      )
    }

    if (!hasContent) {
      return (
        <Box sx={{ px: 0, pt: 2, pb: 1 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#9ca3af',
              fontSize: '13px',
              fontWeight: 400,
              pl: 0, // Ensure no extra left padding
            }}
          >
            waiting for you to fill in your ideas
          </Typography>
        </Box>
      )
    }

    if (isProcessing) {
      return (
        <Box sx={{ px: 1.5, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1, position: 'relative', overflow: 'visible' }}>
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={12} sx={{ color: '#8b5cf6', mr: 1, zIndex: 2 }} thickness={5} />
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '13px',
                fontWeight: 400,
                color: '#8b5cf6',
                position: 'relative',
                zIndex: 2,
                background: 'none',
                display: 'inline-block',
                '& span.shimmer': {
                  animation: 'shimmerText 1.5s infinite',
                  color: '#8b5cf6',
                  display: 'inline-block',
                }
              }}
            >
              <span className="shimmer">synthesising your ideas</span>
            </Typography>
          </Box>
        </Box>
      )
    }

    return null
  }

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: 500,
          height: '100vh',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          zIndex: 1000,
          boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
          px: 1.5, // 12px left and right padding for the sidebar
        }}
      >
        {/* Header - matches canvas header exactly */}
        <Box
          sx={{
            position: 'relative',
            height: 40,
            bgcolor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5, // 12px left and right padding for header
            py: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Close panel" placement="bottom">
              <IconButton
                onClick={onClose}
                size="small"
                sx={{
                  ml: -0.75, // Negative margin to align with body content
                  color: '#6b7280',
                  '&:hover': {
                    bgcolor: 'transparent',
                    color: '#374151',
                  },
                }}
              >
                <MenuOpen sx={{ fontSize: 16, transform: 'scaleX(-1)' }} />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {synthesis.content && (
              <Tooltip title="Refresh synthesis" placement="bottom">
                <IconButton
                  onClick={handleRefresh}
                  size="small"
                  disabled={synthesis.status === 'processing'}
                  sx={{
                    color: '#6b7280',
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: '#374151',
                    },
                  }}
                >
                  <Refresh sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Share" placement="bottom">
              <Button
                onClick={handleShare}
                size="small"
                sx={{
                  color: '#6b7280',
                  fontSize: '13px',
                  fontWeight: 400,
                  textTransform: 'none',
                  minWidth: 'auto',
                  padding: '4px 8px',
                  '&:hover': {
                    bgcolor: 'transparent',
                    color: '#374151',
                  },
                }}
              >
                Share
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* Main Content Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', px: 1.5 }}>
          {/* Title section with consistent padding */}
          <Box sx={{ px: 0, pt: 2.5, pb: 0.5, maxWidth: '100%' }}>
            {isEditingTitle ? (
              <TextField
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                onFocus={(e) => e.target.select()}
                placeholder="Untitled"
                autoFocus
                variant="standard"
                size="small"
                fullWidth
                sx={{
                  '& .MuiInput-root': {
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#333333',
                    '&:before': { borderBottom: 'none' },
                    '&:after': { borderBottom: 'none' },
                    '&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
                  },
                  '& .MuiInput-input': {
                    padding: '0',
                    fontSize: '18px',
                    fontWeight: 600,
                  },
                }}
              />
            ) : (
              <Tooltip title="Click to edit title" placement="bottom">
                <Typography
                  variant="h6"
                  onClick={handleTitleClick}
                  sx={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: (activeBoard?.name && activeBoard.name !== 'Untitled') ? '#333333' : '#999999',
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.8,
                    },
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                    display: 'block',
                  }}
                >
                  {activeBoard?.name || 'Untitled'}
                </Typography>
              </Tooltip>
            )}
          </Box>

          {/* Timestamp - close to heading */}
          <Box sx={{ px: 0, pb: 2.5 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#999999',
                fontSize: '13px',
                fontWeight: 400,
              }}
            >
              {timeAgo}
            </Typography>
          </Box>

          {/* Animated Status - positioned right after timestamp */}
          {renderAnimatedStatus()}

          {/* Body Content - AI Synthesis */}
          <Box sx={{ px: 0, pb: 6, pt: 0, flex: 1, width: '100%' }}>
            <div style={{ width: '100%', margin: 0, padding: 0 }}>{renderSynthesisContent()}</div>
          </Box>
        </Box>
      </Box>

      <style>
        {`
          @keyframes shimmerText {
            0% { color: #8b5cf6; }
            50% { color: #c4b5fd; }
            100% { color: #8b5cf6; }
          }
        `}
      </style>
    </>
  )
}

export default SidePanel 