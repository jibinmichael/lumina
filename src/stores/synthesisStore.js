/**
 * Synthesis Store for Lumina Notes AI Engine
 * Manages AI synthesis state and integrates with boardStore
 */

import aiService from '../services/aiService.js'
import { boardStore } from './boardStore.js'

class SynthesisStore {
  constructor() {
    this.isInitialized = false
    this.currentSynthesis = '' // Current synthesis content
    this.synthesisHistory = new Map() // Board ID -> synthesis content
    this.synthesisStatus = 'inactive' // inactive, processing, completed, error
    this.lastError = null
    this.changeListeners = new Set()
    this.apiKey = null
    this.isEnabled = false
    
    // Settings
    this.settings = {
      autoSynthesis: true,
      synthesisDelay: 3000,
      maxSynthesisLength: 2000,
      saveToStorage: true
    }
    
    // Bind methods
    this.handleSynthesisUpdate = this.handleSynthesisUpdate.bind(this)
  }

  /**
   * Initialize the synthesis store
   * @param {string} apiKey - OpenAI API key
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(apiKey) {
    try {
      if (!apiKey) {
        console.warn('Synthesis Store: No API key provided')
        return false
      }

      this.apiKey = apiKey
      
      // Initialize AI service
      const aiInitialized = await aiService.initialize(apiKey)
      
      if (!aiInitialized) {
        throw new Error('AI Service initialization failed')
      }

      // Load synthesis history from storage
      await this.loadSynthesisHistory()
      
      // Set up board store listener
      this.setupBoardStoreListener()
      
      this.isInitialized = true
      this.isEnabled = true
      
      console.log('Synthesis Store: Successfully initialized')
      this.notifyListeners('initialized')
      
      return true
    } catch (error) {
      console.error('Synthesis Store: Initialization failed:', error)
      this.lastError = error.message
      this.synthesisStatus = 'error'
      this.notifyListeners('error', { error: error.message })
      return false
    }
  }

  /**
   * Set up listener for board store changes
   * @private
   */
  setupBoardStoreListener() {
    // Listen for board changes
    boardStore.addChangeListener((event, data) => {
      if (event === 'boardSwitched') {
        this.handleBoardSwitch(data.boardId)
      } else if (event === 'nodesChanged') {
        this.handleNodesChange(data.nodes, data.edges)
      }
    })
  }

  /**
   * Handle board switch - load synthesis for new board
   * @param {string} boardId - Board ID
   * @private
   */
  handleBoardSwitch(boardId) {
    if (!this.isInitialized || !this.isEnabled) return

    // Load synthesis for this board
    const boardSynthesis = this.synthesisHistory.get(boardId) || ''
    this.currentSynthesis = boardSynthesis
    
    console.log(`Synthesis Store: Switched to board ${boardId}`)
    this.notifyListeners('synthesisChanged', { synthesis: boardSynthesis })
  }

  /**
   * Handle nodes change - trigger synthesis
   * @param {Array} nodes - Current nodes
   * @param {Array} edges - Current edges
   * @private
   */
  handleNodesChange(nodes, edges) {
    if (!this.isInitialized || !this.isEnabled) return
    if (!this.settings.autoSynthesis) return

    // Update status
    this.synthesisStatus = 'processing'
    this.notifyListeners('statusChanged', { status: 'processing' })

    // Trigger AI synthesis
    aiService.processNodeChanges(nodes, edges, this.handleSynthesisUpdate)
  }

  /**
   * Handle synthesis update from AI service
   * @param {string} synthesis - Generated synthesis
   * @param {Error} error - Error if any
   * @private
   */
  handleSynthesisUpdate(synthesis, error) {
    if (error) {
      this.synthesisStatus = 'error'
      this.lastError = error.message
      console.error('Synthesis Store: Synthesis failed:', error)
      this.notifyListeners('error', { error: error.message })
      return
    }

    // Update synthesis
    this.currentSynthesis = synthesis || ''
    this.synthesisStatus = 'completed'
    this.lastError = null

    // Save to history
    const activeBoardId = boardStore.getActiveBoardId()
    if (activeBoardId) {
      this.synthesisHistory.set(activeBoardId, this.currentSynthesis)
      
      // Save to storage
      if (this.settings.saveToStorage) {
        this.saveSynthesisToStorage(activeBoardId, this.currentSynthesis)
      }
    }

    console.log('Synthesis Store: Synthesis updated')
    this.notifyListeners('synthesisChanged', { synthesis: this.currentSynthesis })
    this.notifyListeners('statusChanged', { status: 'completed' })
  }

  /**
   * Get current synthesis
   * @returns {string} - Current synthesis content
   */
  getCurrentSynthesis() {
    return this.currentSynthesis
  }

  /**
   * Get synthesis status
   * @returns {string} - Current status
   */
  getStatus() {
    return this.synthesisStatus
  }

  /**
   * Get last error
   * @returns {string|null} - Last error message
   */
  getLastError() {
    return this.lastError
  }

  /**
   * Check if synthesis is enabled
   * @returns {boolean} - Whether synthesis is enabled
   */
  isEnabled() {
    return this.isEnabled && this.isInitialized
  }

