import React, { useState, useEffect } from 'react'
import { Box, Typography, IconButton, TextField, Tooltip, Button } from '@mui/material'
import { AutoAwesomeMosaic, Psychology } from '@mui/icons-material'
import { boardStore } from '../stores/boardStore'
import synthesisStore from '../stores/synthesisStore.js'
import aiService from '../services/aiService.js'

function NotionHeader({ activeBoard, onBoardUpdate, onSidePanelOpen, onGoHome }) {
  const [isEditing, setIsEditing] = useState(false)
  const [boardName, setBoardName] = useState(activeBoard?.name || '')
  // Star state temporarily removed
  const [timeAgo, setTimeAgo] = useState('')
  const [synthesisReady, setSynthesisReady] = useState(false)

  // Update board name when activeBoard changes
  useEffect(() => {
    setBoardName(activeBoard?.name || '')
  }, [activeBoard])

  // Check if synthesis is ready
  useEffect(() => {
    const checkSynthesisReady = () => {
      if (!aiService.hasApiKey()) {
        setSynthesisReady(false)
        return
      }

      // Get current nodes from board store
      if (activeBoard?.id) {
        const boardNodes = boardStore.getNodesForBoard(activeBoard.id)
        const nodesWithContent = boardNodes.nodes?.filter(node => node.data?.content?.trim()) || []
        
        // Synthesis is ready if we have at least 2 nodes with content
        setSynthesisReady(nodesWithContent.length >= 2)
      } else {
        setSynthesisReady(false)
      }
    }

    checkSynthesisReady()
    
    // Listen for synthesis store updates
    const unsubscribe = synthesisStore.addListener((event) => {
      if (event.boardId === activeBoard?.id) {
        checkSynthesisReady()
      }
    })

    return unsubscribe
  }, [activeBoard])

  // Real-time metadata updates
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

  // Star functionality temporarily removed

  const handleSynthesizeClick = () => {
    if (synthesisReady) {
      onSidePanelOpen?.()
    }
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
            onKeyDown={handleBoardNameKeyDown}
            onFocus={(e) => e.target.select()}
            placeholder="Untitled"
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
                padding: '0',
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
                '&:hover': {
                  opacity: 0.8,
                },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '200px',
              }}
            >
              {activeBoard?.name || 'Untitled'}
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* Right side - Timestamp and Synthesize button */}
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

        <Tooltip 
          title={synthesisReady ? "Open AI synthesis" : "Add more content to enable synthesis"} 
          placement="bottom"
        >
          <span> {/* Wrapper for disabled button tooltip */}
            <Button
              onClick={handleSynthesizeClick}
              disabled={!synthesisReady}
              size="small"
              startIcon={<Psychology sx={{ fontSize: 14 }} />}
              sx={{
                fontSize: '11px',
                fontWeight: 500,
                textTransform: 'none',
                px: '8px',
                py: '3px',
                minHeight: 24,
                color: synthesisReady ? '#8b5cf6' : '#cbd5e1',
                bgcolor: synthesisReady ? '#f3f4f6' : 'transparent',
                border: synthesisReady ? '1px solid #e5e7eb' : '1px solid transparent',
                '&:hover': {
                  bgcolor: synthesisReady ? '#e5e7eb' : 'transparent',
                  color: synthesisReady ? '#7c3aed' : '#cbd5e1',
                },
                '&:disabled': {
                  color: '#cbd5e1',
                  bgcolor: 'transparent',
                },
                '& .MuiButton-startIcon': {
                  marginRight: '4px',
                },
              }}
            >
              Synthesize
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default NotionHeader 