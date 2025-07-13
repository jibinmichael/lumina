import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  TextField,
  Button
} from '@mui/material'
import { 
  MenuOpen
} from '@mui/icons-material'
import { boardStore } from '../stores/boardStore'

const SidePanel = ({ isOpen, onClose, activeBoard, onBoardUpdate }) => {
  const [timeAgo, setTimeAgo] = useState('')
  const [lastModified, setLastModified] = useState(new Date())
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editableTitle, setEditableTitle] = useState('')

  // Capitalize first letter function
  const capitalizeFirstLetter = (str) => {
    if (!str) return 'Untitled'
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Update editable title when activeBoard changes
  useEffect(() => {
    const boardTitle = activeBoard?.name || 'Untitled'
    setEditableTitle(boardTitle)
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

  return (
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

        {/* Body Content - centered when empty */}
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
            Waiting for your inputs
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default SidePanel 