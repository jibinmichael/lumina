import React, { useState, useCallback, useEffect } from 'react'
import { Box, Typography, Alert } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ReactFlow, ReactFlowProvider, useNodesState, useEdgesState, useReactFlow } from '@xyflow/react'
import { boardStore } from './stores/boardStore'
import CustomControls from './components/CustomControls'
import NotionHeader from './components/NotionHeader'
import SeedNode from './components/SeedNode'
import NodeTypePopover from './components/NodeTypePopover'
import SidePanel from './components/SidePanel'
import HomePage from './components/HomePage'
import { 
  QuestionNode, 
  TeachNode, 
  RabbitholeNode, 
  SummarizeNode, 
  IdeateNode, 
  AnalyzeNode, 
  CustomNode 
} from './components/NodeTypes'
import './styles/reactflow-overrides.css'
import './styles/seednode.css'
import './styles/popover.css'

// Custom node types with props
const createNodeTypes = (onPopoverOpen) => ({
  seed: (props) => <SeedNode {...props} onPopoverOpen={onPopoverOpen} />,
  question: (props) => <QuestionNode {...props} onPopoverOpen={onPopoverOpen} />,
  teach: (props) => <TeachNode {...props} onPopoverOpen={onPopoverOpen} />,
  rabbithole: (props) => <RabbitholeNode {...props} onPopoverOpen={onPopoverOpen} />,
  summarize: (props) => <SummarizeNode {...props} onPopoverOpen={onPopoverOpen} />,
  ideate: (props) => <IdeateNode {...props} onPopoverOpen={onPopoverOpen} />,
  analyze: (props) => <AnalyzeNode {...props} onPopoverOpen={onPopoverOpen} />,
  custom: (props) => <CustomNode {...props} onPopoverOpen={onPopoverOpen} />
})

// Initial nodes
const initialNodes = [
  {
    id: '1',
    type: 'seed',
    position: { x: 400, y: 300 },
    data: { 
      text: '', 
      type: 'seed',
      refId: 'N001' // Unique reference ID
    },
    draggable: true // Make seed node draggable
  }
]

// Initial edges for testing
const initialEdges = []

