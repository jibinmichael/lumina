import React from 'react'
import { Box, IconButton, Typography, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useReactFlow } from '@xyflow/react'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'

function CustomControls({ zoomLevel }) {
  const theme = useTheme()
  const { zoomIn, zoomOut } = useReactFlow()

  const handleZoomIn = () => {
    zoomIn()
  }

  const handleZoomOut = () => {
    zoomOut()
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 12, // Further down from bottom
        left: 20,
        zIndex: 10,
        bgcolor: 'background.paper',
        borderRadius: 1, // 4px instead of theme.shape.borderRadius
        boxShadow: theme.shadows[4],
        p: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      {/* Zoom Out Button */}
      <Tooltip title="Zoom out" placement="top">
        <IconButton
          onClick={handleZoomOut}
          size="small"
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            '&:hover': {
              bgcolor: '#f5f5f5',
            },
          }}
        >
          <RemoveIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      {/* Zoom Percentage */}
      <Box
        sx={{
          px: 1,
          py: 0.25,
          minWidth: 45,
          textAlign: 'center',
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '12px', 
            color: 'text.secondary', 
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          {zoomLevel}%
        </Typography>
      </Box>

      {/* Zoom In Button */}
      <Tooltip title="Zoom in" placement="top">
        <IconButton
          onClick={handleZoomIn}
          size="small"
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            '&:hover': {
              bgcolor: '#f5f5f5',
            },
          }}
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

export default CustomControls 