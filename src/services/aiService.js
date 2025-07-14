import OpenAI from 'openai'
import systemPrompt from '../config/aiSystemPrompt.js'
import API_CONFIG from '../config/apiConfig.js'
import debugLogger from '../utils/debugLogger.js'

// Configuration
const AI_SERVICE_CONFIG = {
  MODEL: 'gpt-4o',
  MAX_TOKENS: 500,
  TEMPERATURE: 0.3,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 10,
  DEBOUNCE_DELAY: 500
}

class AIService {
  constructor() {
    this.openai = null
    this.isInitialized = false
    this.requestCount = 0
    this.requestTimestamps = []
    this.lastError = null
  }

  // Initialize with embedded API key
  initialize() {
    try {
      // Check if API key is configured
      if (!API_CONFIG.IS_CONFIGURED || !API_CONFIG.OPENAI_API_KEY || API_CONFIG.OPENAI_API_KEY === 'sk-YOUR-API-KEY-HERE') {
        this.lastError = 'API key not configured. Please update src/config/apiConfig.js'
        return { success: false, error: 'API key not configured' }
      }

      // Initialize OpenAI client with embedded key
      this.openai = new OpenAI({
        apiKey: API_CONFIG.OPENAI_API_KEY,
        dangerouslyAllowBrowser: true // Required for browser usage
      })

      this.isInitialized = true
      this.lastError = null

      return { success: true }
    } catch (error) {
      console.error('Failed to initialize AI service:', error)
      this.lastError = error.message
      return { success: false, error: error.message }
    }
  }

  // Check if we're within rate limits
  checkRateLimit() {
    const now = Date.now()
    
    // Remove timestamps outside the window
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < AI_SERVICE_CONFIG.RATE_LIMIT_WINDOW
    )

    // Check if we've exceeded the limit
    if (this.requestTimestamps.length >= AI_SERVICE_CONFIG.MAX_REQUESTS_PER_WINDOW) {
      const oldestTimestamp = this.requestTimestamps[0]
      const waitTime = AI_SERVICE_CONFIG.RATE_LIMIT_WINDOW - (now - oldestTimestamp)
      return { allowed: false, waitTime }
    }

    return { allowed: true }
  }

  // Generate sidebar synthesis
  async generateSynthesis(nodes) {
    if (!this.isInitialized) {
      return { success: false, error: 'AI service not initialized' }
    }

    // Check rate limit
    const rateCheck = this.checkRateLimit()
    if (!rateCheck.allowed) {
      return { 
        success: false, 
        error: `Rate limit exceeded. Please wait ${Math.ceil(rateCheck.waitTime / 1000)} seconds.` 
      }
    }

    try {
      // Filter nodes with content
      const nodesWithContent = nodes.filter(node => node.data?.content?.trim())
      
      if (nodesWithContent.length === 0) {
        return { success: true, synthesis: '' }
      }

      // Prepare node data for AI
      const nodeData = nodesWithContent.map(node => {
        const fullContent = node.data.content
        let snippet = fullContent
        if (fullContent.length > 200) {
          // Try to extract the first sentence, or fallback to first 100 chars
          const firstSentenceMatch = fullContent.match(/^(.*?[.!?])\s/)
          if (firstSentenceMatch && firstSentenceMatch[1].length <= 120) {
            snippet = firstSentenceMatch[1]
          } else {
            snippet = fullContent.slice(0, 100) + '...'
          }
        }
        return {
          id: node.data.refId || node.id,
          type: node.type,
          content: snippet,
          timestamp: node.data.timestamp || Date.now()
        }
      })

      // Make API call
      this.requestTimestamps.push(Date.now())
      const startTime = Date.now()
      
      const completion = await this.openai.chat.completions.create({
        model: AI_SERVICE_CONFIG.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Synthesize these nodes into a structured summary. Each node has an ID that MUST be referenced in your synthesis (e.g., "See: N001" or "(N002, N003)"):\n${JSON.stringify(nodeData, null, 2)}` 
          }
        ],
        temperature: AI_SERVICE_CONFIG.TEMPERATURE,
        max_tokens: AI_SERVICE_CONFIG.MAX_TOKENS
      })

      const synthesis = completion.choices[0]?.message?.content || ''
      const duration = Date.now() - startTime
      
      // Log synthesis operation
      debugLogger.logSynthesis(null, nodes, synthesis, duration)
      
      this.lastError = null
      
      return { success: true, synthesis }
    } catch (error) {
      console.error('AI synthesis error:', error)
      this.lastError = error.message
      
      // Log error
      debugLogger.logError('generateSynthesis', error, { nodeCount: nodes.length })
      
      // Handle specific OpenAI errors
      if (error.status === 401) {
        return { success: false, error: 'Invalid API key. Please check your settings.' }
      } else if (error.status === 429) {
        return { success: false, error: 'OpenAI rate limit exceeded. Please try again later.' }
      } else if (error.status === 500) {
        return { success: false, error: 'OpenAI service error. Please try again.' }
      }
      
      return { success: false, error: error.message || 'Failed to generate synthesis' }
    }
  }

  // Generate contextual placeholder for empty nodes
  async generatePlaceholder(nodeType, connectedNodes) {
    if (!this.isInitialized) {
      return { success: false, error: 'AI service not initialized' }
    }

    // Check rate limit
    const rateCheck = this.checkRateLimit()
    if (!rateCheck.allowed) {
      return { success: false, placeholder: '' }
    }

    try {
      // Prepare context from connected nodes
      const context = connectedNodes
        .filter(node => node.data?.content?.trim())
        .map(node => ({
          type: node.type,
          content: node.data.content
        }))

      if (context.length === 0) {
        return { success: true, placeholder: '' }
      }

      // Make API call
      this.requestTimestamps.push(Date.now())
      
      const completion = await this.openai.chat.completions.create({
        model: AI_SERVICE_CONFIG.MODEL,
        messages: [
          { 
            role: 'system', 
            content: 'You generate helpful next-step placeholders. NEVER repeat, just nudge forward. Be specific and actionable.' 
          },
          { 
            role: 'user', 
            content: `Generate a placeholder for a ${nodeType} node connected to:\n${JSON.stringify(context, null, 2)}` 
          }
        ],
        temperature: 0.5,
        max_tokens: 50
      })

      const placeholder = completion.choices[0]?.message?.content || ''
      
      // Log placeholder generation
      debugLogger.logPlaceholder(nodeType, nodeType, context, placeholder)
      
      return { success: true, placeholder }
    } catch (error) {
      console.error('Placeholder generation error:', error)
      debugLogger.logError('generatePlaceholder', error, { nodeType })
      // Fail silently for placeholders
      return { success: false, placeholder: '' }
    }
  }

  // Check if API key is configured
  hasApiKey() {
    return API_CONFIG.IS_CONFIGURED && API_CONFIG.OPENAI_API_KEY && API_CONFIG.OPENAI_API_KEY !== 'sk-YOUR-API-KEY-HERE'
  }

  // Get last error
  getLastError() {
    return this.lastError
  }
}

// Export singleton instance
const aiService = new AIService()
export default aiService 