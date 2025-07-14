import aiService from '../services/aiService.js'

// Configuration
const SYNTHESIS_CONFIG = {
  STORAGE_PREFIX: 'lumina_synthesis_',
  DEBOUNCE_DELAY: 500, // 500ms as per tech guidelines
  MIN_NODES_FOR_SYNTHESIS: 2,
  COMPLETION_WAIT_TIME: 10000, // 10 seconds of inactivity to consider "completion"
  MIN_NODES_FOR_COMPLETION: 3 // Minimum nodes to consider a journey complete
}

class SynthesisStore {
  constructor() {
    this.synthesis = new Map() // boardId -> synthesis content
    this.status = new Map() // boardId -> status
    this.errors = new Map() // boardId -> error message
    this.debounceTimers = new Map() // boardId -> timer
    this.completionTimers = new Map() // boardId -> completion timer
    this.lastActivity = new Map() // boardId -> last activity timestamp
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

  // Update synthesis for a board (wait for completion approach)
  async updateSynthesis(boardId, nodes) {
    if (!this.isEnabled || !boardId || !nodes) {
      return
    }

    // Clear existing timers
    const existingTimer = this.debounceTimers.get(boardId)
    const existingCompletionTimer = this.completionTimers.get(boardId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    if (existingCompletionTimer) {
      clearTimeout(existingCompletionTimer)
    }

    // Check if we have minimum nodes
    const nodesWithContent = nodes.filter(node => node.data?.content?.trim())
    if (nodesWithContent.length < SYNTHESIS_CONFIG.MIN_NODES_FOR_SYNTHESIS) {
      this.synthesis.set(boardId, '')
      this.status.set(boardId, 'idle')
      this.notifyListeners(boardId, 'updated')
      return
    }

    // Update last activity
    this.lastActivity.set(boardId, Date.now())

    // Check if we have enough nodes for a complete journey
    if (nodesWithContent.length >= SYNTHESIS_CONFIG.MIN_NODES_FOR_COMPLETION) {
      // Set up completion timer - wait for user to finish their work
      const completionTimer = setTimeout(async () => {
        await this.performJourneySynthesis(boardId, nodes)
      }, SYNTHESIS_CONFIG.COMPLETION_WAIT_TIME)

      this.completionTimers.set(boardId, completionTimer)
      
      // Set status to waiting for completion
      this.status.set(boardId, 'waiting')
      this.notifyListeners(boardId, 'waiting')
    } else {
      // For smaller sets, use traditional debounced approach
      this.status.set(boardId, 'processing')
      this.notifyListeners(boardId, 'processing')

      const timer = setTimeout(async () => {
        await this.performJourneySynthesis(boardId, nodes)
      }, SYNTHESIS_CONFIG.DEBOUNCE_DELAY)

      this.debounceTimers.set(boardId, timer)
    }
  }

  // Perform journey synthesis (new approach)
  async performJourneySynthesis(boardId, nodes) {
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

      // Check if user is still active
      const lastActivity = this.lastActivity.get(boardId) || 0
      const timeSinceActivity = Date.now() - lastActivity
      
      // If user has been active recently, don't generate synthesis yet
      if (timeSinceActivity < SYNTHESIS_CONFIG.COMPLETION_WAIT_TIME) {
        console.log('User still active, waiting for completion...')
        return
      }

      // Generate journey pathway
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
      console.error('Journey synthesis error:', error)
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
    this.completionTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
    this.completionTimers.clear()
    
    // Clear listeners
    this.listeners.clear()
  }
}

// Export singleton instance
const synthesisStore = new SynthesisStore()
export default synthesisStore 