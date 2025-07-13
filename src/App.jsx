import React, { useState, useCallback, useEffect } from 'react'
import { Box, Typography, Alert } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ReactFlow, ReactFlowProvider, useNodesState, useEdgesState, useReactFlow } from '@xyflow/react'
import { boardStore } from './stores/boardStore'
import autoSaveManager, { SAVE_PRIORITY } from './utils/autoSave'
import userIdentity from './utils/userIdentity'
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
import MultiOptionNode from './components/MultiOptionNode'
import GeneratedNode from './components/GeneratedNode'
import './styles/reactflow-overrides.css'
import './styles/seednode.css'
import './styles/popover.css'

// Custom node types with props
const createNodeTypes = (onPopoverOpen, onMultiOptionClick) => ({
  seed: (props) => <SeedNode {...props} onPopoverOpen={onPopoverOpen} />,
  question: (props) => <QuestionNode {...props} onPopoverOpen={onPopoverOpen} />,
  teach: (props) => <TeachNode {...props} onPopoverOpen={onPopoverOpen} />,
  rabbithole: (props) => <RabbitholeNode {...props} onPopoverOpen={onPopoverOpen} />,
  summarize: (props) => <SummarizeNode {...props} onPopoverOpen={onPopoverOpen} />,
  ideate: (props) => <IdeateNode {...props} onPopoverOpen={onPopoverOpen} />,
  analyze: (props) => <AnalyzeNode {...props} onPopoverOpen={onPopoverOpen} />,
  custom: (props) => <CustomNode {...props} onPopoverOpen={onPopoverOpen} />,
  'multi-option': (props) => <MultiOptionNode {...props} data={{...props.data, onOptionClick: onMultiOptionClick}} />,
  generated: (props) => <GeneratedNode {...props} onPopoverOpen={onPopoverOpen} />
})

