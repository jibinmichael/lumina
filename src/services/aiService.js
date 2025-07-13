/**
 * AI Synthesis Service for Lumina Notes
 * Silent cognitive engine that synthesizes user content without adding new ideas
 */

import OpenAI from 'openai'

// Lazy load system prompt to avoid module loading issues
let systemPrompt = null
const loadSystemPrompt = async () => {
  if (!systemPrompt) {
    const module = await import('../../ai-system-prompt.js')
    systemPrompt = module.default
  }
  return systemPrompt
}

class AIService {
  constructor() {
    this.openai = null
    this.isInitialized = false
    this.apiKey = null
    this.synthesisInProgress = false
    this.debounceTimer = null
    this.debounceDelay = 3000 // 3 seconds as specified
    this.lastSynthesisContent = null
    this.nodeContentHistory = new Map() // Track node content changes
  }

  /**
   * Initialize the AI service with API key
   * @param {string} apiKey - OpenAI API key
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(apiKey) {
    try {
      if (!apiKey) {
        console.warn('AI Service: No API key provided')
        return false
      }

      this.apiKey = apiKey
      this.openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      })

      // Test the API key with a simple request
      await this.testApiKey()
      
      this.isInitialized = true
      console.log('AI Service: Successfully initialized')
      return true
    } catch (error) {
      console.error('AI Service: Initialization failed:', error)
      this.isInitialized = false
      return false
    }
  }

  /**
   * Test the API key with a simple request
   * @private
   */
  async testApiKey() {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      })
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('Invalid API response')
      }
      
      console.log('AI Service: API key test successful')
    } catch (error) {
      console.error('AI Service: API key test failed:', error)
      throw new Error('Invalid API key or API error')
    }
  }

  /**
   * Process node changes and trigger synthesis
   * @param {Array} nodes - Current nodes
   * @param {Array} edges - Current edges
   * @param {Function} callback - Callback function for synthesis result
   */
  async processNodeChanges(nodes, edges, callback) {
    if (!this.isInitialized) {
      console.warn('AI Service: Not initialized')
      callback('', new Error('AI Service not initialized'))
      return
    }

    if (this.synthesisInProgress) {
      console.log('AI Service: Synthesis already in progress, skipping')
      return
    }

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // Set up debounced synthesis
    this.debounceTimer = setTimeout(async () => {
      try {
        this.synthesisInProgress = true
        
        const synthesis = await this.synthesizeNodes(nodes, edges)
        
        // Store content for comparison
        this.lastSynthesisContent = synthesis
        
        callback(synthesis, null)
      } catch (error) {
        console.error('AI Service: Synthesis failed:', error)
        callback('', error)
      } finally {
        this.synthesisInProgress = false
      }
    }, this.debounceDelay)
  }

  /**
   * Synthesize nodes using OpenAI
   * @param {Array} nodes - Current nodes
   * @param {Array} edges - Current edges
   * @returns {Promise<string>} - Synthesis result
   * @private
   */
  async synthesizeNodes(nodes, edges) {
    if (!nodes || nodes.length === 0) {
      return ''
    }

    try {
      // Get system prompt
      const prompt = await loadSystemPrompt()
      
      // Prepare node content for synthesis
      const nodeContent = this.prepareNodeContent(nodes, edges)
      
      if (!nodeContent.trim()) {
        return ''
      }

      // Create synthesis request
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: nodeContent }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from OpenAI')
      }

      const synthesis = response.choices[0].message.content.trim()
      console.log('AI Service: Synthesis completed')
      return synthesis
    } catch (error) {
      console.error('AI Service: Synthesis error:', error)
      throw error
    }
  }

  /**
   * Prepare node content for synthesis
   * @param {Array} nodes - Current nodes
   * @param {Array} edges - Current edges
   * @returns {string} - Formatted node content
   * @private
   */
  prepareNodeContent(nodes, edges) {
    if (!nodes || nodes.length === 0) {
      return ''
    }

    const nodeMap = new Map()
    nodes.forEach(node => {
      nodeMap.set(node.id, node)
    })

    let content = 'Current thinking canvas:\n\n'
    
    // Add node content with IDs
    nodes.forEach((node, index) => {
      const nodeId = `N${String(index + 1).padStart(3, '0')}`
      const nodeData = node.data || {}
      const nodeContent = nodeData.content || nodeData.text || ''
      
      if (nodeContent.trim()) {
        content += `${nodeId}: ${nodeContent.trim()}\n\n`
      }
    })

    // Add connection information if edges exist
    if (edges && edges.length > 0) {
      content += '\nConnections:\n'
      edges.forEach(edge => {
        const sourceNode = nodeMap.get(edge.source)
        const targetNode = nodeMap.get(edge.target)
        
        if (sourceNode && targetNode) {
          const sourceIndex = nodes.findIndex(n => n.id === edge.source)
          const targetIndex = nodes.findIndex(n => n.id === edge.target)
          
          if (sourceIndex !== -1 && targetIndex !== -1) {
            const sourceId = `N${String(sourceIndex + 1).padStart(3, '0')}`
            const targetId = `N${String(targetIndex + 1).padStart(3, '0')}`
            content += `${sourceId} → ${targetId}\n`
          }
        }
      })
    }

    return content
  }

  /**
   * Get current synthesis status
   * @returns {boolean} - Whether synthesis is in progress
   */
  isSynthesizing() {
    return this.synthesisInProgress
  }

  /**
   * Get last synthesis content
   * @returns {string} - Last synthesis content
   */
  getLastSynthesis() {
    return this.lastSynthesisContent || ''
  }

  /**
   * Update API key
   * @param {string} newApiKey - New OpenAI API key
   * @returns {Promise<boolean>} - Success status
   */
  async updateApiKey(newApiKey) {
    return await this.initialize(newApiKey)
  }

  /**
   * Clear synthesis history
   */
  clearHistory() {
    this.nodeContentHistory.clear()
    this.lastSynthesisContent = null
  }

  /**
   * Get synthesis statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      synthesisInProgress: this.synthesisInProgress,
      hasApiKey: !!this.apiKey,
      lastSynthesisLength: this.lastSynthesisContent ? this.lastSynthesisContent.length : 0
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    
    this.openai = null
    this.isInitialized = false
    this.synthesisInProgress = false
    this.nodeContentHistory.clear()
    this.lastSynthesisContent = null
    
    console.log('AI Service: Destroyed')
  }
}

// Export singleton instance
export const aiService = new AIService()
export default aiService 