/**
 * Auto-Save System for Lumina Notes
 * Real-time data persistence with backup and recovery
 * Handles boards, nodes, preferences, and app state
 */

import storageManager, { DATA_TYPES } from './storageManager.js';
import encryptionManager from './encryption.js';
import userIdentity from './userIdentity.js';

// Auto-save configuration
const AUTO_SAVE_CONFIG = {
  DEBOUNCE_DELAY: 1000, // Wait 1 second after last change
  IMMEDIATE_SAVE_DELAY: 100, // Save critical data immediately
  BATCH_SIZE: 10, // Maximum changes to batch together
  RETRY_ATTEMPTS: 3, // Number of retry attempts for failed saves
  RETRY_DELAY: 2000, // Delay between retry attempts
  HEARTBEAT_INTERVAL: 30000, // Update activity every 30 seconds
  SAVE_QUEUE_LIMIT: 50, // Maximum queued save operations
  CONFLICT_RESOLUTION: 'latest_wins' // Strategy for handling conflicts
};

// Save priority levels
const SAVE_PRIORITY = {
  CRITICAL: 0,    // User preferences, session data
  HIGH: 1,        // Board structure, node content
  MEDIUM: 2,      // App state, UI preferences
  LOW: 3          // Analytics, temporary data
};

// Auto-save manager class
class AutoSaveManager {
  constructor() {
    this.isInitialized = false;
    this.isOnline = navigator.onLine;
    this.saveQueue = new Map();
    this.savingInProgress = new Set();
    this.saveTimers = new Map();
    this.retryTimers = new Map();
    this.heartbeatTimer = null;
    this.changeBuffer = new Map();
    this.lastSaveTimestamps = new Map();
    this.conflictResolver = null;
  }