// Initial nodes template
const createInitialNodes = (refIdCounter = 1) => [
  {
    id: '1',
    type: 'seed',
    position: { x: 400, y: 300 },
    data: { 
      text: '', 
      type: 'seed',
      refId: `N${refIdCounter.toString().padStart(3, '0')}` // Unique reference ID
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
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [boards, setBoards] = useState([])
  const [activeBoard, setActiveBoard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [storageStatus, setStorageStatus] = useState({
    userIdentity: false,
    boardStore: false,
    autoSave: false
  })
  
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

  // Initialize storage systems
  const initializeStorageSystems = useCallback(async () => {
    try {
      setIsInitializing(true)
      console.log('🚀 Initializing Lumina Notes storage systems...')

      // Initialize user identity
      if (!userIdentity.isInitialized) {
        const userResult = await userIdentity.initialize()
        if (userResult.success) {
          setStorageStatus(prev => ({ ...prev, userIdentity: true }))
          console.log('✅ User identity initialized')
        } else {
          throw new Error('User identity initialization failed')
        }
      }

      // Initialize board store (which initializes other storage systems)
      if (!boardStore.isInitialized) {
        const boardResult = await boardStore.initialize()
        if (boardResult.success) {
          setStorageStatus(prev => ({ ...prev, boardStore: true }))
          console.log('✅ Board store initialized')
        } else {
          console.error('Board store initialization failed:', boardResult.error)
        }
      }

      // Initialize auto-save manager
      if (!autoSaveManager.isInitialized) {
        const autoSaveResult = await autoSaveManager.initialize()
        if (autoSaveResult.success) {
          setStorageStatus(prev => ({ ...prev, autoSave: true }))
          console.log('✅ Auto-save initialized')
        } else {
          console.warn('Auto-save initialization failed:', autoSaveResult.error)
        }
      }

      console.log('🎉 Storage systems initialized successfully!')
      return true
    } catch (error) {
      console.error('Storage initialization failed:', error)
      setError(`Storage initialization failed: ${error.message}`)
      return false
    } finally {
      setIsInitializing(false)
    }
  }, [])

  // Load board data including nodes
  const loadBoardData = useCallback(async () => {
    if (!boardStore.isInitialized) return

    try {
      const allBoards = boardStore.getBoards()
      const currentActiveBoard = boardStore.getActiveBoard()
      
      setBoards(allBoards)
      setActiveBoard(currentActiveBoard)

      // Load nodes for active board
      if (currentActiveBoard) {
        const boardNodes = boardStore.getNodesForBoard(currentActiveBoard.id)
        
        if (boardNodes.nodes && boardNodes.nodes.length > 0) {
          setNodes(boardNodes.nodes)
          setEdges(boardNodes.edges || [])
          
          // Update ref counter based on existing nodes
          const maxRefId = boardNodes.nodes.reduce((max, node) => {
            if (node.data.refId) {
              const refNum = parseInt(node.data.refId.replace('N', ''))
              return Math.max(max, refNum)
            }
            return max
          }, 0)
          setRefIdCounter(maxRefId + 1)
        } else {
          // Create initial nodes for new board
          const initialNodes = createInitialNodes(1)
          setNodes(initialNodes)
          setEdges(initialEdges)
          setRefIdCounter(2)
          
          // Save initial nodes
          await boardStore.saveNodesForBoard(
            currentActiveBoard.id, 
            initialNodes, 
            initialEdges, 
            { x: 0, y: 0, zoom: 1 }
          )
        }
      }
    } catch (error) {
      console.error('Error loading board data:', error)
      setError(`Error loading boards: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [setNodes, setEdges])

  // Auto-save nodes when they change
  const autoSaveNodes = useCallback(async (currentNodes, currentEdges, viewport = null) => {
    if (!activeBoard || !boardStore.isInitialized) return

    try {
      await boardStore.saveNodesForBoard(
        activeBoard.id,
        currentNodes,
        currentEdges,
        viewport
      )
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [activeBoard])

  // Enhanced nodes change handler with auto-save
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes)
    
    // Auto-save after a short delay
    setTimeout(() => {
      autoSaveNodes(nodes, edges)
    }, 500)
  }, [onNodesChange, autoSaveNodes, nodes, edges])

  // Enhanced edges change handler with auto-save
  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes)
    
    // Auto-save after a short delay
    setTimeout(() => {
      autoSaveNodes(nodes, edges)
    }, 500)
  }, [onEdgesChange, autoSaveNodes, nodes, edges])

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

  const handleSelectBoard = useCallback(async (board) => {
    try {
      // Switch to the selected board
      const result = boardStore.switchBoard(board.id)
      if (result.success) {
        setActiveBoard(board)
        
        // Load nodes for the new board
        const boardNodes = boardStore.getNodesForBoard(board.id)
        
        if (boardNodes.nodes && boardNodes.nodes.length > 0) {
          setNodes(boardNodes.nodes)
          setEdges(boardNodes.edges || [])
        } else {
          // Create initial nodes for empty board
          const initialNodes = createInitialNodes(1)
          setNodes(initialNodes)
          setEdges(initialEdges)
          
          // Save initial nodes
          await boardStore.saveNodesForBoard(
            board.id, 
            initialNodes, 
            initialEdges, 
            { x: 0, y: 0, zoom: 1 }
          )
        }
        
        setShowHomePage(false)
      }
    } catch (error) {
      console.error('Error switching board:', error)
      setError(`Error switching board: ${error.message}`)
    }
  }, [setNodes, setEdges])

  // Dynamic node types with popover and multi-option handlers
  const nodeTypes = createNodeTypes(handlePopoverOpen, handleMultiOptionClick)

  // Handle viewport changes to track zoom
  const handleViewportChange = useCallback((viewport) => {
    setZoomLevel(Math.round(viewport.zoom * 100))
    
    // Auto-save viewport changes
    if (activeBoard) {
      autoSaveNodes(nodes, edges, viewport)
    }
  }, [activeBoard, autoSaveNodes, nodes, edges])

  // Handle board updates from NotionHeader
  const handleBoardUpdate = useCallback(async () => {
    await loadBoardData()
  }, [loadBoardData])

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

  // Handle multi-option node button clicks
  const handleMultiOptionClick = useCallback(async (option, index, parentNodeId) => {
    const parentNode = nodes.find(n => n.id === parentNodeId)
    if (!parentNode) return

    const newNodeId = `generated-${Date.now()}-${index}`
    const newRefId = generateRefId()
    
    // Position new node to the right of parent with vertical offset for multiple nodes
    const verticalOffset = index * 80 // Spread nodes vertically
    const newNode = {
      id: newNodeId,
      type: 'generated',
      position: { 
        x: parentNode.position.x + 300, 
        y: parentNode.position.y + verticalOffset 
      },
      data: { 
        heading: option,
        label: option,
        content: '', 
        nodeType: 'generated',
        refId: newRefId,
        draggable: true,
        placeholder: `Write about ${option.toLowerCase()}...`
      }
    }
    
    // Create edge connecting parent to new node
    const newEdge = {
      id: `edge-${parentNodeId}-${newNodeId}`,
      source: parentNodeId,
      target: newNodeId,
      sourceHandle: null,
      targetHandle: null
    }
    
    const updatedNodes = [...nodes, newNode]
    const updatedEdges = [...edges, newEdge]
    
    setNodes(updatedNodes)
    setEdges(updatedEdges)
    
    // Auto-save immediately
    if (activeBoard) {
      await autoSaveNodes(updatedNodes, updatedEdges)
    }
  }, [nodes, edges, setNodes, setEdges, generateRefId, activeBoard, autoSaveNodes])

  // Handle node type selection with auto-save
  const handleNodeTypeSelect = useCallback(async (nodeType) => {
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
        nodeType: nodeType.multiType || nodeType.id, // Use multiType for multi-option nodes
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
    
    const updatedNodes = [...nodes, newNode]
    const updatedEdges = [...edges, newEdge]
    
    setNodes(updatedNodes)
    setEdges(updatedEdges)
    handlePopoverClose()
    
    // Auto-save immediately for new nodes
    if (activeBoard) {
      await autoSaveNodes(updatedNodes, updatedEdges)
    }
  }, [nodes, edges, popover.sourceNodeId, setNodes, setEdges, handlePopoverClose, generateRefId, activeBoard, autoSaveNodes])

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      const success = await initializeStorageSystems()
      if (success) {
        await loadBoardData()
      }
    }
    
    initialize()
  }, [initializeStorageSystems, loadBoardData])

  // Set up board store change listener
  useEffect(() => {
    if (!boardStore.isInitialized) return

    const removeListener = boardStore.addChangeListener((event, data) => {
      console.log('📡 Board store event:', event, data)
      
      switch (event) {
        case 'board_created':
        case 'board_deleted':
        case 'board_renamed':
          loadBoardData()
          break
        case 'active_board_changed':
          setActiveBoard(data.board)
          break
        default:
          break
      }
    })

    return removeListener
  }, [loadBoardData])

  // Show loading screen during initialization
  if (isInitializing) {
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
        <Typography variant="h2" sx={{ mb: 2, color: 'text.primary' }}>
          🔐 Initializing Lumina Notes
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
          Setting up your secure thinking space...
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ color: storageStatus.userIdentity ? 'success.main' : 'text.secondary' }}>
            {storageStatus.userIdentity ? '✅' : '⏳'} User Identity
          </Typography>
          <br />
          <Typography variant="caption" sx={{ color: storageStatus.boardStore ? 'success.main' : 'text.secondary' }}>
            {storageStatus.boardStore ? '✅' : '⏳'} Board Storage
          </Typography>
          <br />
          <Typography variant="caption" sx={{ color: storageStatus.autoSave ? 'success.main' : 'text.secondary' }}>
            {storageStatus.autoSave ? '✅' : '⏳'} Auto-Save System
          </Typography>
        </Box>
      </Box>
    )
  }

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
              onClick={async () => {
                setError(null)
                setIsLoading(true)
                const success = await initializeStorageSystems()
                if (success) {
                  await loadBoardData()
                }
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
          Loading your canvas...
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {activeBoard ? `Opening "${activeBoard.name}"` : 'Preparing your thinking space'}
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
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
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