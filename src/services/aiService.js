/**
 * AI Synthesis Service for Lumina Notes
 * Silent cognitive engine that synthesizes user content without adding new ideas
 */

import OpenAI from 'openai'
import systemPrompt from '../../ai-system-prompt.js'

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
        dangerouslyAllowBrowser: true // For client-side usage
      })

      // Test the connection
      await this.testConnection()
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
   * Test OpenAI connection
   * @private
   */
  async testConnection() {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
      return response.choices[0].message.content
    } catch (error) {
      throw new Error(`OpenAI connection test failed: ${error.message}`)
    }
  }

  /**
   * Check if AI service is ready
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.openai && this.apiKey
  }

  /**
   * Process node content changes and trigger synthesis
   * @param {Array} nodes - Current nodes array
   * @param {Array} edges - Current edges array
   * @param {function} onSynthesisUpdate - Callback for synthesis updates
   */
  processNodeChanges(nodes, edges, onSynthesisUpdate) {
    if (!this.isReady()) {
      console.warn('AI Service: Not ready for synthesis')
      return
    }

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // Set up debounced synthesis
    this.debounceTimer = setTimeout(async () => {
      await this.synthesizeContent(nodes, edges, onSynthesisUpdate)
    }, this.debounceDelay)
  }

  /**
   * Generate synthesis from node content
   * @param {Array} nodes - Current nodes array
   * @param {Array} edges - Current edges array
   * @param {function} onSynthesisUpdate - Callback for synthesis updates
   * @private
   */
  async synthesizeContent(nodes, edges, onSynthesisUpdate) {
    if (this.synthesisInProgress) {
      console.log('AI Service: Synthesis already in progress, skipping')
      return
    }

    try {
      this.synthesisInProgress = true
      
      // Extract and format node content
      const nodeContent = this.extractNodeContent(nodes)
      
      // Check if content has changed significantly
      if (this.hasContentChanged(nodeContent)) {
        console.log('AI Service: Starting synthesis...')
        
        const synthesis = await this.generateSynthesis(nodeContent, edges)
        
        // Update the last synthesis content
        this.lastSynthesisContent = synthesis
        
        // Call the callback with the synthesis
        if (onSynthesisUpdate && typeof onSynthesisUpdate === 'function') {
          onSynthesisUpdate(synthesis)
        }
        
        console.log('AI Service: Synthesis completed')
      } else {
        console.log('AI Service: No significant content changes, skipping synthesis')
      }
    } catch (error) {
      console.error('AI Service: Synthesis failed:', error)
      
      // Call callback with error state
      if (onSynthesisUpdate && typeof onSynthesisUpdate === 'function') {
        onSynthesisUpdate(null, error)
      }
    } finally {
      this.synthesisInProgress = false
    }
  }

  /**
   * Extract meaningful content from nodes
   * @param {Array} nodes - Current nodes array
   * @returns {Object} - Structured node content
   * @private
   */
  extractNodeContent(nodes) {
    const content = {
      nodes: [],
      totalNodes: nodes.length,
      hasContent: false
    }

    nodes.forEach((node, index) => {
      const nodeInfo = {
        id: `N${String(index + 1).padStart(3, '0')}`, // N001, N002, etc.
        type: node.type,
        title: node.data?.title || '',
        content: node.data?.content || '',
        position: node.position,
        hasContent: false
      }

      // Check if node has meaningful content
      if (nodeInfo.title.trim() || nodeInfo.content.trim()) {
        nodeInfo.hasContent = true
        content.hasContent = true
      }

      content.nodes.push(nodeInfo)
    })

    return content
  }

  /**
   * Check if content has changed significantly
   * @param {Object} newContent - New node content
   * @returns {boolean} - Whether content has changed
   * @private
   */
  hasContentChanged(newContent) {
    if (!this.lastSynthesisContent) return true

    // Simple check - compare content length and basic structure
    const contentString = JSON.stringify(newContent)
    const lastContentString = JSON.stringify(this.nodeContentHistory.get('last') || {})
    
    const hasChanged = contentString !== lastContentString
    
    // Update history
    this.nodeContentHistory.set('last', newContent)
    
    return hasChanged
  }

  /**
   * Generate AI synthesis using OpenAI
   * @param {Object} nodeContent - Extracted node content
   * @param {Array} edges - Current edges array
   * @returns {Promise<string>} - Generated synthesis
   * @private
   */
  async generateSynthesis(nodeContent, edges) {
    if (!nodeContent.hasContent) {
      return '' // Return empty synthesis if no content
    }

    try {
      // Format content for AI
      const formattedContent = this.formatContentForAI(nodeContent, edges)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4', // Use GPT-4 for better synthesis
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: formattedContent
          }
        ],
        max_tokens: 1000,
        temperature: 0.1, // Low temperature for consistency
        stream: false
      })

      const synthesis = response.choices[0].message.content.trim()
      return synthesis

    } catch (error) {
      console.error('AI Service: OpenAI API error:', error)
      throw new Error(`Synthesis generation failed: ${error.message}`)
    }
  }

  /**
   * Format node content for AI processing
   * @param {Object} nodeContent - Extracted node content
   * @param {Array} edges - Current edges array
   * @returns {string} - Formatted content for AI
   * @private
   */
  formatContentForAI(nodeContent, edges) {
    let formatted = 'NODE CONTENT FOR SYNTHESIS:\n\n'

    // Add each node with its content
    nodeContent.nodes.forEach(node => {
      if (node.hasContent) {
        formatted += `${node.id} (${node.type}):\n`
        
        if (node.title.trim()) {
          formatted += `Title: ${node.title.trim()}\n`
        }
        
        if (node.content.trim()) {
          formatted += `Content: ${node.content.trim()}\n`
        }
        
        formatted += '\n'
      }
    })

    // Add connection information if edges exist
    if (edges && edges.length > 0) {
      formatted += 'CONNECTIONS:\n'
      edges.forEach(edge => {
        formatted += `${edge.source} → ${edge.target}\n`
      })
    }

    return formatted
  }

  /**
   * Get current synthesis status
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isReady: this.isReady(),
      synthesisInProgress: this.synthesisInProgress,
      hasApiKey: !!this.apiKey,
      lastSynthesisTime: this.lastSynthesisTime || null
    }
  }

  /**
   * Update API key
   * @param {string} newApiKey - New OpenAI API key
   */
  async updateApiKey(newApiKey) {
    await this.initialize(newApiKey)
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    
    this.openai = null
    this.isInitialized = false
    this.apiKey = null
    this.synthesisInProgress = false
    this.nodeContentHistory.clear()
  }
}

// Export singleton instance
export const aiService = new AIService()
export default aiService 