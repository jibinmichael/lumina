// Board Management Store for Lumina Notes Web App
// Converted from Chrome extension to use localStorage

class BoardStore {
  constructor() {
    this.storageKeys = {
      boards: 'lumina_boards',
      activeBoard: 'lumina_active_board'
    };
    
    // Initialize with default board if none exists
    this.initialize();
  }

  // Initialize default board
  initialize() {
    const boards = this.getBoards();
    
    if (!boards || boards.length === 0) {
      const defaultBoard = this.createBoardObject('My First Canvas');
      this.setBoards([defaultBoard]);
      this.setActiveBoard(defaultBoard.id);
    }
  }

  // Create board object with metadata
  createBoardObject(name) {
    const now = new Date().toISOString();
    return {
      id: this.generateBoardId(),
      name: name,
      createdAt: now,
      lastModified: now
    };
  }

  // Generate unique board ID
  generateBoardId() {
    return 'board_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get all boards from localStorage
  getBoards() {
    try {
      const boards = localStorage.getItem(this.storageKeys.boards);
      return boards ? JSON.parse(boards) : [];
    } catch (error) {
      console.error('Error getting boards:', error);
      return [];
    }
  }

  // Set boards to localStorage
  setBoards(boards) {
    try {
      localStorage.setItem(this.storageKeys.boards, JSON.stringify(boards));
      return true;
    } catch (error) {
      console.error('Error setting boards:', error);
      return false;
    }
  }

  // Get active board ID
  getActiveBoardId() {
    return localStorage.getItem(this.storageKeys.activeBoard);
  }

  // Set active board ID
  setActiveBoard(boardId) {
    try {
      localStorage.setItem(this.storageKeys.activeBoard, boardId);
      return true;
    } catch (error) {
      console.error('Error setting active board:', error);
      return false;
    }
  }

  // Get active board object
  getActiveBoard() {
    const activeId = this.getActiveBoardId();
    const boards = this.getBoards();
    return boards.find(board => board.id === activeId) || boards[0] || null;
  }

  // Create new board
  createBoard(name) {
    try {
      const newBoard = this.createBoardObject(name);
      const boards = this.getBoards();
      boards.push(newBoard);
      
      this.setBoards(boards);
      this.setActiveBoard(newBoard.id);
      
      return { success: true, board: newBoard };
    } catch (error) {
      console.error('Error creating board:', error);
      return { success: false, error: error.message };
    }
  }

  // Rename board
  renameBoard(boardId, newName) {
    try {
      const boards = this.getBoards();
      const boardIndex = boards.findIndex(b => b.id === boardId);
      
      if (boardIndex !== -1) {
        boards[boardIndex].name = newName;
        boards[boardIndex].lastModified = new Date().toISOString();
        this.setBoards(boards);
        return { success: true };
      } else {
        return { success: false, error: 'Board not found' };
      }
    } catch (error) {
      console.error('Error renaming board:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete board
  deleteBoard(boardId) {
    try {
      const boards = this.getBoards();
      const filteredBoards = boards.filter(b => b.id !== boardId);
      
      // If deleting active board, set first remaining board as active
      const currentActiveId = this.getActiveBoardId();
      let newActiveId = currentActiveId;
      
      if (currentActiveId === boardId) {
        newActiveId = filteredBoards.length > 0 ? filteredBoards[0].id : null;
      }
      
      this.setBoards(filteredBoards);
      if (newActiveId) {
        this.setActiveBoard(newActiveId);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting board:', error);
      return { success: false, error: error.message };
    }
  }

  // Switch active board
  switchBoard(boardId) {
    try {
      const boards = this.getBoards();
      const board = boards.find(b => b.id === boardId);
      
      if (board) {
        this.setActiveBoard(boardId);
        return { success: true, board };
      } else {
        return { success: false, error: 'Board not found' };
      }
    } catch (error) {
      console.error('Error switching board:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear all data (for testing)
  clearAllData() {
    try {
      localStorage.removeItem(this.storageKeys.boards);
      localStorage.removeItem(this.storageKeys.activeBoard);
      this.initialize(); // Recreate default board
      return { success: true };
    } catch (error) {
      console.error('Error clearing data:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const boardStore = new BoardStore(); 