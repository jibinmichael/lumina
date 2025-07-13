/**
 * Cloud Synchronization System for Lumina Notes
 * Prepares for MongoDB integration with seamless local storage fallback
 * Features: Conflict resolution, migration path, sync status tracking
 */

import storageManager, { DATA_TYPES } from './storageManager.js';
import autoSaveManager, { SAVE_PRIORITY } from './autoSave.js';
import userIdentity from './userIdentity.js';
import encryptionManager from './encryption.js';

// Cloud sync configuration
const CLOUD_SYNC_CONFIG = {
  API_BASE_URL: null, // Will be set when cloud is available
  SYNC_INTERVAL: 5 * 60 * 1000, // Sync every 5 minutes
  BATCH_SYNC_SIZE: 100, // Maximum operations per sync batch
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  CONFLICT_STRATEGY: 'merge', // 'merge', 'local_wins', 'remote_wins', 'prompt_user'
  ENABLE_OFFLINE_QUEUE: true,
  SYNC_TIMEOUT: 30000, // 30 seconds timeout for sync operations
  SCHEMA_VERSION: '1.0.0'
};

// Sync status constants
const SYNC_STATUS = {
  DISABLED: 'disabled',
  PENDING: 'pending',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',
  CONFLICT: 'conflict',
  OFFLINE: 'offline'
};

// Data change tracking
class ChangeTracker {
  constructor() {
    this.pendingChanges = new Map();
    this.lastSyncTimestamps = new Map();
    this.conflictLog = [];
  }

  // Track a data change
  trackChange(dataType, operation, data, metadata = {}) {
    const changeId = this.generateChangeId();
    const change = {
      id: changeId,
      dataType,
      operation, // 'create', 'update', 'delete'
      data: this.cloneData(data),
      metadata,
      timestamp: Date.now(),
      userId: userIdentity.getCurrentUser()?.userId,
      synced: false,
      attempts: 0
    };

    this.pendingChanges.set(changeId, change);
    console.log(`📝 Tracked change: ${operation} ${dataType}`);
    
    return changeId;
  }

  // Get pending changes for sync
  getPendingChanges(dataType = null) {
    const changes = Array.from(this.pendingChanges.values());
    return dataType ? changes.filter(c => c.dataType === dataType) : changes;
  }

  // Mark change as synced
  markSynced(changeId) {
    const change = this.pendingChanges.get(changeId);
    if (change) {
      change.synced = true;
      change.syncedAt = Date.now();
      this.pendingChanges.delete(changeId);
    }
  }

  // Clear synced changes
  clearSyncedChanges() {
    const syncedCount = Array.from(this.pendingChanges.values())
      .filter(change => change.synced).length;
    
    this.pendingChanges = new Map(
      Array.from(this.pendingChanges.entries())
        .filter(([id, change]) => !change.synced)
    );
    
    return syncedCount;
  }

  generateChangeId() {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }
}

