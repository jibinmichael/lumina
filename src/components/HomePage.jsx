import React, { useState, useEffect } from 'react'
import { Box, Typography, Button, TextField } from '@mui/material'
import { Add, Search } from '@mui/icons-material'
import Skeleton from '@mui/material/Skeleton'
import { boardStore } from '../stores/boardStore'

const HomePage = ({ onStartThinking, onSelectBoard }) => {
  const [boards, setBoards] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Load boards
  useEffect(() => {
    const loadBoards = async () => {
      setIsLoading(true); // Start loading
      // Wait for board store to be initialized
      if (!boardStore.isInitialized) {
        await boardStore.initialize()
      }
      const allBoards = boardStore.getBoards()
      setBoards(allBoards)
      setIsLoading(false); // Done loading
    }
    loadBoards()

    // Listen for board changes
    const unsubscribe = boardStore.addChangeListener((event, data) => {
      console.log('📢 Board store event:', event, data)
      if (event === 'board_created') {
        console.log('🔄 Reloading boards after:', event)
        loadBoards()
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Filter boards based on search
  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group unstarred boards by date
  const groupBoardsByDate = (boards) => {
    const groups = {}
    boards.forEach(board => {
      const date = new Date(board.lastModified).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(board)
    })
    
    // Sort dates (most recent first)
    const sortedDates = Object.keys(groups).sort((a, b) => 
      new Date(groups[b][0].lastModified) - new Date(groups[a][0].lastModified)
    )
    
    return sortedDates.map(date => ({ date, boards: groups[date] }))
  }

  const groupedBoards = groupBoardsByDate(filteredBoards)

  // Handle board actions (star and delete temporarily removed)

  const handleNewBoard = async () => {
    const result = await boardStore.createBoard('Untitled Thoughtscape')
    if (result.success) {
      setBoards(boardStore.getBoards())
      // Launch the new board
      onSelectBoard?.(result.board)
      onStartThinking()
    }
  }

  const handleBoardClick = async (board) => {
    await onSelectBoard?.(board)
    onStartThinking()
  }

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'white',
        padding: 3,
      }}
    >
      <Box sx={{ width: 580, maxHeight: '80vh', overflow: 'auto' }}>
        {/* All content inside this box will have consistent left padding */}
        <Box sx={{ pl: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 5 }}>
          <Typography
            variant="h4"
            sx={{
              fontSize: '20px',
              fontWeight: 500,
              color: '#333333',
            }}
          >
            My thoughtscapes
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Search Box */}
            <TextField
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search boards..."
              variant="outlined"
              size="small"
              sx={{
                width: 180,
                '& .MuiOutlinedInput-root': {
                  height: 28,
                  fontSize: '12px',
                  '& fieldset': {
                    borderColor: '#e5e7eb',
                  },
                  '&:hover fieldset': {
                    borderColor: '#d1d5db',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2196f3',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '4px 6px',
                  fontSize: '12px',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#9ca3af',
                  opacity: 1,
                },
              }}
              InputProps={{
                startAdornment: <Search sx={{ fontSize: 16, color: '#9ca3af', marginRight: '4px' }} />,
              }}
            />
            
            {/* New Board Button */}
            <Button
              onClick={handleNewBoard}
              variant="contained"
              size="small"
              sx={{
                bgcolor: '#2196f3',
                color: 'white',
                fontSize: '11px',
                fontWeight: 500,
                textTransform: 'none',
                px: '8px',
                py: '3px',
                minHeight: 28,
                '& .MuiButton-startIcon': {
                  marginRight: '4px',
                },
                '&:hover': {
                  bgcolor: '#1976d2',
                },
              }}
              startIcon={<Add sx={{ fontSize: 14 }} />}
            >
              New board
            </Button>
          </Box>
        </Box>



        {/* Date-grouped Boards */}
        {isLoading ? (
          <Box>
            {[1,2,3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={36} sx={{ borderRadius: '6px', mb: 2 }} />
            ))}
          </Box>
        ) : (
          groupedBoards.map((group) => (
            <Box key={group.date} sx={{ mb: 6 }}>
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#6b7280',
                  mb: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {group.date}
              </Typography>
              {group.boards.map((board) => (
                <Box
                  key={board.id}
                  onClick={() => handleBoardClick(board)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    py: 1.5,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    ml: -2, // extend background to left edge
                    pl: 2,  // keep text aligned
                    '&:hover': {
                      bgcolor: '#f9fafb',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      flex: 1,
                      fontSize: '13px',
                      fontWeight: 400,
                      color: '#333333',
                    }}
                  >
                    {board.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))
        )}

        {/* Empty State */}
        {isLoading ? null : filteredBoards.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography
              sx={{
                fontSize: '13px',
                color: '#9ca3af',
                mb: 2,
              }}
            >
              {searchQuery ? 'No boards match your search' : 'No boards yet'}
            </Typography>
            {!searchQuery && (
              <Button
                onClick={handleNewBoard}
                variant="outlined"
                size="small"
                sx={{
                  fontSize: '11px',
                  textTransform: 'none',
                  borderColor: '#e5e7eb',
                  color: '#6b7280',
                  '&:hover': {
                    borderColor: '#2196f3',
                    color: '#2196f3',
                  },
                }}
              >
                Create your first board
              </Button>
            )}
          </Box>
        )}
       </Box>
      </Box>
    </Box>
  )
}

export default HomePage 