  // Initialize auto-save system
  async initialize() {
    try {
      // Ensure dependencies are initialized
      if (!storageManager.isInitialized) {
        const result = await storageManager.initialize();
        if (!result.success) {
          throw new Error('Storage manager initialization failed');
        }
      }

      if (!encryptionManager.isInitialized) {
        const result = await encryptionManager.initialize();
        if (!result.success) {
          console.warn('Encryption manager failed to initialize');
        }
      }

      // Set up event listeners
      this.setupEventListeners();
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Process any pending saves from previous session
      await this.processPendingSaves();
      
      this.isInitialized = true;
      console.log('💾 Auto-Save Manager initialized');
      
      return {
        success: true,
        pendingSaves: this.saveQueue.size
      };
    } catch (error) {
      console.error('Failed to initialize auto-save manager:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Set up event listeners for connectivity and page lifecycle
  setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Back online - resuming auto-save');
      this.processQueuedSaves();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Offline - queuing saves for later');
    });

    // Page lifecycle events
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushAllSaves();
      }
    });

    // Before page unload - save everything
    window.addEventListener('beforeunload', (event) => {
      this.flushAllSaves();
      
      // Show warning if there are unsaved changes
      if (this.saveQueue.size > 0 || this.savingInProgress.size > 0) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    });

    // Update activity on user interactions
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        userIdentity.updateLastActivity();
      }, { passive: true });
    });
  }

  // Schedule a save operation
  scheduleAutoSave(dataType, data, options = {}) {
    if (!this.isInitialized) {
      console.warn('Auto-save manager not initialized');
      return false;
    }

    const priority = options.priority || SAVE_PRIORITY.MEDIUM;
    const immediate = options.immediate || false;
    const encrypt = options.encrypt || false;

    // Create save operation
    const saveOperation = {
      id: `${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dataType,
      data: this.deepClone(data),
      priority,
      encrypt,
      timestamp: Date.now(),
      attempts: 0,
      ...options
    };

    // Add to change buffer for batching
    this.addToChangeBuffer(saveOperation);

    if (immediate || priority === SAVE_PRIORITY.CRITICAL) {
      // Save immediately for critical data
      this.performSave(saveOperation);
    } else {
      // Schedule debounced save
      this.scheduleDebouncedSave(dataType, priority);
    }

    console.log(`📝 Scheduled auto-save for ${dataType} (priority: ${priority})`);
    return saveOperation.id;
  }

  // Add operation to change buffer for batching
  addToChangeBuffer(saveOperation) {
    const bufferKey = `${saveOperation.dataType}_${saveOperation.priority}`;
    
    if (!this.changeBuffer.has(bufferKey)) {
      this.changeBuffer.set(bufferKey, []);
    }
    
    const buffer = this.changeBuffer.get(bufferKey);
    buffer.push(saveOperation);
    
    // Limit buffer size
    if (buffer.length > AUTO_SAVE_CONFIG.BATCH_SIZE) {
      buffer.shift(); // Remove oldest operation
    }
  }

  // Schedule debounced save
  scheduleDebouncedSave(dataType, priority) {
    const timerKey = `${dataType}_${priority}`;
    
    // Clear existing timer
    if (this.saveTimers.has(timerKey)) {
      clearTimeout(this.saveTimers.get(timerKey));
    }
    
    // Set new timer
    const delay = priority === SAVE_PRIORITY.HIGH ? 
      AUTO_SAVE_CONFIG.IMMEDIATE_SAVE_DELAY : 
      AUTO_SAVE_CONFIG.DEBOUNCE_DELAY;
      
    const timer = setTimeout(() => {
      this.processBatchedSaves(dataType, priority);
      this.saveTimers.delete(timerKey);
    }, delay);
    
    this.saveTimers.set(timerKey, timer);
  }

  // Process batched saves for a specific data type and priority
  async processBatchedSaves(dataType, priority) {
    const bufferKey = `${dataType}_${priority}`;
    const buffer = this.changeBuffer.get(bufferKey);
    
    if (!buffer || buffer.length === 0) {
      return;
    }
    
    // Get the latest operation (most recent data)
    const latestOperation = buffer[buffer.length - 1];
    
    // Clear buffer
    this.changeBuffer.set(bufferKey, []);
    
    // Perform the save
    await this.performSave(latestOperation);
  }

  // Perform the actual save operation
  async performSave(saveOperation) {
    const { id, dataType, data, encrypt } = saveOperation;
    
    try {
      // Mark as in progress
      this.savingInProgress.add(id);
      
      // Prepare data for storage
      let dataToStore = data;
      
      // Encrypt if required
      if (encrypt && encryptionManager.isInitialized) {
        dataToStore = await encryptionManager.encryptForStorage(data);
      }
      
      // Store data
      const result = await storageManager.store(dataType, dataToStore, {
        autoSave: true,
        timestamp: saveOperation.timestamp,
        priority: saveOperation.priority
      });
      
      if (result.success) {
        // Update last save timestamp
        this.lastSaveTimestamps.set(dataType, Date.now());
        
        console.log(`✅ Auto-saved ${dataType}`, {
          size: result.size,
          compressed: result.compressed,
          encrypted: !!encrypt
        });
        
        // Remove from queue if it was queued
        this.saveQueue.delete(id);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`Failed to auto-save ${dataType}:`, error);
      
      // Handle retry logic
      await this.handleSaveFailure(saveOperation, error);
    } finally {
      // Mark as no longer in progress
      this.savingInProgress.delete(id);
    }
  }

  // Handle save failures with retry logic
  async handleSaveFailure(saveOperation, error) {
    saveOperation.attempts++;
    saveOperation.lastError = error.message;
    
    if (saveOperation.attempts < AUTO_SAVE_CONFIG.RETRY_ATTEMPTS) {
      // Queue for retry
      this.saveQueue.set(saveOperation.id, saveOperation);
      
      // Schedule retry
      const retryDelay = AUTO_SAVE_CONFIG.RETRY_DELAY * Math.pow(2, saveOperation.attempts - 1);
      
      const retryTimer = setTimeout(() => {
        this.performSave(saveOperation);
        this.retryTimers.delete(saveOperation.id);
      }, retryDelay);
      
      this.retryTimers.set(saveOperation.id, retryTimer);
      
      console.log(`🔄 Retrying save for ${saveOperation.dataType} in ${retryDelay}ms (attempt ${saveOperation.attempts})`);
    } else {
      // Max retries exceeded
      console.error(`❌ Max retry attempts exceeded for ${saveOperation.dataType}`);
      
      // Store in failed saves for manual recovery
      this.storeFallbackSave(saveOperation);
    }
  }

  // Store failed saves for manual recovery
  async storeFallbackSave(saveOperation) {
    try {
      const fallbackKey = `fallback_${saveOperation.dataType}_${Date.now()}`;
      localStorage.setItem(fallbackKey, JSON.stringify({
        ...saveOperation,
        fallback: true,
        storedAt: Date.now()
      }));
      
      console.log(`💾 Stored fallback save: ${fallbackKey}`);
    } catch (error) {
      console.error('Failed to store fallback save:', error);
    }
  }

  // Process queued saves (when coming back online)
  async processQueuedSaves() {
    if (this.saveQueue.size === 0) {
      return;
    }
    
    console.log(`🔄 Processing ${this.saveQueue.size} queued saves`);
    
    // Sort by priority and timestamp
    const sortedSaves = Array.from(this.saveQueue.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower number = higher priority
      }
      return a.timestamp - b.timestamp; // Older first
    });
    
    // Process saves sequentially to avoid conflicts
    for (const saveOperation of sortedSaves) {
      await this.performSave(saveOperation);
    }
  }

  // Process pending saves from previous session
  async processPendingSaves() {
    const pendingSaves = [];
    
    // Look for fallback saves in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('fallback_')) {
        try {
          const saveData = JSON.parse(localStorage.getItem(key));
          pendingSaves.push({ key, ...saveData });
        } catch (error) {
          console.warn(`Invalid fallback save data: ${key}`);
          localStorage.removeItem(key);
        }
      }
    }
    
    if (pendingSaves.length > 0) {
      console.log(`🔄 Found ${pendingSaves.length} pending saves from previous session`);
      
      // Process pending saves
      for (const saveData of pendingSaves) {
        try {
          await this.performSave(saveData);
          // Remove from localStorage after successful save
          localStorage.removeItem(saveData.key);
        } catch (error) {
          console.warn(`Failed to process pending save: ${saveData.key}`, error);
        }
      }
    }
  }

  // Flush all pending saves immediately
  async flushAllSaves() {
    console.log('🚀 Flushing all pending saves...');
    
    // Clear all timers
    this.saveTimers.forEach(timer => clearTimeout(timer));
    this.saveTimers.clear();
    
    // Process all buffered changes
    for (const [bufferKey, buffer] of this.changeBuffer.entries()) {
      if (buffer.length > 0) {
        const latestOperation = buffer[buffer.length - 1];
        await this.performSave(latestOperation);
      }
    }
    
    // Clear buffer
    this.changeBuffer.clear();
    
    // Process queued saves
    await this.processQueuedSaves();
    
    console.log('✅ All saves flushed');
  }

  // Start heartbeat to maintain session activity
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      userIdentity.updateLastActivity();
      
      // Auto-save app state periodically
      this.scheduleAutoSave('APP_STATE', {
        lastHeartbeat: Date.now(),
        sessionId: userIdentity.getCurrentUser()?.sessionId
      }, {
        priority: SAVE_PRIORITY.LOW
      });
    }, AUTO_SAVE_CONFIG.HEARTBEAT_INTERVAL);
  }

  // Get auto-save statistics
  getStatistics() {
    return {
      isInitialized: this.isInitialized,
      isOnline: this.isOnline,
      queuedSaves: this.saveQueue.size,
      savesInProgress: this.savingInProgress.size,
      pendingTimers: this.saveTimers.size,
      bufferedChanges: Array.from(this.changeBuffer.values()).reduce((sum, buffer) => sum + buffer.length, 0),
      lastSaveTimestamps: Object.fromEntries(this.lastSaveTimestamps),
      totalRetries: Array.from(this.saveQueue.values()).reduce((sum, op) => sum + op.attempts, 0)
    };
  }

  // Recovery operations
  async recoverData(dataType, options = {}) {
    try {
      console.log(`🔄 Attempting data recovery for ${dataType}`);
      
      // Try to restore from backup
      const backupResult = await storageManager.restoreFromBackup(dataType, options.backupIndex || 0);
      
      if (backupResult.success) {
        console.log(`✅ Successfully recovered ${dataType} from backup`);
        return backupResult;
      }
      
      // Try to find fallback saves
      const fallbackSaves = this.findFallbackSaves(dataType);
      if (fallbackSaves.length > 0) {
        const latestFallback = fallbackSaves[0];
        console.log(`🔄 Attempting recovery from fallback save`);
        
        await this.performSave(latestFallback);
        return { success: true, source: 'fallback' };
      }
      
      throw new Error('No recovery options available');
    } catch (error) {
      console.error(`Failed to recover ${dataType}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Find fallback saves for a data type
  findFallbackSaves(dataType) {
    const fallbackSaves = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`fallback_${dataType}_`)) {
        try {
          const saveData = JSON.parse(localStorage.getItem(key));
          fallbackSaves.push({ key, ...saveData });
        } catch (error) {
          console.warn(`Invalid fallback save: ${key}`);
        }
      }
    }
    
    // Sort by timestamp (newest first)
    return fallbackSaves.sort((a, b) => b.storedAt - a.storedAt);
  }

  // Utility method for deep cloning
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  // Cleanup resources
  destroy() {
    // Clear all timers
    this.saveTimers.forEach(timer => clearTimeout(timer));
    this.saveTimers.clear();
    
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    // Flush any remaining saves
    this.flushAllSaves();
    
    this.isInitialized = false;
    console.log('💾 Auto-Save Manager destroyed');
  }
}

// Create and export singleton instance
const autoSaveManager = new AutoSaveManager();

export default autoSaveManager;
export { AutoSaveManager, AUTO_SAVE_CONFIG, SAVE_PRIORITY }; 