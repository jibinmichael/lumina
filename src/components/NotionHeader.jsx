import React, { useState, useEffect } from 'react'
import { Box, Typography, IconButton, TextField, Tooltip } from '@mui/material'
import { Star, StarBorder, MenuOpen, AutoAwesomeMosaic } from '@mui/icons-material'
import { boardStore } from '../stores/boardStore'

function NotionHeader({ activeBoard, onBoardUpdate, onSidePanelOpen, onGoHome }) {
  const [isEditing, setIsEditing] = useState(false)
  const [boardName, setBoardName] = useState(activeBoard?.name || '')
  const [isFavorite, setIsFavorite] = useState(false)
  const [timeAgo, setTimeAgo] = useState('')

  // Update board name when activeBoard changes
  useEffect(() => {
    setBoardName(activeBoard?.name || '')
  }, [activeBoard])

  // Real-time metadata updates
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

  const handleBoardNameClick = () => {
    setIsEditing(true)
  }

  // Capitalize first letter function
  const capitalizeFirstLetter = (str) => {
    if (!str) return 'Untitled'
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const handleBoardNameSave = () => {
    if (boardName.trim() && boardName !== activeBoard?.name) {
      const capitalizedName = capitalizeFirstLetter(boardName.trim())
      const result = boardStore.renameBoard(activeBoard.id, capitalizedName)
      if (result.success) {
        setBoardName(capitalizedName)
        onBoardUpdate()
      }
    }
    setIsEditing(false)
  }

  const handleBoardNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBoardNameSave()
    } else if (e.key === 'Escape') {
      setBoardName(activeBoard?.name || '')
      setIsEditing(false)
    }
  }

  const handleStarClick = () => {
    setIsFavorite(!isFavorite)
  }

  const handleSidebarClick = () => {
    onSidePanelOpen?.()
  }

  const handleHomeClick = () => {
    onGoHome?.()
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        bgcolor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        pt: '12px',
        pb: '8px',
        zIndex: 1000,
      }}
    >
      {/* Left side - Breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="Home page" placement="bottom">
          <IconButton
            onClick={handleHomeClick}
            size="small"
            sx={{
              width: 16,
              height: 16,
              padding: 0,
              color: '#666666',
              '&:hover': {
                bgcolor: 'transparent',
                color: '#2196f3',
              },
            }}
          >
            <AutoAwesomeMosaic sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Typography
          variant="body2"
          sx={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#999999',
            cursor: 'default',
          }}
        >
          My boards
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#666666',
          }}
        >
          /
        </Typography>
        {isEditing ? (
          <TextField
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            onBlur={handleBoardNameSave}
            onMouseLeave={handleBoardNameSave}
            onKeyDown={handleBoardNameKeyDown}
            onFocus={(e) => e.target.select()}
            autoFocus
            variant="standard"
            size="small"
            sx={{
              '& .MuiInput-root': {
                fontSize: '13px',
                fontWeight: 500,
                color: '#333333',
                '&:before': { borderBottom: 'none' },
                '&:after': { borderBottom: 'none' },
                '&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
              },
              '& .MuiInput-input': {
                padding: '2px 4px',
                fontSize: '13px',
                fontWeight: 500,
              },
            }}
          />
        ) : (
          <Tooltip title="Click to edit board name" placement="bottom">
            <Typography
              variant="body2"
              onClick={handleBoardNameClick}
              sx={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#333333',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                '&:hover': {
                  bgcolor: '#f5f5f5',
                },
              }}
            >
              {activeBoard?.name || 'Untitled'}
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* Right side - Icons and metadata */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontSize: '13px',
            fontWeight: 400,
            color: '#999999',
          }}
        >
          {timeAgo}
        </Typography>
        <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"} placement="bottom">
          <IconButton
            onClick={handleStarClick}
            size="small"
            sx={{
              color: isFavorite ? '#fbbf24' : '#d1d5db',
              '&:hover': {
                bgcolor: 'transparent',
                color: isFavorite ? '#f59e0b' : '#9ca3af',
              },
            }}
          >
            {isFavorite ? <Star sx={{ fontSize: 16 }} /> : <StarBorder sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Open side panel" placement="bottom">
          <IconButton
            onClick={handleSidebarClick}
            size="small"
            sx={{
              color: '#d1d5db',
              '&:hover': {
                bgcolor: 'transparent',
                color: '#9ca3af',
              },
            }}
          >
            <MenuOpen sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default NotionHeader 