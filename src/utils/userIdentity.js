/**
 * User Identity System for Lumina Notes
 * Provides seamless user identification without account creation
 * Features: UUID generation, browser fingerprinting, 1-year persistence
 */

// Generate a unique UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Create browser fingerprint for additional uniqueness
function generateBrowserFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Lumina fingerprint', 2, 2);
  
  const fingerprint = {
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    userAgent: navigator.userAgent.slice(0, 100), // First 100 chars only
    canvas: canvas.toDataURL().slice(0, 50), // Partial canvas fingerprint
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || 'unknown'
  };
  
  // Create a hash of the fingerprint
  let hash = 0;
  const str = JSON.stringify(fingerprint);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36);
}

// Session management constants
const SESSION_DURATION = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
const STORAGE_KEYS = {
  USER_ID: 'lumina_user_id',
  SESSION_DATA: 'lumina_session',
  FINGERPRINT: 'lumina_fingerprint',
  LAST_ACTIVITY: 'lumina_last_activity'
};

// User Identity Manager
class UserIdentityManager {
  constructor() {
    this.userId = null;
    this.sessionId = null;
    this.fingerprint = null;
    this.isInitialized = false;
  }

  // Initialize the user identity system
  async initialize() {
    try {
      // Check for existing session
      const existingSession = this.getStoredSession();
      
      if (existingSession && this.isSessionValid(existingSession)) {
        // Restore existing session
        this.userId = existingSession.userId;
        this.sessionId = existingSession.sessionId;
        this.fingerprint = existingSession.fingerprint;
        
        // Update last activity
        this.updateLastActivity();
        
        console.log('🔐 Restored existing user session:', this.userId);
      } else {
        // Create new session
        await this.createNewSession();
        console.log('🆕 Created new user session:', this.userId);
      }
      
      this.isInitialized = true;
      return {
        success: true,
        userId: this.userId,
        isNewUser: !existingSession
      };
    } catch (error) {
      console.error('Failed to initialize user identity:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create a new user session
  async createNewSession() {
    this.userId = generateUUID();
    this.sessionId = generateUUID();
    this.fingerprint = generateBrowserFingerprint();
    
    const sessionData = {
      userId: this.userId,
      sessionId: this.sessionId,
      fingerprint: this.fingerprint,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      version: '1.0.0'
    };
    
    // Store in multiple locations for redundancy
    this.storeSession(sessionData);
    this.updateLastActivity();
  }

  // Store session data with redundancy
  storeSession(sessionData) {
    try {
      // Primary storage
      localStorage.setItem(STORAGE_KEYS.SESSION_DATA, JSON.stringify(sessionData));
      localStorage.setItem(STORAGE_KEYS.USER_ID, sessionData.userId);
      localStorage.setItem(STORAGE_KEYS.FINGERPRINT, sessionData.fingerprint);
      
      // Backup storage
      sessionStorage.setItem(STORAGE_KEYS.SESSION_DATA, JSON.stringify(sessionData));
      
      // Cookie backup (if available)
      if (navigator.cookieEnabled) {
        const expiryDate = new Date(Date.now() + SESSION_DURATION);
        document.cookie = `${STORAGE_KEYS.USER_ID}=${sessionData.userId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
      }
    } catch (error) {
      console.warn('Failed to store session data:', error);
    }
  }

  // Get stored session with fallback locations
  getStoredSession() {
    try {
      // Try primary storage first
      let sessionData = localStorage.getItem(STORAGE_KEYS.SESSION_DATA);
      
      if (!sessionData) {
        // Try backup storage
        sessionData = sessionStorage.getItem(STORAGE_KEYS.SESSION_DATA);
      }
      
      if (!sessionData) {
        // Try reconstructing from individual items
        const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
        const fingerprint = localStorage.getItem(STORAGE_KEYS.FINGERPRINT);
        
        if (userId && fingerprint) {
          sessionData = JSON.stringify({
            userId,
            fingerprint,
            sessionId: generateUUID(),
            createdAt: Date.now() - (30 * 24 * 60 * 60 * 1000), // Assume 30 days old
            lastActivity: Date.now(),
            version: '1.0.0'
          });
        }
      }
      
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.warn('Failed to retrieve session data:', error);
      return null;
    }
  }

  // Check if session is still valid
  isSessionValid(sessionData) {
    if (!sessionData || !sessionData.userId || !sessionData.createdAt) {
      return false;
    }
    
    const now = Date.now();
    const sessionAge = now - sessionData.createdAt;
    const lastActivity = sessionData.lastActivity || sessionData.createdAt;
    const timeSinceActivity = now - lastActivity;
    
    // Session expires after 1 year or 90 days of inactivity
    const maxAge = SESSION_DURATION;
    const maxInactivity = 90 * 24 * 60 * 60 * 1000; // 90 days
    
    if (sessionAge > maxAge || timeSinceActivity > maxInactivity) {
      this.clearSession();
      return false;
    }
    
    // Verify fingerprint hasn't changed significantly
    const currentFingerprint = generateBrowserFingerprint();
    if (sessionData.fingerprint && sessionData.fingerprint !== currentFingerprint) {
      console.warn('Browser fingerprint mismatch - possible device change');
      // Still allow session but log for security
    }
    
    return true;
  }

  // Update last activity timestamp
  updateLastActivity() {
    try {
      const lastActivity = Date.now();
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, lastActivity.toString());
      
      // Update session data too
      const sessionData = this.getStoredSession();
      if (sessionData) {
        sessionData.lastActivity = lastActivity;
        this.storeSession(sessionData);
      }
    } catch (error) {
      console.warn('Failed to update last activity:', error);
    }
  }

  // Clear all session data
  clearSession() {
    try {
      // Clear localStorage
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear sessionStorage
      Object.values(STORAGE_KEYS).forEach(key => {
        sessionStorage.removeItem(key);
      });
      
      // Clear cookies
      if (navigator.cookieEnabled) {
        document.cookie = `${STORAGE_KEYS.USER_ID}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
      
      // Reset instance variables
      this.userId = null;
      this.sessionId = null;
      this.fingerprint = null;
      this.isInitialized = false;
      
      console.log('🧹 Session cleared');
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }
  }

  // Get current user info
  getCurrentUser() {
    if (!this.isInitialized) {
      console.warn('User identity not initialized');
      return null;
    }
    
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      fingerprint: this.fingerprint,
      isAuthenticated: !!this.userId
    };
  }

  // Generate a storage key for user-specific data
  getUserStorageKey(dataType) {
    if (!this.userId) {
      throw new Error('User not initialized');
    }
    return `lumina_${this.userId}_${dataType}`;
  }

  // Health check for the identity system
  healthCheck() {
    const health = {
      initialized: this.isInitialized,
      hasUserId: !!this.userId,
      hasValidSession: false,
      storageAvailable: false,
      lastActivity: null
    };
    
    try {
      // Check storage availability
      localStorage.setItem('lumina_test', 'test');
      localStorage.removeItem('lumina_test');
      health.storageAvailable = true;
    } catch (error) {
      health.storageAvailable = false;
    }
    
    // Check session validity
    const sessionData = this.getStoredSession();
    health.hasValidSession = sessionData ? this.isSessionValid(sessionData) : false;
    health.lastActivity = sessionData?.lastActivity || null;
    
    return health;
  }
}

// Create and export singleton instance
const userIdentity = new UserIdentityManager();

export default userIdentity;
export { UserIdentityManager, STORAGE_KEYS }; 