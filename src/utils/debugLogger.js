/**
 * Debug Logger for Lumina Notes AI System
 * Tracks synthesis operations and node mappings
 */

class DebugLogger {
  constructor() {
    this.isEnabled = false // Disabled by default, enable via console
    this.logs = []
    this.maxLogs = 100 // Keep last 100 logs in memory
    
    // Make available in browser console for debugging
    if (typeof window !== 'undefined') {
      window.luminaDebug = this
    }
  }

  // Enable/disable logging
  setEnabled(enabled) {
    this.isEnabled = enabled
    console.log(`🔧 Lumina debug logging ${enabled ? 'enabled' : 'disabled'}`)
  }

  // Log synthesis operation
  logSynthesis(boardId, nodes, synthesis, duration) {
    if (!this.isEnabled) return

    const log = {
      type: 'synthesis',
      timestamp: new Date().toISOString(),
      boardId,
      nodeCount: nodes.length,
      nodesWithContent: nodes.filter(n => n.data?.content?.trim()).length,
      nodeIds: nodes.map(n => n.data?.refId || n.id),
      synthesisLength: synthesis.length,
      duration,
      preview: synthesis.substring(0, 100) + '...'
    }

    this.addLog(log)
    console.log('📊 Synthesis:', log)
  }

  // Log placeholder generation
  logPlaceholder(nodeId, nodeType, connectedNodes, placeholder) {
    if (!this.isEnabled) return

    const log = {
      type: 'placeholder',
      timestamp: new Date().toISOString(),
      nodeId,
      nodeType,
      connectedNodeCount: connectedNodes.length,
      connectedNodeIds: connectedNodes.map(n => n.data?.refId || n.id),
      placeholderGenerated: !!placeholder,
      placeholderPreview: placeholder ? placeholder.substring(0, 50) + '...' : null
    }

    this.addLog(log)
    console.log('💭 Placeholder:', log)
  }

  // Log API errors
  logError(operation, error, context) {
    // Always log errors, even when debug is disabled
    const log = {
      type: 'error',
      timestamp: new Date().toISOString(),
      operation,
      error: error.message || error,
      context
    }

    this.addLog(log)
    console.error('❌ AI Error:', log)
  }

  // Log node updates
  logNodeUpdate(nodeId, refId, content, timestamp) {
    if (!this.isEnabled) return

    const log = {
      type: 'nodeUpdate',
      timestamp: new Date().toISOString(),
      nodeId,
      refId,
      contentLength: content?.length || 0,
      hasContent: !!content?.trim(),
      nodeTimestamp: timestamp
    }

    this.addLog(log)
    console.log('✏️ Node update:', log)
  }

  // Add log to memory
  addLog(log) {
    this.logs.push(log)
    
    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  // Get all logs
  getLogs(type = null) {
    if (type) {
      return this.logs.filter(log => log.type === type)
    }
    return this.logs
  }

  // Clear logs
  clearLogs() {
    this.logs = []
    console.log('🧹 Debug logs cleared')
  }

  // Export logs as JSON
  exportLogs() {
    const data = JSON.stringify(this.logs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lumina-debug-logs-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    console.log('📥 Logs exported')
  }
}

// Export singleton instance
const debugLogger = new DebugLogger()
export default debugLogger 