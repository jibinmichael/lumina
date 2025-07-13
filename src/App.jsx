import React, { useState, useCallback, useEffect, useMemo } from 'react'
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
  CustomNode,
  DecisionNode 
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
  decision: (props) => <DecisionNode {...props} onPopoverOpen={onPopoverOpen} />,
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

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" color="error">Something went wrong!</Typography>
          <Typography variant="body1">{this.state.error?.message}</Typography>
          <pre>{this.state.error?.stack}</pre>
        </Box>
      )
    }

    return this.props.children
  }
}

// Main App Component with ReactFlow context
function AppContent() {
  const theme = useTheme()
  const { fitView, setCenter } = useReactFlow()
  
  // State management
  const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes(1))
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [boards, setBoards] = useState([])
  const [activeBoard, setActiveBoard] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
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



  // Initialize storage systems silently in background
  const initializeStorageSystems = useCallback(async () => {
    try {
      console.log('🔧 Starting storage initialization...')

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
    }
  }, [])

  // Load board data including nodes
  const loadBoardData = useCallback(async () => {
    if (!boardStore.isInitialized) return

    try {
      console.log('📚 Loading board data...')
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
    }
  }, [setNodes, setEdges])

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

  // Auto-save nodes when they change
  const autoSaveNodes = useCallback(async (currentNodes, currentEdges, viewport = null) => {
    if (!activeBoard) return

    try {
      // Save to board store
      await boardStore.saveNodesForBoard(
        activeBoard.id,
        currentNodes,
        currentEdges,
        viewport
      )
      console.log('💾 Auto-saved nodes and edges')
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
        placeholder: 'Write your thought or insight here...'
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
    
    // Auto-save immediately for new nodes
    await autoSaveNodes(updatedNodes, updatedEdges)
    
    console.log('🆕 Created generated node:', newNode)
  }, [nodes, edges, setNodes, setEdges, generateRefId, autoSaveNodes])

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
    await autoSaveNodes(updatedNodes, updatedEdges)
    
    console.log('🆕 Created new node:', newNode)
  }, [nodes, edges, popover.sourceNodeId, setNodes, setEdges, handlePopoverClose, generateRefId, autoSaveNodes])

  // Dynamic node types with popover and multi-option handlers (memoized)
  const nodeTypes = useMemo(
    () => createNodeTypes(handlePopoverOpen, handleMultiOptionClick),
    [handlePopoverOpen, handleMultiOptionClick]
  )

  // Initialize on mount
  useEffect(() => {
    console.log('🔄 App initialization starting...')
    const initialize = async () => {
      const success = await initializeStorageSystems()
      if (success) {
        await loadBoardData()
      }
    }
    
    initialize()
  }, [initializeStorageSystems, loadBoardData])

  // Show homepage if requested
  if (showHomePage) {
    return <HomePage onStartThinking={handleStartThinking} onSelectBoard={() => {}} />
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
    <ErrorBoundary>
      <ReactFlowProvider>
        <AppContent />
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}

export default App 