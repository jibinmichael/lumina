import { useState, useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import aiService from '../services/aiService.js'

// Hook for managing dynamic placeholders
export const useDynamicPlaceholder = (nodeId, nodeType, defaultPlaceholder) => {
  const { getNodes, getEdges } = useReactFlow()
  const [placeholder, setPlaceholder] = useState(defaultPlaceholder)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const lastContentRef = useRef('')
  const timeoutRef = useRef(null)
  const hoverTimeoutRef = useRef(null)

  useEffect(() => {
    // Function to get connected nodes
    const getConnectedNodes = () => {
      const edges = getEdges()
      const nodes = getNodes()
      
      // Find edges connected to this node
      const connectedEdges = edges.filter(edge => 
        edge.target === nodeId || edge.source === nodeId
      )
      
      // Get connected node IDs
      const connectedNodeIds = connectedEdges.map(edge => 
        edge.target === nodeId ? edge.source : edge.target
      )
      
      // Get the actual connected nodes
      return nodes.filter(node => connectedNodeIds.includes(node.id))
    }

    // Function to generate placeholder
    const generatePlaceholder = async () => {
      const node = getNodes().find(n => n.id === nodeId)
      
      // Only generate if node is empty
      if (!node || node.data?.content?.trim()) {
        return
      }

      const connectedNodes = getConnectedNodes()
      
      // Need at least one connected node with content
      if (connectedNodes.length === 0 || !connectedNodes.some(n => n.data?.content?.trim())) {
        return
      }

      // Check if AI service is initialized
      if (!aiService.hasApiKey()) {
        return
      }

      setIsGenerating(true)
      
      try {
        const result = await aiService.generatePlaceholder(nodeType, connectedNodes)
        if (result.success && result.placeholder) {
          setPlaceholder(result.placeholder)
        }
      } catch (error) {
        console.error('Failed to generate placeholder:', error)
      } finally {
        setIsGenerating(false)
      }
    }

    // Debounce placeholder generation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      generatePlaceholder()
    }, 1000) // Wait 1 second after node creation/connection

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [nodeId, nodeType, getNodes, getEdges])

  // Handle hover events
  const handleMouseEnter = () => {
    setIsHovering(true)
    
    // Trigger placeholder generation on hover after a short delay
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    hoverTimeoutRef.current = setTimeout(async () => {
      const node = getNodes().find(n => n.id === nodeId)
      // Only generate if node is empty
      if (node && !node.data?.content?.trim()) {
        // Get connected nodes
        const edges = getEdges()
        const nodes = getNodes()
        const connectedEdges = edges.filter(edge => 
          edge.target === nodeId || edge.source === nodeId
        )
        const connectedNodeIds = connectedEdges.map(edge => 
          edge.target === nodeId ? edge.source : edge.target
        )
        const connectedNodes = nodes.filter(node => connectedNodeIds.includes(node.id))
        
        if (connectedNodes.length > 0 && connectedNodes.some(n => n.data?.content?.trim()) && aiService.hasApiKey()) {
          setIsGenerating(true)
          try {
            const result = await aiService.generatePlaceholder(nodeType, connectedNodes)
            if (result.success && result.placeholder) {
              setPlaceholder(result.placeholder)
            }
          } catch (error) {
            console.error('Failed to generate placeholder on hover:', error)
          } finally {
            setIsGenerating(false)
          }
        }
      }
    }, 300) // 300ms delay before generating on hover
  }
  
  const handleMouseLeave = () => {
    setIsHovering(false)
    
    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return { 
    placeholder, 
    isGenerating, 
    isHovering,
    handleMouseEnter,
    handleMouseLeave
  }
}

export default useDynamicPlaceholder 