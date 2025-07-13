/**
 * Storage Manager for Lumina Notes
 * Hierarchical data organization with versioning, compression, and integrity checks
 * Handles all user data: boards, nodes, preferences, app state
 */

import userIdentity from './userIdentity.js';

// Storage configuration
const STORAGE_CONFIG = {
  VERSION: '1.0.0',
  MAX_STORAGE_SIZE: 50 * 1024 * 1024, // 50MB limit
  COMPRESSION_THRESHOLD: 1024, // Compress data larger than 1KB
  BACKUP_RETENTION: 5, // Keep 5 backup versions
  AUTO_SAVE_DELAY: 1000, // Auto-save after 1 second of inactivity
  CORRUPTION_CHECK_INTERVAL: 24 * 60 * 60 * 1000 // Check for corruption daily
};

// Data types and their configurations
const DATA_TYPES = {
  BOARDS: {
    key: 'boards',
    compress: true,
    backup: true,
    encrypt: false
  },
  NODES: {
    key: 'nodes', 
    compress: true,
    backup: true,
    encrypt: false
  },
  PREFERENCES: {
    key: 'preferences',
    compress: false,
    backup: true,
    encrypt: false
  },
  APP_STATE: {
    key: 'app_state',
    compress: false,
    backup: false,
    encrypt: false
  },
  SENSITIVE_DATA: {
    key: 'sensitive',
    compress: true,
    backup: true,
    encrypt: true
  }
};

// Simple compression using LZString-like algorithm
class SimpleCompression {
  static compress(data) {
    try {
      const str = typeof data === 'string' ? data : JSON.stringify(data);
      if (str.length < STORAGE_CONFIG.COMPRESSION_THRESHOLD) {
        return { compressed: false, data: str };
      }
      
      // Simple run-length encoding for demonstration
      const compressed = str.replace(/(.)\1+/g, (match, char) => {
        return match.length > 3 ? `${char}${match.length}` : match;
      });
      
      return {
        compressed: compressed.length < str.length,
        data: compressed.length < str.length ? compressed : str,
        originalSize: str.length,
        compressedSize: compressed.length
      };
    } catch (error) {
      console.warn('Compression failed:', error);
      return { compressed: false, data: typeof data === 'string' ? data : JSON.stringify(data) };
    }
  }
  
  static decompress(compressedData) {
    try {
      if (!compressedData.compressed) {
        return compressedData.data;
      }
      
      // Reverse run-length encoding
      const decompressed = compressedData.data.replace(/(.)\d+/g, (match) => {
        const char = match[0];
        const count = parseInt(match.slice(1));
        return char.repeat(count);
      });
      
      return decompressed;
    } catch (error) {
      console.warn('Decompression failed:', error);
      return compressedData.data;
    }
  }
}

// Data versioning and migration
class DataVersionManager {
  static createVersion(data, dataType) {
    return {
      version: STORAGE_CONFIG.VERSION,
      timestamp: Date.now(),
      dataType,
      checksum: this.generateChecksum(data),
      size: JSON.stringify(data).length
    };
  }
  
  static generateChecksum(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  static verifyChecksum(data, expectedChecksum) {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }
  
  static migrateData(data, fromVersion, toVersion) {
    // Future migration logic will go here
    console.log(`Migrating data from ${fromVersion} to ${toVersion}`);
    return data;
  }
}

// Storage Manager Class
class StorageManager {
  constructor() {
    this.isInitialized = false;
    this.autoSaveTimers = new Map();
    this.corruptionCheckTimer = null;
    this.storageUsage = 0;
  }

