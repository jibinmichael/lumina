import React, { useState, useEffect } from 'react'
import { Box, Typography, IconButton, Tooltip, TextField, TextareaAutosize } from '@mui/material'
import { MenuOpen } from '@mui/icons-material'

const SidePanel = ({ isOpen, onClose, activeBoard }) => {
  const [timeAgo, setTimeAgo] = useState('')
  const [lastModified, setLastModified] = useState(new Date())
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editableTitle, setEditableTitle] = useState('')
  const [content, setContent] = useState('This is where AI insights about your thinking will appear. You can edit this content directly.')

  // Capitalize first letter function
  const capitalizeFirstLetter = (str) => {
    if (!str) return 'Untitled'
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Update editable title when activeBoard changes
  useEffect(() => {
    const boardTitle = activeBoard?.name || 'Untitled Canvas'
    setEditableTitle(capitalizeFirstLetter(boardTitle))
  }, [activeBoard])

  // Real-time metadata updates
  useEffect(() => {
    const updateTimeAgo = () => {
      const now = new Date()
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

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 1000)
    return () => clearInterval(interval)
  }, [lastModified])

  // Handle content change
  const handleContentChange = (e) => {
    setContent(e.target.value)
    setLastModified(new Date())
  }

  // Handle title editing
  const handleTitleClick = () => {
    setIsEditingTitle(true)
  }

  const handleTitleSave = () => {
    // If title is empty, set it to "Untitled", otherwise capitalize first letter
    const finalTitle = !editableTitle.trim() ? 'Untitled' : capitalizeFirstLetter(editableTitle.trim())
    setEditableTitle(finalTitle)
    // Here you could add logic to save the title to the board store
    // For now, we'll just exit edit mode
    setIsEditingTitle(false)
    setLastModified(new Date())
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setEditableTitle(activeBoard?.name || 'Untitled Canvas')
      setIsEditingTitle(false)
    }
  }

  // Handle share
  const handleShare = () => {
    const boardTitle = activeBoard?.name || 'Lumina Notes'
    
    if (navigator.share) {
      navigator.share({
        title: boardTitle,
        text: content,
        url: window.location.href
      })
    } else {
      // Fallback - copy to clipboard
      const shareContent = `${boardTitle}\n\n${content}`
      navigator.clipboard.writeText(shareContent)
      console.log('Content copied to clipboard!')
    }
  }

  if (!isOpen) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 450,
        height: '100vh',
        bgcolor: 'white',
        boxShadow: '-2px 0 20px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1001,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 2,
          bgcolor: 'white'
        }}
      >
        {/* Left - Close button */}
        <Tooltip title="Close side panel" placement="bottom">
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: '#d1d5db',
              '&:hover': {
                bgcolor: 'transparent',
                color: '#9ca3af',
              },
            }}
          >
            <MenuOpen sx={{ fontSize: 16, transform: 'rotate(180deg)' }} />
          </IconButton>
        </Tooltip>

        {/* Right - Share text button */}
        <Tooltip title="Share your board" placement="bottom">
          <Typography
            onClick={handleShare}
            sx={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#666666',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              '&:hover': {
                bgcolor: '#f5f5f5',
                color: '#333333',
              },
            }}
          >
            Share
          </Typography>
        </Tooltip>
      </Box>

      {/* Board Title with Timestamp */}
      <Box sx={{ px: 3, pt: 2, pb: 3 }}>
        {isEditingTitle ? (
          <TextField
            value={editableTitle}
            onChange={(e) => setEditableTitle(e.target.value)}
            onBlur={handleTitleSave}
            onMouseLeave={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            onFocus={(e) => e.target.select()}
            autoFocus
            variant="standard"
            fullWidth
            placeholder="Enter title..."
            sx={{
              mb: 1,
              '& .MuiInput-root': {
                fontSize: '24px',
                fontWeight: 500,
                color: '#333333',
                lineHeight: 1.3,
                '&:before': { borderBottom: 'none' },
                '&:after': { borderBottom: 'none' },
                '&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
              },
              '& .MuiInput-input': {
                padding: 0,
                fontSize: '24px',
                fontWeight: 500,
                lineHeight: 1.3,
              },
              '& .MuiInput-input::placeholder': {
                color: '#999999',
                opacity: 1,
                fontSize: '24px',
                fontWeight: 500,
              },
            }}
          />
        ) : (
          <Tooltip title="Click to edit title" placement="left">
            <Typography
              variant="h4"
              onClick={handleTitleClick}
              sx={{
                fontSize: '24px',
                fontWeight: 500,
                color: '#333333',
                lineHeight: 1.3,
                mb: 1,
                cursor: 'pointer',
                padding: '2px 0',
              }}
            >
              {editableTitle}
            </Typography>
          </Tooltip>
        )}
        <Typography
          variant="body2"
          sx={{
            fontSize: '12px',
            fontWeight: 400,
            color: '#999999',
          }}
        >
          {timeAgo}
        </Typography>
      </Box>

      {/* Simple Text Area */}
      <Box sx={{ flex: 1, px: 3, pb: 3 }}>
        <TextareaAutosize
          value={content}
          onChange={handleContentChange}
          placeholder="AI insights will appear here..."
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#374151',
            backgroundColor: 'transparent',
            padding: 0,
          }}
        />
      </Box>
    </Box>
  )
}

export default SidePanel 