// Cloud sync manager
class CloudSyncManager {
  constructor() {
    this.isInitialized = false;
    this.isCloudEnabled = false;
    this.apiEndpoint = null;
    this.changeTracker = new ChangeTracker();
    this.syncStatus = SYNC_STATUS.DISABLED;
    this.syncTimer = null;
    this.lastSyncTime = null;
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsResolved: 0
    };
    this.eventListeners = new Set();
  }

  // Initialize cloud sync system
  async initialize(config = {}) {
    try {
      // Check if cloud sync should be enabled
      const cloudConfig = await this.loadCloudConfiguration();
      
      if (cloudConfig.enabled && cloudConfig.apiEndpoint) {
        this.apiEndpoint = cloudConfig.apiEndpoint;
        this.isCloudEnabled = true;
        this.syncStatus = SYNC_STATUS.PENDING;
        
        // Test connection
        const connectionTest = await this.testCloudConnection();
        if (connectionTest.success) {
          console.log('☁️ Cloud sync enabled and ready');
          this.startPeriodicSync();
        } else {
          console.warn('☁️ Cloud sync configured but connection failed');
          this.syncStatus = SYNC_STATUS.ERROR;
        }
      } else {
        console.log('📱 Running in local-only mode (no cloud configured)');
        this.syncStatus = SYNC_STATUS.DISABLED;
      }

      // Set up change tracking
      this.setupChangeTracking();
      
      this.isInitialized = true;
      this.notifyListeners('initialized');
      
      return {
        success: true,
        cloudEnabled: this.isCloudEnabled,
        status: this.syncStatus
      };
    } catch (error) {
      console.error('Failed to initialize cloud sync:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Load cloud configuration (for future MongoDB setup)
  async loadCloudConfiguration() {
    try {
      // Check for cloud config in preferences
      const result = await storageManager.retrieve(DATA_TYPES.PREFERENCES.key);
      const preferences = result.data || {};
      
      return {
        enabled: preferences.cloudSync?.enabled || false,
        apiEndpoint: preferences.cloudSync?.endpoint || process.env.VITE_CLOUD_API_URL || null,
        encryptionEnabled: preferences.cloudSync?.encryption || true,
        autoSync: preferences.cloudSync?.autoSync !== false
      };
    } catch (error) {
      return { enabled: false };
    }
  }

  // Test cloud connection
  async testCloudConnection() {
    if (!this.apiEndpoint) {
      return { success: false, error: 'No API endpoint configured' };
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/health`, {
        method: 'GET',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userIdentity.getCurrentUser()?.userId
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Set up change tracking with storage hooks
  setupChangeTracking() {
    // Hook into auto-save manager to track changes
    if (autoSaveManager.isInitialized) {
      // We'll track changes through the save operations
      console.log('🔗 Connected change tracking to auto-save system');
    }
  }

  // Prepare data for cloud sync (including migration schema)
  prepareDataForCloud(dataType, data) {
    const user = userIdentity.getCurrentUser();
    
    return {
      // Migration schema for MongoDB
      _schema: {
        version: CLOUD_SYNC_CONFIG.SCHEMA_VERSION,
        dataType,
        migratedFrom: 'localStorage',
        migrationTimestamp: Date.now()
      },
      
      // User identification
      userId: user?.userId,
      userFingerprint: user?.fingerprint,
      
      // Data payload
      data,
      
      // Sync metadata
      syncMeta: {
        localTimestamp: Date.now(),
        deviceId: user?.sessionId,
        appVersion: '1.0.0',
        compressed: false,
        encrypted: false
      }
    };
  }

  // Sync local data to cloud (future MongoDB implementation)
  async syncToCloud(dataType, data, options = {}) {
    if (!this.isCloudEnabled) {
      return { success: false, error: 'Cloud sync not enabled' };
    }

    try {
      this.syncStatus = SYNC_STATUS.SYNCING;
      this.notifyListeners('sync_started', { dataType });

      // Prepare data for cloud
      const cloudData = this.prepareDataForCloud(dataType, data);
      
      // Encrypt if required
      if (options.encrypt && encryptionManager.isInitialized) {
        cloudData.data = await encryptionManager.encryptForStorage(cloudData.data);
        cloudData.syncMeta.encrypted = true;
      }

      // Send to cloud (MongoDB endpoint)
      const response = await fetch(`${this.apiEndpoint}/sync/${dataType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
          'X-User-ID': cloudData.userId,
          'X-Device-ID': cloudData.syncMeta.deviceId
        },
        body: JSON.stringify(cloudData),
        timeout: CLOUD_SYNC_CONFIG.SYNC_TIMEOUT
      });

      if (response.ok) {
        const result = await response.json();
        
        this.syncStatus = SYNC_STATUS.SUCCESS;
        this.lastSyncTime = Date.now();
        this.syncStats.successfulSyncs++;
        
        this.notifyListeners('sync_success', { dataType, result });
        
        return { success: true, cloudId: result.id, version: result.version };
      } else {
        throw new Error(`Cloud sync failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.syncStatus = SYNC_STATUS.ERROR;
      this.syncStats.failedSyncs++;
      
      console.error('Cloud sync error:', error);
      this.notifyListeners('sync_error', { dataType, error: error.message });
      
      return { success: false, error: error.message };
    }
  }

  // Sync from cloud to local (MongoDB to localStorage migration)
  async syncFromCloud(dataType, options = {}) {
    if (!this.isCloudEnabled) {
      return { success: false, error: 'Cloud sync not enabled' };
    }

    try {
      const user = userIdentity.getCurrentUser();
      
      const response = await fetch(`${this.apiEndpoint}/sync/${dataType}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
          'X-User-ID': user?.userId,
          'X-Device-ID': user?.sessionId
        },
        timeout: CLOUD_SYNC_CONFIG.SYNC_TIMEOUT
      });

      if (response.ok) {
        const cloudData = await response.json();
        
        // Check for conflicts
        const localData = await storageManager.retrieve(dataType);
        const conflict = this.detectConflict(localData.data, cloudData.data);
        
        if (conflict) {
          return await this.resolveConflict(dataType, localData.data, cloudData.data);
        }

        // Decrypt if needed
        let syncedData = cloudData.data;
        if (cloudData.syncMeta.encrypted) {
          syncedData = await encryptionManager.decryptFromStorage(syncedData);
        }

        // Store locally
        const storeResult = await storageManager.store(dataType, syncedData);
        
        if (storeResult.success) {
          this.notifyListeners('sync_from_cloud_success', { dataType });
          return { success: true, data: syncedData };
        } else {
          throw new Error('Failed to store synced data locally');
        }
      } else {
        throw new Error(`Failed to fetch from cloud: ${response.status}`);
      }
    } catch (error) {
      console.error('Sync from cloud error:', error);
      return { success: false, error: error.message };
    }
  }

  // Conflict detection and resolution
  detectConflict(localData, cloudData) {
    if (!localData || !cloudData) return false;
    
    const localTimestamp = localData.lastModified || 0;
    const cloudTimestamp = cloudData.lastModified || 0;
    
    // Simple timestamp-based conflict detection
    return Math.abs(localTimestamp - cloudTimestamp) > 1000; // 1 second tolerance
  }

  async resolveConflict(dataType, localData, cloudData) {
    const strategy = CLOUD_SYNC_CONFIG.CONFLICT_STRATEGY;
    
    console.log(`⚠️ Conflict detected for ${dataType}, resolving with strategy: ${strategy}`);
    
    switch (strategy) {
      case 'local_wins':
        return { success: true, resolution: 'local_wins', data: localData };
        
      case 'remote_wins':
        await storageManager.store(dataType, cloudData);
        return { success: true, resolution: 'remote_wins', data: cloudData };
        
      case 'merge':
        const mergedData = await this.mergeData(localData, cloudData);
        await storageManager.store(dataType, mergedData);
        return { success: true, resolution: 'merged', data: mergedData };
        
      case 'prompt_user':
        this.notifyListeners('conflict_detected', { 
          dataType, 
          localData, 
          cloudData,
          resolve: (resolution) => this.resolveUserConflict(dataType, localData, cloudData, resolution)
        });
        return { success: true, resolution: 'user_prompt_pending' };
        
      default:
        return { success: false, error: 'Unknown conflict resolution strategy' };
    }
  }

  // Intelligent data merging
  async mergeData(localData, cloudData) {
    // This is a basic merge - in production you'd want more sophisticated merging
    const merged = { ...localData };
    
    // Merge based on timestamps
    Object.keys(cloudData).forEach(key => {
      if (key === 'lastModified') {
        merged[key] = Math.max(localData[key] || 0, cloudData[key] || 0);
      } else if (Array.isArray(cloudData[key]) && Array.isArray(localData[key])) {
        // Merge arrays by combining and deduplicating
        merged[key] = this.mergeArrays(localData[key], cloudData[key]);
      } else if (typeof cloudData[key] === 'object' && cloudData[key] !== null) {
        // Recursively merge objects
        merged[key] = await this.mergeData(localData[key] || {}, cloudData[key]);
      } else if (!localData[key] || cloudData.lastModified > localData.lastModified) {
        // Use cloud value if local doesn't exist or cloud is newer
        merged[key] = cloudData[key];
      }
    });
    
    merged.lastModified = Date.now(); // Update merge timestamp
    return merged;
  }

  mergeArrays(localArray, cloudArray) {
    const combined = [...localArray, ...cloudArray];
    const unique = combined.filter((item, index, arr) => {
      // Remove duplicates based on id property if available
      if (item.id) {
        return arr.findIndex(i => i.id === item.id) === index;
      }
      return arr.indexOf(item) === index;
    });
    return unique;
  }

  // Start periodic sync
  startPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (this.isCloudEnabled && navigator.onLine) {
        await this.performFullSync();
      }
    }, CLOUD_SYNC_CONFIG.SYNC_INTERVAL);

    console.log(`🔄 Started periodic sync (every ${CLOUD_SYNC_CONFIG.SYNC_INTERVAL / 1000}s)`);
  }

  // Perform full bidirectional sync
  async performFullSync() {
    if (this.syncStatus === SYNC_STATUS.SYNCING) {
      return; // Already syncing
    }

    try {
      console.log('🔄 Starting full sync...');
      this.syncStatus = SYNC_STATUS.SYNCING;
      
      // Sync all data types
      const dataTypes = Object.keys(DATA_TYPES);
      const results = [];
      
      for (const dataType of dataTypes) {
        try {
          // Get local data
          const localResult = await storageManager.retrieve(DATA_TYPES[dataType].key);
          
          if (localResult.success && localResult.data) {
            // Sync to cloud
            const syncResult = await this.syncToCloud(DATA_TYPES[dataType].key, localResult.data);
            results.push({ dataType, success: syncResult.success });
            
            // Sync from cloud (to check for updates)
            if (syncResult.success) {
              await this.syncFromCloud(DATA_TYPES[dataType].key);
            }
          }
        } catch (error) {
          console.error(`Sync failed for ${dataType}:`, error);
          results.push({ dataType, success: false, error: error.message });
        }
      }
      
      this.syncStatus = SYNC_STATUS.SUCCESS;
      this.syncStats.totalSyncs++;
      this.lastSyncTime = Date.now();
      
      console.log('✅ Full sync completed', results);
      this.notifyListeners('full_sync_complete', { results });
      
    } catch (error) {
      this.syncStatus = SYNC_STATUS.ERROR;
      console.error('Full sync failed:', error);
      this.notifyListeners('sync_error', { error: error.message });
    }
  }

  // Get authentication token (for future implementation)
  async getAuthToken() {
    // This would integrate with your authentication system
    const user = userIdentity.getCurrentUser();
    return `user_${user?.userId}_${user?.sessionId}`;
  }

  // Enable cloud sync (for user settings)
  async enableCloudSync(config) {
    try {
      this.apiEndpoint = config.endpoint;
      this.isCloudEnabled = true;
      
      // Save configuration
      const preferences = await storageManager.retrieve(DATA_TYPES.PREFERENCES.key);
      const updatedPreferences = {
        ...preferences.data,
        cloudSync: {
          enabled: true,
          endpoint: config.endpoint,
          encryption: config.encryption !== false,
          autoSync: config.autoSync !== false
        }
      };
      
      await storageManager.store(DATA_TYPES.PREFERENCES.key, updatedPreferences);
      
      // Test connection and start sync
      const connectionTest = await this.testCloudConnection();
      if (connectionTest.success) {
        this.startPeriodicSync();
        this.syncStatus = SYNC_STATUS.SUCCESS;
        
        // Perform initial sync
        await this.performFullSync();
        
        console.log('☁️ Cloud sync enabled successfully');
        this.notifyListeners('cloud_enabled');
        
        return { success: true };
      } else {
        throw new Error('Cloud connection test failed');
      }
    } catch (error) {
      console.error('Failed to enable cloud sync:', error);
      return { success: false, error: error.message };
    }
  }

  // Disable cloud sync
  async disableCloudSync() {
    this.isCloudEnabled = false;
    this.syncStatus = SYNC_STATUS.DISABLED;
    
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    // Update preferences
    const preferences = await storageManager.retrieve(DATA_TYPES.PREFERENCES.key);
    const updatedPreferences = {
      ...preferences.data,
      cloudSync: {
        ...preferences.data.cloudSync,
        enabled: false
      }
    };
    
    await storageManager.store(DATA_TYPES.PREFERENCES.key, updatedPreferences);
    
    console.log('📱 Cloud sync disabled - running in local-only mode');
    this.notifyListeners('cloud_disabled');
    
    return { success: true };
  }

  // Get sync status and statistics
  getSyncStatus() {
    return {
      isInitialized: this.isInitialized,
      isCloudEnabled: this.isCloudEnabled,
      status: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      stats: this.syncStats,
      pendingChanges: this.changeTracker.getPendingChanges().length,
      apiEndpoint: this.apiEndpoint
    };
  }

  // Export data for migration to cloud
  async exportForMigration() {
    const exportData = {
      migrationSchema: {
        version: CLOUD_SYNC_CONFIG.SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        sourceSystem: 'Lumina Notes Local Storage',
        targetSystem: 'MongoDB Cloud'
      },
      userData: {
        userId: userIdentity.getCurrentUser()?.userId,
        fingerprint: userIdentity.getCurrentUser()?.fingerprint,
        createdAt: userIdentity.getCurrentUser()?.createdAt
      },
      data: {}
    };

    // Export all data types
    for (const [key, config] of Object.entries(DATA_TYPES)) {
      try {
        const result = await storageManager.retrieve(config.key);
        if (result.success && result.data) {
          exportData.data[config.key] = {
            content: result.data,
            metadata: result.metadata,
            version: result.version
          };
        }
      } catch (error) {
        console.warn(`Failed to export ${config.key}:`, error);
      }
    }

    return exportData;
  }

  // Event listener management
  addListener(listener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  removeListener(listener) {
    this.eventListeners.delete(listener);
  }

  notifyListeners(event, data = {}) {
    this.eventListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Cloud sync listener error:', error);
      }
    });
  }

  // Cleanup
  destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.isInitialized = false;
    this.eventListeners.clear();
    console.log('☁️ Cloud sync manager destroyed');
  }
}

// Create and export singleton instance
const cloudSyncManager = new CloudSyncManager();

export default cloudSyncManager;
export { CloudSyncManager, SYNC_STATUS, CLOUD_SYNC_CONFIG }; 