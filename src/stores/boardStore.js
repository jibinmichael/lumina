/**
 * Enhanced Board Management Store for Lumina Notes
 * Integrated with bulletproof storage system
 * Features: Auto-save, encryption, backup, real-time persistence
 */

import autoSaveManager, { SAVE_PRIORITY } from '../utils/autoSave.js';
import storageManager, { DATA_TYPES } from '../utils/storageManager.js';
import userIdentity from '../utils/userIdentity.js';

class BoardStore {
  constructor() {
    this.isInitialized = false;
    this.boards = [];
    this.activeBoard = null;
    this.activeBoardId = null;
    this.nodesData = new Map(); // Store nodes for each board
    this.changeListeners = new Set();
    this.isLoading = false;
    
    // Storage configuration
    this.storageConfig = {
      boardsDataType: DATA_TYPES.BOARDS.key,
      nodesDataType: DATA_TYPES.NODES.key,
      preferencesDataType: DATA_TYPES.PREFERENCES.key
    };
  }

  // Initialize the enhanced board store
  async initialize() {
    if (this.isInitialized) {
      return { success: true };
    }

    try {
      this.isLoading = true;
      
      // Initialize storage systems
      await this.initializeStorageSystems();
      
      // Load existing data
      await this.loadBoardsFromStorage();
      await this.loadNodesFromStorage();
      await this.loadPreferences();
      
      // Set up change tracking
      this.setupChangeTracking();
      
      this.isInitialized = true;
      this.isLoading = false;
      
      console.log('🎯 Enhanced Board Store initialized', {
        boards: this.boards.length,
        activeBoard: this.activeBoard?.name,
        nodes: this.nodesData.size
      });
      
      // Notify listeners
      this.notifyListeners('initialized');
      
      return { success: true };
    } catch (error) {
      this.isLoading = false;
      console.error('Failed to initialize board store:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize all storage systems
  async initializeStorageSystems() {
    // Initialize user identity first
    if (!userIdentity.isInitialized) {
      const result = await userIdentity.initialize();
      if (!result.success) {
        throw new Error('User identity initialization failed');
      }
    }

    // Initialize storage manager
    if (!storageManager.isInitialized) {
      const result = await storageManager.initialize();
      if (!result.success) {
        throw new Error('Storage manager initialization failed');
      }
    }

    // Initialize auto-save manager
    if (!autoSaveManager.isInitialized) {
      const result = await autoSaveManager.initialize();
      if (!result.success) {
        console.warn('Auto-save manager failed to initialize');
      }
    }
  }

  // Load boards from storage
  async loadBoardsFromStorage() {
    try {
      const result = await storageManager.retrieve(this.storageConfig.boardsDataType);
      
      if (result.success && result.data) {
        this.boards = Array.isArray(result.data.boards) ? result.data.boards : [];
        this.activeBoardId = result.data.activeBoardId || null;
        
        // Find active board object
        if (this.activeBoardId) {
          this.activeBoard = this.boards.find(b => b.id === this.activeBoardId);
        }
        
        console.log(`📚 Loaded ${this.boards.length} boards from storage`);
      } else {
        // No existing data, initialize with default board
        await this.createDefaultBoard();
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
      // Fallback to default board
      await this.createDefaultBoard();
    }
  }

  // Load nodes data from storage
  async loadNodesFromStorage() {
    try {
      const result = await storageManager.retrieve(this.storageConfig.nodesDataType);
      
      if (result.success && result.data) {
        // Convert stored data back to Map
        if (result.data.nodesMap) {
          this.nodesData = new Map(Object.entries(result.data.nodesMap));
        }
        
        console.log(`📝 Loaded nodes data for ${this.nodesData.size} boards`);
      }
    } catch (error) {
      console.error('Failed to load nodes data:', error);
      this.nodesData = new Map();
    }
  }

  // Load user preferences
  async loadPreferences() {
    try {
      const result = await storageManager.retrieve(this.storageConfig.preferencesDataType);
      
      if (result.success && result.data) {
        this.preferences = result.data;
        console.log('⚙️ Loaded user preferences');
      } else {
        this.preferences = this.getDefaultPreferences();
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      this.preferences = this.getDefaultPreferences();
    }
  }

  // Create default board if none exists
  async createDefaultBoard() {
    const defaultBoard = this.createBoardObject('My First Canvas');
    this.boards = [defaultBoard];
    this.activeBoard = defaultBoard;
    this.activeBoardId = defaultBoard.id;
    
    // Save immediately
    await this.saveBoardsToStorage(true);
    
    console.log('🆕 Created default board');
  }

  // Get default preferences
  getDefaultPreferences() {
    return {
      autoSave: true,
      backupEnabled: true,
      theme: 'light',
      canvasSettings: {
        snapToGrid: false,
        showGrid: true,
        defaultNodeColor: '#ffffff'
      },
      privacy: {
        encryptSensitiveData: false,
        shareAnalytics: false
      }
    };
  }

  // Create board object with enhanced metadata
  createBoardObject(name) {
    const now = new Date().toISOString();
    const user = userIdentity.getCurrentUser();
    
    return {
      id: this.generateBoardId(),
      name: name,
      createdAt: now,
      lastModified: now,
      owner: user?.userId || 'anonymous',
      version: '1.0.0',
      metadata: {
        nodeCount: 0,
        lastAccessed: now,
        tags: [],
        description: '',
        isArchived: false,
        isPrivate: false
      }
    };
  }

  // Generate unique board ID with enhanced entropy
  generateBoardId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const userHash = userIdentity.getCurrentUser()?.fingerprint?.substr(0, 4) || '0000';
    return `board_${timestamp}_${userHash}_${random}`;
  }

  // Setup change tracking for auto-save
  setupChangeTracking() {
    // Track changes to boards and trigger auto-save
    this.originalGetBoards = this.getBoards.bind(this);
    this.originalSetActiveBoard = this.setActiveBoard.bind(this);
  }

  // Enhanced auto-save for boards
  async saveBoardsToStorage(immediate = false) {
    if (!this.isInitialized) return;

    const boardsData = {
      boards: this.boards,
      activeBoardId: this.activeBoardId,
      lastModified: new Date().toISOString(),
      version: '1.0.0'
    };

    if (autoSaveManager.isInitialized) {
      autoSaveManager.scheduleAutoSave(
        this.storageConfig.boardsDataType,
        boardsData,
        {
          priority: SAVE_PRIORITY.HIGH,
          immediate,
          source: 'board_store'
        }
      );
    } else {
      // Fallback to direct storage
      await storageManager.store(this.storageConfig.boardsDataType, boardsData);
    }
  }

  // Auto-save nodes data
  async saveNodesToStorage(immediate = false) {
    if (!this.isInitialized) return;

    const nodesData = {
      nodesMap: Object.fromEntries(this.nodesData),
      lastModified: new Date().toISOString(),
      version: '1.0.0'
    };

    if (autoSaveManager.isInitialized) {
      autoSaveManager.scheduleAutoSave(
        this.storageConfig.nodesDataType,
        nodesData,
        {
          priority: SAVE_PRIORITY.HIGH,
          immediate,
          source: 'board_store'
        }
      );
    } else {
      await storageManager.store(this.storageConfig.nodesDataType, nodesData);
    }
  }

  // Save user preferences
  async savePreferences(immediate = false) {
    if (!this.isInitialized) return;

    if (autoSaveManager.isInitialized) {
      autoSaveManager.scheduleAutoSave(
        this.storageConfig.preferencesDataType,
        this.preferences,
        {
          priority: SAVE_PRIORITY.MEDIUM,
          immediate,
          encrypt: this.preferences?.privacy?.encryptSensitiveData || false
        }
      );
    } else {
      await storageManager.store(this.storageConfig.preferencesDataType, this.preferences);
    }
  }

  // Get all boards (backward compatible)
  getBoards() {
    return this.boards;
  }

  // Set boards (with auto-save)
  setBoards(boards) {
    this.boards = boards;
    this.saveBoardsToStorage();
    this.notifyListeners('boards_updated');
    return true;
  }

  // Get active board ID
  getActiveBoardId() {
    return this.activeBoardId;
  }

  // Set active board (enhanced with auto-save)
  setActiveBoard(boardId) {
    const board = this.boards.find(b => b.id === boardId);
    if (board) {
      this.activeBoardId = boardId;
      this.activeBoard = board;
      
      // Update last accessed time
      board.metadata.lastAccessed = new Date().toISOString();
      
      this.saveBoardsToStorage();
      this.notifyListeners('active_board_changed', { board });
      return true;
    }
    return false;
  }

  // Get active board object
  getActiveBoard() {
    return this.activeBoard;
  }

  // Create new board (enhanced)
  async createBoard(name) {
    try {
      const newBoard = this.createBoardObject(name);
      this.boards.push(newBoard);
      this.setActiveBoard(newBoard.id);
      
      // Initialize empty nodes for this board
      this.nodesData.set(newBoard.id, {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      });
      
      await this.saveBoardsToStorage(true);
      await this.saveNodesToStorage(true);
      
      this.notifyListeners('board_created', { board: newBoard });
      
      console.log(`✅ Created new board: ${name}`);
      return { success: true, board: newBoard };
    } catch (error) {
      console.error('Error creating board:', error);
      return { success: false, error: error.message };
    }
  }

  // Rename board (enhanced)
  async renameBoard(boardId, newName) {
    try {
      const boardIndex = this.boards.findIndex(b => b.id === boardId);
      
      if (boardIndex !== -1) {
        const oldName = this.boards[boardIndex].name;
        this.boards[boardIndex].name = newName;
        this.boards[boardIndex].lastModified = new Date().toISOString();
        
        await this.saveBoardsToStorage(true);
        
        this.notifyListeners('board_renamed', { 
          boardId, 
          oldName, 
          newName,
          board: this.boards[boardIndex]
        });
        
        console.log(`✏️ Renamed board: ${oldName} → ${newName}`);
        return { success: true };
      } else {
        return { success: false, error: 'Board not found' };
      }
    } catch (error) {
      console.error('Error renaming board:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete board (enhanced with cleanup)
  async deleteBoard(boardId) {
    try {
      const boardToDelete = this.boards.find(b => b.id === boardId);
      if (!boardToDelete) {
        return { success: false, error: 'Board not found' };
      }
      
      // Remove board from list
      this.boards = this.boards.filter(b => b.id !== boardId);
      
      // Clean up nodes data
      this.nodesData.delete(boardId);
      
      // If deleting active board, set first remaining board as active
      if (this.activeBoardId === boardId) {
        if (this.boards.length > 0) {
          this.setActiveBoard(this.boards[0].id);
        } else {
          // No boards left, create default
          await this.createDefaultBoard();
        }
      }
      
      await this.saveBoardsToStorage(true);
      await this.saveNodesToStorage(true);
      
      this.notifyListeners('board_deleted', { boardId, board: boardToDelete });
      
      console.log(`🗑️ Deleted board: ${boardToDelete.name}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting board:', error);
      return { success: false, error: error.message };
    }
  }

  // Switch active board (backward compatible)
  switchBoard(boardId) {
    const success = this.setActiveBoard(boardId);
    const board = this.activeBoard;
    
    if (success) {
      return { success: true, board };
    } else {
      return { success: false, error: 'Board not found' };
    }
  }

  // Node management methods
  async saveNodesForBoard(boardId, nodes, edges, viewport) {
    const boardData = {
      nodes: nodes || [],
      edges: edges || [],
      viewport: viewport || { x: 0, y: 0, zoom: 1 },
      lastModified: new Date().toISOString()
    };
    
    this.nodesData.set(boardId, boardData);
    
    // Update board metadata
    const board = this.boards.find(b => b.id === boardId);
    if (board) {
      board.metadata.nodeCount = nodes?.length || 0;
      board.lastModified = new Date().toISOString();
    }
    
    // Save immediately for user content changes
    await this.saveNodesToStorage(true);
    await this.saveBoardsToStorage(true);
    
    this.notifyListeners('nodes_updated', { boardId, nodeCount: nodes?.length || 0 });
  }

  // Get nodes for board
  getNodesForBoard(boardId) {
    return this.nodesData.get(boardId) || {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 }
    };
  }

  // Get storage statistics
  async getStorageStats() {
    if (!storageManager.isInitialized) {
      return null;
    }
    
    return storageManager.getStorageStats();
  }

  // Data recovery methods
  async recoverBoard(boardId) {
    try {
      console.log(`🔄 Attempting to recover board: ${boardId}`);
      
      // Try to recover from backup
      const result = await autoSaveManager.recoverData(this.storageConfig.boardsDataType);
      
      if (result.success) {
        await this.loadBoardsFromStorage();
        this.notifyListeners('board_recovered', { boardId });
        return result;
      }
      
      return { success: false, error: 'Recovery failed' };
    } catch (error) {
      console.error('Board recovery failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear all data (enhanced with proper cleanup)
  async clearAllData() {
    try {
      // Clear all storage
      await storageManager.delete(this.storageConfig.boardsDataType);
      await storageManager.delete(this.storageConfig.nodesDataType);
      await storageManager.delete(this.storageConfig.preferencesDataType);
      
      // Reset local state
      this.boards = [];
      this.activeBoard = null;
      this.activeBoardId = null;
      this.nodesData.clear();
      this.preferences = this.getDefaultPreferences();
      
      // Recreate default board
      await this.createDefaultBoard();
      
      this.notifyListeners('data_cleared');
      
      console.log('🧹 All data cleared and reset');
      return { success: true };
    } catch (error) {
      console.error('Error clearing data:', error);
      return { success: false, error: error.message };
    }
  }

  // Change listener management
  addChangeListener(listener) {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  removeChangeListener(listener) {
    this.changeListeners.delete(listener);
  }

  notifyListeners(event, data = {}) {
    this.changeListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  // Export/Import functionality
  async exportBoardData(boardId) {
    const board = this.boards.find(b => b.id === boardId);
    const nodes = this.getNodesForBoard(boardId);
    
    if (!board) {
      throw new Error('Board not found');
    }
    
    return {
      board,
      nodes,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  async importBoardData(boardData) {
    try {
      // Create new board with imported data
      const newBoard = {
        ...boardData.board,
        id: this.generateBoardId(), // Generate new ID
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      this.boards.push(newBoard);
      this.nodesData.set(newBoard.id, boardData.nodes);
      
      await this.saveBoardsToStorage(true);
      await this.saveNodesToStorage(true);
      
      this.notifyListeners('board_imported', { board: newBoard });
      
      return { success: true, board: newBoard };
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Health check
  getHealthStatus() {
    return {
      initialized: this.isInitialized,
      loading: this.isLoading,
      boardCount: this.boards.length,
      activeBoard: this.activeBoard?.name || null,
      nodeDataBoards: this.nodesData.size,
      storage: storageManager.isInitialized,
      autoSave: autoSaveManager.isInitialized,
      userIdentity: userIdentity.isInitialized
    };
  }
}

// Create and export singleton instance
const boardStore = new BoardStore();

// Initialize automatically when imported
boardStore.initialize().then(result => {
  if (!result.success) {
    console.error('Board store initialization failed:', result.error);
  }
});

export { boardStore };
export default boardStore; 