  /**
   * Enable/disable synthesis
   * @param {boolean} enabled - Whether to enable synthesis
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
    this.notifyListeners('enabledChanged', { enabled })
  }

  /**
   * Update settings
   * @param {Object} newSettings - New settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings }
    this.notifyListeners('settingsChanged', { settings: this.settings })
  }

  /**
   * Get current settings
   * @returns {Object} - Current settings
   */
  getSettings() {
    return { ...this.settings }
  }

  /**
   * Manually trigger synthesis
   */
  async triggerSynthesis() {
    if (!this.isInitialized || !this.isEnabled) {
      console.warn('Synthesis Store: Cannot trigger synthesis - not initialized or disabled')
      return
    }

    const activeBoardId = boardStore.getActiveBoardId()
    if (!activeBoardId) {
      console.warn('Synthesis Store: No active board for synthesis')
      return
    }

    const boardData = boardStore.getNodesForBoard(activeBoardId)
    if (!boardData) {
      console.warn('Synthesis Store: No board data for synthesis')
      return
    }

    this.handleNodesChange(boardData.nodes || [], boardData.edges || [])
  }

  /**
   * Clear synthesis for current board
   */
  clearSynthesis() {
    const activeBoardId = boardStore.getActiveBoardId()
    if (activeBoardId) {
      this.synthesisHistory.delete(activeBoardId)
      this.deleteSynthesisFromStorage(activeBoardId)
    }
    
    this.currentSynthesis = ''
    this.synthesisStatus = 'inactive'
    this.lastError = null
    
    this.notifyListeners('synthesisChanged', { synthesis: '' })
    this.notifyListeners('statusChanged', { status: 'inactive' })
  }

  /**
   * Update API key
   * @param {string} newApiKey - New OpenAI API key
   */
  async updateApiKey(newApiKey) {
    this.apiKey = newApiKey
    await this.initialize(newApiKey)
  }

  /**
   * Load synthesis history from storage
   * @private
   */
  async loadSynthesisHistory() {
    try {
      const stored = localStorage.getItem('lumina_synthesis_history')
      if (stored) {
        const parsed = JSON.parse(stored)
        this.synthesisHistory = new Map(Object.entries(parsed))
      }
    } catch (error) {
      console.error('Synthesis Store: Failed to load history:', error)
    }
  }

  /**
   * Save synthesis to storage
   * @param {string} boardId - Board ID
   * @param {string} synthesis - Synthesis content
   * @private
   */
  saveSynthesisToStorage(boardId, synthesis) {
    try {
      const historyObj = Object.fromEntries(this.synthesisHistory.entries())
      localStorage.setItem('lumina_synthesis_history', JSON.stringify(historyObj))
    } catch (error) {
      console.error('Synthesis Store: Failed to save to storage:', error)
    }
  }

  /**
   * Delete synthesis from storage
   * @param {string} boardId - Board ID
   * @private
   */
  deleteSynthesisFromStorage(boardId) {
    try {
      const historyObj = Object.fromEntries(this.synthesisHistory.entries())
      localStorage.setItem('lumina_synthesis_history', JSON.stringify(historyObj))
    } catch (error) {
      console.error('Synthesis Store: Failed to delete from storage:', error)
    }
  }

  /**
   * Add change listener
   * @param {function} listener - Listener function
   */
  addChangeListener(listener) {
    this.changeListeners.add(listener)
  }

  /**
   * Remove change listener
   * @param {function} listener - Listener function
   */
  removeChangeListener(listener) {
    this.changeListeners.delete(listener)
  }

  /**
   * Notify all listeners
   * @param {string} event - Event type
   * @param {Object} data - Event data
   * @private
   */
  notifyListeners(event, data = {}) {
    this.changeListeners.forEach(listener => {
      try {
        listener(event, data)
      } catch (error) {
        console.error('Synthesis Store: Listener error:', error)
      }
    })
  }

  /**
   * Get synthesis for specific board
   * @param {string} boardId - Board ID
   * @returns {string} - Synthesis content
   */
  getSynthesisForBoard(boardId) {
    return this.synthesisHistory.get(boardId) || ''
  }

  /**
   * Get synthesis history
   * @returns {Map} - Synthesis history
   */
  getSynthesisHistory() {
    return new Map(this.synthesisHistory)
  }

  /**
   * Export synthesis data
   * @returns {Object} - Export data
   */
  exportData() {
    return {
      synthesisHistory: Object.fromEntries(this.synthesisHistory.entries()),
      settings: this.settings,
      isEnabled: this.isEnabled
    }
  }

  /**
   * Import synthesis data
   * @param {Object} data - Import data
   */
  importData(data) {
    if (data.synthesisHistory) {
      this.synthesisHistory = new Map(Object.entries(data.synthesisHistory))
    }
    
    if (data.settings) {
      this.settings = { ...this.settings, ...data.settings }
    }
    
    if (typeof data.isEnabled === 'boolean') {
      this.isEnabled = data.isEnabled
    }
    
    this.notifyListeners('dataImported')
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.changeListeners.clear()
    this.synthesisHistory.clear()
    this.isInitialized = false
    this.isEnabled = false
    this.currentSynthesis = ''
    this.synthesisStatus = 'inactive'
    this.lastError = null
    
    // Clean up AI service
    aiService.destroy()
  }
}

// Export singleton instance
export const synthesisStore = new SynthesisStore()
export default synthesisStore 