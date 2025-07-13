import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  TextField, 
  TextareaAutosize, 
  Button, 
  Alert, 
  CircularProgress, 
  Chip, 
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Switch,
  FormControlLabel
} from '@mui/material'
import { 
  MenuOpen, 
  Settings, 
  Refresh, 
  Clear, 
  Visibility, 
  VisibilityOff, 
  Psychology,
  Error as ErrorIcon,
  CheckCircle,
  AutorenewIcon
} from '@mui/icons-material'
import synthesisStore from '../stores/synthesisStore'

const SidePanel = ({ isOpen, onClose, activeBoard }) => {
  const [timeAgo, setTimeAgo] = useState('')
  const [lastModified, setLastModified] = useState(new Date())
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editableTitle, setEditableTitle] = useState('')
  
  // AI Synthesis State
  const [synthesis, setSynthesis] = useState('')
  const [synthesisStatus, setSynthesisStatus] = useState('inactive')
  const [synthesisError, setSynthesisError] = useState(null)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSettingUpAI, setIsSettingUpAI] = useState(false)

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

  // Set up synthesis store listener
  useEffect(() => {
    const handleSynthesisChange = (event, data) => {
      switch (event) {
        case 'synthesisChanged':
          setSynthesis(data.synthesis || '')
          setLastModified(new Date())
          break
        case 'statusChanged':
          setSynthesisStatus(data.status)
          break
        case 'error':
          setSynthesisError(data.error)
          setSynthesisStatus('error')
          break
        case 'initialized':
          setAiEnabled(true)
          setSynthesisError(null)
          break
        case 'enabledChanged':
          setAiEnabled(data.enabled)
          break
        default:
          break
      }
    }

    synthesisStore.addChangeListener(handleSynthesisChange)
    
    // Initialize state from store
    setSynthesis(synthesisStore.getCurrentSynthesis())
    setSynthesisStatus(synthesisStore.getStatus())
    setSynthesisError(synthesisStore.getLastError())
    setAiEnabled(synthesisStore.isSynthesisEnabled())

    return () => {
      synthesisStore.removeChangeListener(handleSynthesisChange)
    }
  }, [])

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('lumina_openai_key')
    if (storedKey) {
      setApiKey(storedKey)
      // Auto-initialize if key exists
      handleSetupAI(storedKey)
    }
  }, [])

  // Handle AI setup
  const handleSetupAI = async (key = apiKey) => {
    if (!key.trim()) {
      setSynthesisError('Please enter your OpenAI API key')
      return
    }

    setIsSettingUpAI(true)
    setSynthesisError(null)

    try {
      // Save to localStorage
      localStorage.setItem('lumina_openai_key', key)
      
      // Initialize synthesis store
      const success = await synthesisStore.initialize(key)
      
      if (success) {
        setShowSettings(false)
        setApiKey(key)
        console.log('AI Synthesis Engine initialized successfully')
      } else {
        setSynthesisError('Failed to initialize AI service. Please check your API key.')
      }
    } catch (error) {
      setSynthesisError(`Setup failed: ${error.message}`)
    } finally {
      setIsSettingUpAI(false)
    }
  }

  // Handle manual synthesis trigger
  const handleRefreshSynthesis = () => {
    synthesisStore.triggerSynthesis()
  }

  // Handle clear synthesis
  const handleClearSynthesis = () => {
    synthesisStore.clearSynthesis()
  }

  // Handle AI toggle
  const handleAiToggle = (enabled) => {
    synthesisStore.setEnabled(enabled)
  }

  // Handle content change (for manual editing)
  const handleContentChange = (e) => {
    setSynthesis(e.target.value)
    setLastModified(new Date())
  }

  // Handle title editing
  const handleTitleClick = () => {
    setIsEditingTitle(true)
  }

  const handleTitleSave = () => {
    const finalTitle = !editableTitle.trim() ? 'Untitled' : capitalizeFirstLetter(editableTitle.trim())
    setEditableTitle(finalTitle)
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
        text: synthesis,
        url: window.location.href
      })
    } else {
      const shareContent = `${boardTitle}\n\n${synthesis}`
      navigator.clipboard.writeText(shareContent)
      console.log('Content copied to clipboard!')
    }
  }

  // Get status color and icon
  const getStatusDisplay = () => {
    switch (synthesisStatus) {
      case 'processing':
        return { color: 'orange', icon: <CircularProgress size={12} />, text: 'Processing' }
      case 'completed':
        return { color: 'success', icon: <CheckCircle sx={{ fontSize: 12 }} />, text: 'Updated' }
      case 'error':
        return { color: 'error', icon: <ErrorIcon sx={{ fontSize: 12 }} />, text: 'Error' }
      default:
        return { color: 'default', icon: <Psychology sx={{ fontSize: 12 }} />, text: 'Ready' }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 450,
        height: '100vh',
        bgcolor: 'white',
        boxShadow: isOpen ? '-2px 0 20px rgba(0, 0, 0, 0.1)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1001,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), box-shadow 0.3s ease',
        pointerEvents: isOpen ? 'auto' : 'none',
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

        {/* Right - AI Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* AI Status Chip */}
          {aiEnabled && (
            <Chip
              icon={statusDisplay.icon}
              label={statusDisplay.text}
              size="small"
              color={statusDisplay.color}
              variant="outlined"
              sx={{ fontSize: '11px', height: '24px' }}
            />
          )}

          {/* AI Controls */}
          {aiEnabled && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="Refresh synthesis">
                <IconButton
                  onClick={handleRefreshSynthesis}
                  size="small"
                  disabled={synthesisStatus === 'processing'}
                  sx={{ color: '#666666' }}
                >
                  <Refresh sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear synthesis">
                <IconButton
                  onClick={handleClearSynthesis}
                  size="small"
                  sx={{ color: '#666666' }}
                >
                  <Clear sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Settings */}
          <Tooltip title="AI settings">
            <IconButton
              onClick={() => setShowSettings(true)}
              size="small"
              sx={{ color: '#666666' }}
            >
              <Settings sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          {/* Share */}
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
      </Box>

      {/* Board Title with Timestamp */}
      <Box sx={{ px: 3, pt: 2, pb: 2 }}>
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

      {/* AI Synthesis Section */}
      <Box sx={{ px: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Psychology sx={{ fontSize: 16, color: '#666666' }} />
          <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#666666' }}>
            AI Synthesis
          </Typography>
          {aiEnabled && (
            <FormControlLabel
              control={
                <Switch
                  checked={aiEnabled}
                  onChange={(e) => handleAiToggle(e.target.checked)}
                  size="small"
                />
              }
              label=""
              sx={{ ml: 'auto', mr: 0 }}
            />
          )}
        </Box>
        
        {synthesisError && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '13px' }}>
            {synthesisError}
          </Alert>
        )}
        
        {!aiEnabled && !synthesisError && (
          <Alert severity="info" sx={{ mb: 2, fontSize: '13px' }}>
            Set up your OpenAI API key to enable AI synthesis of your thinking.
          </Alert>
        )}
      </Box>

      {/* Synthesis Content */}
      <Box sx={{ flex: 1, px: 3, pb: 3 }}>
        <TextareaAutosize
          value={synthesis}
          onChange={handleContentChange}
          placeholder={
            !aiEnabled 
              ? "Configure AI synthesis in settings to see your thinking organized here..." 
              : "Your AI synthesis will appear here as you add content to nodes..."
          }
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

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>AI Synthesis Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 2, color: '#666666' }}>
              Enter your OpenAI API key to enable AI synthesis. Your key is stored locally and never shared.
            </Typography>
            <TextField
              fullWidth
              label="OpenAI API Key"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowApiKey(!showApiKey)}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              How it works:
            </Typography>
            <Typography variant="body2" sx={{ color: '#666666', fontSize: '13px' }}>
              • The AI silently listens to your node content<br />
              • It organizes your thoughts without adding new ideas<br />
              • Synthesis updates automatically after you stop typing<br />
              • Your thinking remains completely your own
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Cancel</Button>
          <Button
            onClick={() => handleSetupAI()}
            variant="contained"
            disabled={!apiKey.trim() || isSettingUpAI}
            startIcon={isSettingUpAI ? <CircularProgress size={16} /> : null}
          >
            {isSettingUpAI ? 'Setting up...' : 'Save & Enable'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SidePanel 