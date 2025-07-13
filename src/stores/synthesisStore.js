import aiService from '../services/aiService.js'

// Configuration
const SYNTHESIS_CONFIG = {
  STORAGE_PREFIX: 'lumina_synthesis_',
  DEBOUNCE_DELAY: 500, // 500ms as per tech guidelines
  MIN_NODES_FOR_SYNTHESIS: 2
}

class SynthesisStore {
  constructor() {
    this.synthesis = new Map() // boardId -> synthesis content
    this.status = new Map() // boardId -> status
    this.errors = new Map() // boardId -> error message
    this.debounceTimers = new Map() // boardId -> timer
    this.listeners = new Set()
    this.isEnabled = true
  }

  // Add listener for synthesis updates
  addListener(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  // Notify all listeners
  notifyListeners(boardId, event) {
    this.listeners.forEach(callback => {
      try {
        callback({ boardId, event, synthesis: this.getSynthesis(boardId) })
      } catch (error) {
        console.error('Synthesis listener error:', error)
      }
    })
  }

  // Get synthesis for a board
  getSynthesis(boardId) {
    return {
      content: this.synthesis.get(boardId) || '',
      status: this.status.get(boardId) || 'idle',
      error: this.errors.get(boardId) || null,
      enabled: this.isEnabled
    }
  }

  // Load synthesis from storage
  loadSynthesis(boardId) {
    try {
      const stored = localStorage.getItem(`${SYNTHESIS_CONFIG.STORAGE_PREFIX}${boardId}`)
      if (stored) {
        const data = JSON.parse(stored)
        this.synthesis.set(boardId, data.content || '')
        return true
      }
    } catch (error) {
      console.error('Failed to load synthesis:', error)
    }
    return false
  }

  // Save synthesis to storage
  saveSynthesis(boardId) {
    try {
      const content = this.synthesis.get(boardId) || ''
      localStorage.setItem(
        `${SYNTHESIS_CONFIG.STORAGE_PREFIX}${boardId}`,
        JSON.stringify({ content, timestamp: Date.now() })
      )
    } catch (error) {
      console.error('Failed to save synthesis:', error)
    }
  }

  // Update synthesis for a board (debounced)
  async updateSynthesis(boardId, nodes) {
    if (!this.isEnabled || !boardId || !nodes) {
      return
    }

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(boardId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Check if we have minimum nodes
    const nodesWithContent = nodes.filter(node => node.data?.content?.trim())
    if (nodesWithContent.length < SYNTHESIS_CONFIG.MIN_NODES_FOR_SYNTHESIS) {
      this.synthesis.set(boardId, '')
      this.status.set(boardId, 'idle')
      this.notifyListeners(boardId, 'updated')
      return
    }

    // Set processing status immediately
    this.status.set(boardId, 'processing')
    this.notifyListeners(boardId, 'processing')

    // Debounce the actual synthesis
    const timer = setTimeout(async () => {
      await this.performSynthesis(boardId, nodes)
    }, SYNTHESIS_CONFIG.DEBOUNCE_DELAY)

    this.debounceTimers.set(boardId, timer)
  }

  // Perform the actual synthesis
  async performSynthesis(boardId, nodes) {
    try {
      // Check if AI service is initialized
      if (!aiService.isInitialized) {
        if (!aiService.hasApiKey()) {
          this.status.set(boardId, 'error')
          this.errors.set(boardId, 'No API key configured')
          this.notifyListeners(boardId, 'error')
          return
        }
        
        const initResult = aiService.initialize()
        if (!initResult.success) {
          this.status.set(boardId, 'error')
          this.errors.set(boardId, initResult.error)
          this.notifyListeners(boardId, 'error')
          return
        }
      }

      // Generate synthesis
      const result = await aiService.generateSynthesis(nodes)
      
      if (result.success) {
        this.synthesis.set(boardId, result.synthesis)
        this.status.set(boardId, 'success')
        this.errors.delete(boardId)
        this.saveSynthesis(boardId)
        this.notifyListeners(boardId, 'updated')
      } else {
        this.status.set(boardId, 'error')
        this.errors.set(boardId, result.error)
        this.notifyListeners(boardId, 'error')
      }
    } catch (error) {
      console.error('Synthesis error:', error)
      this.status.set(boardId, 'error')
      this.errors.set(boardId, error.message)
      this.notifyListeners(boardId, 'error')
    }
  }

  // Force refresh synthesis
  async refreshSynthesis(boardId, nodes) {
    // Clear debounce timer
    const existingTimer = this.debounceTimers.get(boardId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Perform synthesis immediately
    this.status.set(boardId, 'processing')
    this.notifyListeners(boardId, 'processing')
    await this.performSynthesis(boardId, nodes)
  }

  // Clear synthesis for a board
  clearSynthesis(boardId) {
    this.synthesis.delete(boardId)
    this.status.delete(boardId)
    this.errors.delete(boardId)
    
    // Clear from storage
    try {
      localStorage.removeItem(`${SYNTHESIS_CONFIG.STORAGE_PREFIX}${boardId}`)
    } catch (error) {
      console.error('Failed to clear synthesis:', error)
    }
    
    this.notifyListeners(boardId, 'cleared')
  }

  // Enable/disable synthesis
  setEnabled(enabled) {
    this.isEnabled = enabled
    this.listeners.forEach(callback => {
      try {
        callback({ event: 'enabledChanged', enabled })
      } catch (error) {
        console.error('Synthesis listener error:', error)
      }
    })
  }

  // Clean up
  cleanup() {
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
    
    // Clear listeners
    this.listeners.clear()
  }
}

// Export singleton instance
const synthesisStore = new SynthesisStore()
export default synthesisStore 