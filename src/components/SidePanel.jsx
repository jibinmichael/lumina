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

const SidePanel = ({ isOpen, onClose, activeBoard, onBoardUpdate, nodes }) => {
  const [timeAgo, setTimeAgo] = useState('')
  const [lastModified, setLastModified] = useState(new Date())
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editableTitle, setEditableTitle] = useState('')
  const [synthesis, setSynthesis] = useState({ content: '', status: 'idle', error: null })

  // Capitalize first letter function
  const capitalizeFirstLetter = (str) => {
    if (!str) return 'Untitled'
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Update editable title when activeBoard changes
  useEffect(() => {
    const boardTitle = activeBoard?.name || 'Untitled'
    setEditableTitle(boardTitle)
    
    // Load synthesis for this board
    if (activeBoard?.id) {
      synthesisStore.loadSynthesis(activeBoard.id)
      const currentSynthesis = synthesisStore.getSynthesis(activeBoard.id)
      setSynthesis(currentSynthesis)
    }
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
        
        if (diffInSeconds < 60) {
          setTimeAgo(`updated ${diffInSeconds} seconds ago`)
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
    if (!aiService.hasApiKey()) {
      return (
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          px: 2 
        }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#d1d5db',
              fontSize: '14px',
              lineHeight: 1.6,
              textAlign: 'center'
            }}
          >
            AI synthesis not configured
          </Typography>
        </Box>
      )
    }

    if (synthesis.status === 'processing') {
      return (
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          px: 2 
        }}>
          <CircularProgress size={24} sx={{ color: '#8b5cf6' }} />
        </Box>
      )
    }

    if (synthesis.error) {
      return (
        <Box sx={{ px: 2, py: 2 }}>
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

    if (!synthesis.content) {
      return (
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          px: 2 
        }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#d1d5db',
              fontSize: '14px',
              lineHeight: 1.6,
              textAlign: 'center'
            }}
          >
            {nodes && nodes.filter(n => n.data?.content?.trim()).length < 2
              ? 'Add at least 2 nodes with content to see synthesis'
              : 'Waiting for your inputs'}
          </Typography>
        </Box>
      )
    }

    return (
      <Box sx={{ px: 2, py: 2, flex: 1, overflowY: 'auto' }}>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#374151',
            fontSize: '14px',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap'
          }}
        >
          {synthesis.content}
        </Typography>
      </Box>
    )
  }

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: 400,
          height: '100vh',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          zIndex: 1000,
          boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
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
            px: 2,
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
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Title section with consistent padding */}
          <Box sx={{ px: 2, pt: 2.5, pb: 0.5 }}>
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
                  }}
                >
                  {activeBoard?.name || 'Untitled'}
                </Typography>
              </Tooltip>
            )}
          </Box>

          {/* Timestamp - close to heading */}
          <Box sx={{ px: 2, pb: 2.5 }}>
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

          {/* Body Content - AI Synthesis */}
          {renderSynthesisContent()}
        </Box>
      </Box>


    </>
  )
}

export default SidePanel 