  // Initialize storage manager
  async initialize() {
    try {
      // Ensure user identity is initialized first
      if (!userIdentity.isInitialized) {
        const result = await userIdentity.initialize();
        if (!result.success) {
          throw new Error('Failed to initialize user identity');
        }
      }

      // Check storage availability and usage
      this.checkStorageAvailability();
      this.calculateStorageUsage();
      
      // Start corruption checking
      this.startCorruptionChecking();
      
      this.isInitialized = true;
      console.log('💾 Storage Manager initialized successfully');
      
      return {
        success: true,
        storageUsage: this.storageUsage,
        availableSpace: this.getAvailableSpace()
      };
    } catch (error) {
      console.error('Failed to initialize storage manager:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Store data with compression, versioning, and backup
  async store(dataType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Storage manager not initialized');
    }

    try {
      const config = DATA_TYPES[dataType];
      if (!config) {
        throw new Error(`Unknown data type: ${dataType}`);
      }

      // Create version metadata
      const versionInfo = DataVersionManager.createVersion(data, dataType);
      
      // Prepare storage package
      let storagePackage = {
        version: versionInfo,
        data: data,
        metadata: {
          userId: userIdentity.getCurrentUser().userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ...options
        }
      };

      // Compress if configured
      if (config.compress) {
        const compressed = SimpleCompression.compress(storagePackage.data);
        storagePackage.data = compressed;
        storagePackage.isCompressed = compressed.compressed;
      }

      // Create backup if configured
      if (config.backup) {
        await this.createBackup(dataType, storagePackage);
      }

      // Store main data
      const storageKey = this.getStorageKey(dataType);
      const serialized = JSON.stringify(storagePackage);
      
      // Check storage limits
      if (serialized.length > STORAGE_CONFIG.MAX_STORAGE_SIZE) {
        throw new Error('Data exceeds maximum storage size');
      }

      localStorage.setItem(storageKey, serialized);
      
      // Update storage usage
      this.calculateStorageUsage();
      
      console.log(`💾 Stored ${dataType}:`, {
        size: serialized.length,
        compressed: storagePackage.isCompressed,
        checksum: versionInfo.checksum
      });

      return {
        success: true,
        checksum: versionInfo.checksum,
        size: serialized.length,
        compressed: storagePackage.isCompressed
      };
    } catch (error) {
      console.error(`Failed to store ${dataType}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Retrieve data with decompression and integrity checking
  async retrieve(dataType, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Storage manager not initialized');
    }

    try {
      const config = DATA_TYPES[dataType];
      if (!config) {
        throw new Error(`Unknown data type: ${dataType}`);
      }

      const storageKey = this.getStorageKey(dataType);
      const serialized = localStorage.getItem(storageKey);
      
      if (!serialized) {
        return {
          success: true,
          data: null,
          isNew: true
        };
      }

      const storagePackage = JSON.parse(serialized);
      
      // Verify data integrity
      const isValid = DataVersionManager.verifyChecksum(
        storagePackage.data,
        storagePackage.version.checksum
      );

      if (!isValid && !options.skipIntegrityCheck) {
        console.warn(`Data corruption detected for ${dataType}`);
        // Try to restore from backup
        const backupResult = await this.restoreFromBackup(dataType);
        if (backupResult.success) {
          return backupResult;
        }
        throw new Error('Data corruption detected and backup restore failed');
      }

      // Decompress if needed
      let data = storagePackage.data;
      if (storagePackage.isCompressed) {
        data = SimpleCompression.decompress(data);
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (error) {
            // Data was just a string, keep as is
          }
        }
      }

      // Migrate data if needed
      if (storagePackage.version.version !== STORAGE_CONFIG.VERSION) {
        data = DataVersionManager.migrateData(
          data,
          storagePackage.version.version,
          STORAGE_CONFIG.VERSION
        );
      }

      return {
        success: true,
        data: data,
        metadata: storagePackage.metadata,
        version: storagePackage.version,
        isNew: false
      };
    } catch (error) {
      console.error(`Failed to retrieve ${dataType}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Auto-save with debouncing
  autoSave(dataType, data, delay = STORAGE_CONFIG.AUTO_SAVE_DELAY) {
    // Clear existing timer
    if (this.autoSaveTimers.has(dataType)) {
      clearTimeout(this.autoSaveTimers.get(dataType));
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        await this.store(dataType, data);
        console.log(`🔄 Auto-saved ${dataType}`);
      } catch (error) {
        console.error(`Auto-save failed for ${dataType}:`, error);
      }
      this.autoSaveTimers.delete(dataType);
    }, delay);

    this.autoSaveTimers.set(dataType, timer);
  }

  // Create backup copy
  async createBackup(dataType, storagePackage) {
    try {
      const backupKey = this.getBackupKey(dataType);
      const existingBackups = JSON.parse(localStorage.getItem(backupKey) || '[]');
      
      // Add new backup
      existingBackups.unshift({
        ...storagePackage,
        backupTimestamp: Date.now()
      });
      
      // Keep only the configured number of backups
      if (existingBackups.length > STORAGE_CONFIG.BACKUP_RETENTION) {
        existingBackups.splice(STORAGE_CONFIG.BACKUP_RETENTION);
      }
      
      localStorage.setItem(backupKey, JSON.stringify(existingBackups));
      console.log(`💾 Created backup for ${dataType}`);
    } catch (error) {
      console.warn(`Failed to create backup for ${dataType}:`, error);
    }
  }

  // Restore from backup
  async restoreFromBackup(dataType, backupIndex = 0) {
    try {
      const backupKey = this.getBackupKey(dataType);
      const backups = JSON.parse(localStorage.getItem(backupKey) || '[]');
      
      if (backups.length === 0 || backupIndex >= backups.length) {
        return {
          success: false,
          error: 'No backups available'
        };
      }
      
      const backup = backups[backupIndex];
      
      // Restore the backup as current data
      const storageKey = this.getStorageKey(dataType);
      localStorage.setItem(storageKey, JSON.stringify(backup));
      
      console.log(`🔄 Restored ${dataType} from backup ${backupIndex}`);
      
      // Return the restored data
      return await this.retrieve(dataType, { skipIntegrityCheck: true });
    } catch (error) {
      console.error(`Failed to restore ${dataType} from backup:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete data and backups
  async delete(dataType) {
    try {
      const storageKey = this.getStorageKey(dataType);
      const backupKey = this.getBackupKey(dataType);
      
      localStorage.removeItem(storageKey);
      localStorage.removeItem(backupKey);
      
      this.calculateStorageUsage();
      console.log(`🗑️ Deleted ${dataType} and its backups`);
      
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete ${dataType}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get storage statistics
  getStorageStats() {
    const stats = {
      totalUsage: this.storageUsage,
      maxSize: STORAGE_CONFIG.MAX_STORAGE_SIZE,
      availableSpace: this.getAvailableSpace(),
      usagePercentage: (this.storageUsage / STORAGE_CONFIG.MAX_STORAGE_SIZE) * 100,
      dataTypes: {}
    };

    // Calculate usage per data type
    Object.keys(DATA_TYPES).forEach(dataType => {
      const storageKey = this.getStorageKey(dataType);
      const data = localStorage.getItem(storageKey);
      const backupKey = this.getBackupKey(dataType);
      const backups = localStorage.getItem(backupKey);
      
      stats.dataTypes[dataType] = {
        mainSize: data ? data.length : 0,
        backupSize: backups ? backups.length : 0,
        totalSize: (data ? data.length : 0) + (backups ? backups.length : 0)
      };
    });

    return stats;
  }

  // Helper methods
  getStorageKey(dataType) {
    return userIdentity.getUserStorageKey(DATA_TYPES[dataType].key);
  }

  getBackupKey(dataType) {
    return userIdentity.getUserStorageKey(`${DATA_TYPES[dataType].key}_backups`);
  }

  checkStorageAvailability() {
    try {
      const testKey = 'lumina_storage_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      throw new Error('Local storage not available');
    }
  }

  calculateStorageUsage() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('lumina_')) {
        const value = localStorage.getItem(key);
        total += (key.length + (value ? value.length : 0));
      }
    }
    this.storageUsage = total;
    return total;
  }

  getAvailableSpace() {
    return Math.max(0, STORAGE_CONFIG.MAX_STORAGE_SIZE - this.storageUsage);
  }

  startCorruptionChecking() {
    this.corruptionCheckTimer = setInterval(async () => {
      await this.checkDataIntegrity();
    }, STORAGE_CONFIG.CORRUPTION_CHECK_INTERVAL);
  }

  async checkDataIntegrity() {
    console.log('🔍 Checking data integrity...');
    
    for (const dataType of Object.keys(DATA_TYPES)) {
      try {
        const result = await this.retrieve(dataType, { skipIntegrityCheck: false });
        if (!result.success && result.error.includes('corruption')) {
          console.warn(`Data corruption detected for ${dataType}`);
          // Corruption handling is done in retrieve method
        }
      } catch (error) {
        console.warn(`Integrity check failed for ${dataType}:`, error);
      }
    }
  }

  // Cleanup resources
  destroy() {
    // Clear auto-save timers
    this.autoSaveTimers.forEach(timer => clearTimeout(timer));
    this.autoSaveTimers.clear();
    
    // Clear corruption check timer
    if (this.corruptionCheckTimer) {
      clearInterval(this.corruptionCheckTimer);
    }
    
    this.isInitialized = false;
    console.log('💾 Storage Manager destroyed');
  }
}

// Create and export singleton instance
const storageManager = new StorageManager();

export default storageManager;
export { StorageManager, DATA_TYPES, STORAGE_CONFIG }; 