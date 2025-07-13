import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  TextField, 
  TextareaAutosize, 
  Button
} from '@mui/material'
import { 
  MenuOpen, 
  Settings
} from '@mui/icons-material'

const SidePanel = ({ isOpen, onClose, activeBoard }) => {
  const [timeAgo, setTimeAgo] = useState('')
  const [lastModified, setLastModified] = useState(new Date())
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editableTitle, setEditableTitle] = useState('')
  const [notes, setNotes] = useState('')

  // Capitalize first letter function
  const capitalizeFirstLetter = (str) => {
    if (!str) return 'Untitled'
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Update editable title when activeBoard changes
  useEffect(() => {
    const boardTitle = activeBoard?.name || 'Untitled Canvas'
    const capitalized = capitalizeFirstLetter(boardTitle)
    setEditableTitle(capitalized)
    
    // Load notes from localStorage
    if (activeBoard?.id) {
      const savedNotes = localStorage.getItem(`board_notes_${activeBoard.id}`)
      setNotes(savedNotes || '')
    }
  }, [activeBoard])

  // Update time ago
  useEffect(() => {
    const updateTimeAgo = () => {
      const now = new Date()
      const modified = new Date(lastModified)
      const seconds = Math.floor((now - modified) / 1000)
      
      if (seconds < 60) return 'Just now'
      if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
      if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
      return `${Math.floor(seconds / 86400)} days ago`
    }

    setTimeAgo(updateTimeAgo())
    const interval = setInterval(() => setTimeAgo(updateTimeAgo()), 60000)
    return () => clearInterval(interval)
  }, [lastModified])

  const handleContentChange = (e) => {
    setNotes(e.target.value)
    setLastModified(new Date())
    
    // Save to localStorage
    if (activeBoard?.id) {
      localStorage.setItem(`board_notes_${activeBoard.id}`, e.target.value)
    }
  }

  const handleTitleClick = () => {
    setIsEditingTitle(true)
  }

  const handleTitleSave = () => {
    setIsEditingTitle(false)
    // Here you would typically save the title to your store/backend
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
      setEditableTitle(capitalizeFirstLetter(activeBoard?.name || 'Untitled Canvas'))
    }
  }

  const handleShare = () => {
    // Implement share functionality
    console.log('Share functionality not yet implemented')
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
        borderLeft: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Close panel">
            <IconButton onClick={onClose} size="small">
              <MenuOpen />
            </IconButton>
          </Tooltip>
          
          {isEditingTitle ? (
            <TextField
              value={editableTitle}
              onChange={(e) => setEditableTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              size="small"
              sx={{ width: 200 }}
            />
          ) : (
            <Typography
              variant="h6"
              onClick={handleTitleClick}
              sx={{
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 },
              }}
            >
              {editableTitle}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Settings">
            <IconButton size="small">
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Last modified: {timeAgo}
          </Typography>
        </Box>

        {/* Notes Section */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Notes
          </Typography>
          <TextareaAutosize
            minRows={10}
            placeholder="Add your notes here..."
            value={notes}
            onChange={handleContentChange}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button variant="outlined" size="small" onClick={handleShare}>
          Share
        </Button>
      </Box>
    </Box>
  )
}

export default SidePanel 