// Main App Component with ReactFlow context
function AppContent() {
  const theme = useTheme()
  const { fitView, setCenter } = useReactFlow()
  
  // State management
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [boards, setBoards] = useState([])
  const [activeBoard, setActiveBoard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  
  // Homepage state
  const [showHomePage, setShowHomePage] = useState(false)

  // Reference ID counter for unique node citations
  const [refIdCounter, setRefIdCounter] = useState(2) // Start at 2 since seed is N001

  // Popover state
  const [popover, setPopover] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    sourceNodeId: null
  })

  // Side panel state
  const [sidePanelOpen, setSidePanelOpen] = useState(false)

  // Jump to node by reference ID
  const jumpToNode = useCallback((refId) => {
    const targetNode = nodes.find(node => node.data.refId === refId)
    if (targetNode) {
      setCenter(targetNode.position.x, targetNode.position.y, { zoom: 1.2, duration: 800 })
    } else {
      console.log(`Node with reference ID "${refId}" not found`)
      console.log('Available reference IDs:', nodes.map(n => n.data.refId).filter(Boolean))
    }
  }, [nodes, setCenter])

  // Make jumpToNode available globally for easy access
  useEffect(() => {
    window.jumpToNode = jumpToNode
    console.log('🔍 Citation Helper: Reference IDs are hidden from UI but accessible via backend')
    console.log('📍 Use jumpToNode("N001") to jump to any node by reference ID')
    console.log('🔢 Available reference IDs:', nodes.map(n => n.data.refId).filter(Boolean))
  }, [jumpToNode, nodes])

  // Handle popover open
  const handlePopoverOpen = useCallback((position, sourceNodeId) => {
    setPopover({
      isOpen: true,
      position,
      sourceNodeId
    })
  }, [])

  // Handle side panel
  const handleSidePanelOpen = useCallback(() => {
    setSidePanelOpen(true)
  }, [])

  const handleSidePanelClose = useCallback(() => {
    setSidePanelOpen(false)
  }, [])

  // Handle navigation
  const handleGoHome = useCallback(() => {
    setShowHomePage(true)
  }, [])

  const handleStartThinking = useCallback(() => {
    setShowHomePage(false)
  }, [])

  const handleSelectBoard = useCallback((board) => {
    // Switch to the selected board
    const result = boardStore.switchBoard(board.id)
    if (result.success) {
      setActiveBoard(board)
    }
  }, [])

  // Dynamic node types with popover handler
  const nodeTypes = createNodeTypes(handlePopoverOpen)

  // Load boards and active board
  const loadBoards = useCallback(() => {
    try {
      const allBoards = boardStore.getBoards()
      const currentActiveBoard = boardStore.getActiveBoard()
      
      setBoards(allBoards)
      setActiveBoard(currentActiveBoard)
    } catch (error) {
      setError(`Error loading boards: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle viewport changes to track zoom
  const handleViewportChange = useCallback((viewport) => {
    setZoomLevel(Math.round(viewport.zoom * 100))
  }, [])

  // Handle board updates from NotionHeader
  const handleBoardUpdate = useCallback(() => {
    loadBoards()
  }, [loadBoards])

  // Handle popover close
  const handlePopoverClose = useCallback(() => {
    setPopover({
      isOpen: false,
      position: { x: 0, y: 0 },
      sourceNodeId: null
    })
  }, [])

  // Generate unique reference ID
  const generateRefId = useCallback(() => {
    const refId = `N${refIdCounter.toString().padStart(3, '0')}`
    setRefIdCounter(prev => prev + 1)
    return refId
  }, [refIdCounter])

  // Handle node type selection
  const handleNodeTypeSelect = useCallback((nodeType) => {
    const sourceNode = nodes.find(n => n.id === popover.sourceNodeId)
    if (!sourceNode) return

    const newNodeId = `${nodeType.id}-${Date.now()}`
    const newRefId = generateRefId()
    
    // Position new node 250px to the right of source
    const newNode = {
      id: newNodeId,
      type: nodeType.id,
      position: { 
        x: sourceNode.position.x + 250, 
        y: sourceNode.position.y 
      },
      data: { 
        label: nodeType.label, 
        icon: nodeType.icon,
        content: '', 
        nodeType: nodeType.id,
        refId: newRefId, // Add unique reference ID
        draggable: true 
      }
    }
    
    // Create edge connecting source to new node
    const newEdge = {
      id: `edge-${popover.sourceNodeId}-${newNodeId}`,
      source: popover.sourceNodeId,
      target: newNodeId,
      sourceHandle: null,
      targetHandle: null
    }
    
    setNodes(prev => [...prev, newNode])
    setEdges(prev => [...prev, newEdge])
    handlePopoverClose()
  }, [nodes, popover.sourceNodeId, setNodes, setEdges, handlePopoverClose, generateRefId])

  // Load initial data
  useEffect(() => {
    loadBoards()
  }, [])

  // Show homepage if requested
  if (showHomePage) {
    return <HomePage onStartThinking={handleStartThinking} onSelectBoard={handleSelectBoard} />
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          p: 2,
        }}
      >
        <Alert 
          severity="error" 
          sx={{ maxWidth: 400 }}
          action={
            <button 
              onClick={() => {
                setError(null)
                setIsLoading(true)
                loadBoards()
              }}
              style={{
                background: theme.palette.primary.main,
                color: 'white',
                border: 'none',
                borderRadius: theme.shape.borderRadius,
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          }
        >
          <Typography variant="h6">Error</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Box>
    )
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Typography variant="h2" sx={{ mb: 1, color: 'text.primary' }}>
          Loading Lumina Notes...
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Preparing your thinking space
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Notion-style Header */}
      <NotionHeader 
        activeBoard={activeBoard} 
        onBoardUpdate={handleBoardUpdate}
        onSidePanelOpen={handleSidePanelOpen}
        onGoHome={handleGoHome}
      />

      {/* ReactFlow Canvas - Add top padding for fixed header */}
      <Box sx={{ width: '100%', height: '100%', pt: '40px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onViewportChange={handleViewportChange}
          style={{ width: '100%', height: '100%' }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.1}
          maxZoom={4}
          attributionPosition="bottom-left"
          connectionLineType="default"
          snapToGrid={false}
          snapGrid={[15, 15]}
        >
          {/* Clean white background */}
        </ReactFlow>

        {/* Custom Controls with integrated zoom percentage */}
        <CustomControls zoomLevel={zoomLevel} />
      </Box>

      {/* Node Type Popover */}
      {popover.isOpen && (
        <NodeTypePopover
          position={popover.position}
          sourceNodeId={popover.sourceNodeId}
          onSelect={handleNodeTypeSelect}
          onClose={handlePopoverClose}
        />
      )}

      {/* Side Panel */}
      <SidePanel
        isOpen={sidePanelOpen}
        onClose={handleSidePanelClose}
        activeBoard={activeBoard}
      />
    </Box>
  )
}

function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  )
}

export default App 