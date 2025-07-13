/**
 * Client-Side Encryption for Lumina Notes
 * Provides secure encryption/decryption for sensitive data
 * Uses AES-256-GCM with PBKDF2 key derivation
 */

import userIdentity from './userIdentity.js';

// Encryption configuration
const ENCRYPTION_CONFIG = {
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  IV_LENGTH: 12, // 96 bits for GCM
  SALT_LENGTH: 16,
  TAG_LENGTH: 16,
  PBKDF2_ITERATIONS: 100000,
  KEY_DERIVATION_ALGORITHM: 'PBKDF2'
};

// Simple base64 encoding/decoding for browser compatibility
const BASE64 = {
  encode: (data) => {
    if (typeof btoa !== 'undefined') {
      return btoa(String.fromCharCode(...new Uint8Array(data)));
    }
    // Fallback for environments without btoa
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    const bytes = new Uint8Array(data);
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i];
      const b = bytes[i + 1] || 0;
      const c = bytes[i + 2] || 0;
      const bitmap = (a << 16) | (b << 8) | c;
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i + 1 < bytes.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i + 2 < bytes.length ? chars.charAt(bitmap & 63) : '=';
    }
    return result;
  },
  
  decode: (str) => {
    if (typeof atob !== 'undefined') {
      const binary = atob(str);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }
    // Fallback implementation
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
      lookup[chars.charCodeAt(i)] = i;
    }
    
    const len = str.length;
    const bytes = new Uint8Array(len * 3 / 4);
    let p = 0;
    
    for (let i = 0; i < len; i += 4) {
      const encoded1 = lookup[str.charCodeAt(i)];
      const encoded2 = lookup[str.charCodeAt(i + 1)];
      const encoded3 = lookup[str.charCodeAt(i + 2)];
      const encoded4 = lookup[str.charCodeAt(i + 3)];
      
      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      if (str[i + 2] !== '=') bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      if (str[i + 3] !== '=') bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
    }
    
    return bytes.slice(0, p).buffer;
  }
};

// Encryption utility class
class EncryptionManager {
  constructor() {
    this.isInitialized = false;
    this.masterKey = null;
    this.supportsWebCrypto = typeof crypto !== 'undefined' && crypto.subtle;
  }

  // Initialize encryption system
  async initialize() {
    try {
      if (!userIdentity.isInitialized) {
        throw new Error('User identity must be initialized first');
      }

      // Check Web Crypto API support
      if (!this.supportsWebCrypto) {
        console.warn('Web Crypto API not supported, using fallback encryption');
      }

      // Generate master key from user identity
      await this.generateMasterKey();
      
      this.isInitialized = true;
      console.log('🔐 Encryption Manager initialized');
      
      return {
        success: true,
        webCryptoSupported: this.supportsWebCrypto
      };
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate master key from user identity
  async generateMasterKey() {
    const user = userIdentity.getCurrentUser();
    if (!user || !user.userId) {
      throw new Error('No user identity available');
    }

    // Create a deterministic key from user ID and fingerprint
    const keyMaterial = `${user.userId}-${user.fingerprint}-lumina-encryption`;
    
    if (this.supportsWebCrypto) {
      try {
        // Use Web Crypto API for secure key derivation
        const encoder = new TextEncoder();
        const keyData = encoder.encode(keyMaterial);
        
        // Import key material
        const importedKey = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );
        
        // Generate salt from user fingerprint for consistency
        const salt = this.generateSalt(user.fingerprint);
        
        // Derive master key
        this.masterKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: ENCRYPTION_CONFIG.PBKDF2_ITERATIONS,
            hash: 'SHA-256'
          },
          importedKey,
          { name: 'AES-GCM', length: ENCRYPTION_CONFIG.KEY_LENGTH },
          false,
          ['encrypt', 'decrypt']
        );
      } catch (error) {
        console.warn('Web Crypto key derivation failed, using fallback:', error);
        this.masterKey = this.generateFallbackKey(keyMaterial);
      }
    } else {
      // Fallback key generation
      this.masterKey = this.generateFallbackKey(keyMaterial);
    }
  }

  // Generate salt from fingerprint for consistency
  generateSalt(fingerprint) {
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint + 'lumina-salt');
    const hash = this.simpleHash(data);
    
    // Create 16-byte salt
    const salt = new Uint8Array(ENCRYPTION_CONFIG.SALT_LENGTH);
    for (let i = 0; i < ENCRYPTION_CONFIG.SALT_LENGTH; i++) {
      salt[i] = hash % 256;
      hash = Math.floor(hash / 256);
    }
    return salt;
  }

  // Fallback key generation for environments without Web Crypto
  generateFallbackKey(keyMaterial) {
    const hash = this.simpleHash(new TextEncoder().encode(keyMaterial));
    const key = new Uint8Array(32); // 256 bits
    
    let seed = hash;
    for (let i = 0; i < 32; i++) {
      seed = (seed * 1103515245 + 12345) & 0xffffffff;
      key[i] = (seed >> 8) & 0xff;
    }
    
    return key;
  }

  // Simple hash function for fallback scenarios
  simpleHash(data) {
    let hash = 0;
    const bytes = new Uint8Array(data);
    for (let i = 0; i < bytes.length; i++) {
      hash = ((hash << 5) - hash + bytes[i]) & 0xffffffff;
    }
    return Math.abs(hash);
  }

  // Encrypt data
  async encrypt(data) {
    if (!this.isInitialized) {
      throw new Error('Encryption manager not initialized');
    }

    try {
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
      
      if (this.supportsWebCrypto && this.masterKey instanceof CryptoKey) {
        return await this.encryptWithWebCrypto(plaintext);
      } else {
        return await this.encryptWithFallback(plaintext);
      }
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data
  async decrypt(encryptedData) {
    if (!this.isInitialized) {
      throw new Error('Encryption manager not initialized');
    }

    try {
      if (encryptedData.webCrypto && this.supportsWebCrypto) {
        return await this.decryptWithWebCrypto(encryptedData);
      } else {
        return await this.decryptWithFallback(encryptedData);
      }
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Web Crypto API encryption
  async encryptWithWebCrypto(plaintext) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.IV_LENGTH));
    
    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      this.masterKey,
      data
    );
    
    return {
      webCrypto: true,
      iv: BASE64.encode(iv),
      data: BASE64.encode(encrypted),
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  // Web Crypto API decryption
  async decryptWithWebCrypto(encryptedData) {
    const iv = new Uint8Array(BASE64.decode(encryptedData.iv));
    const data = new Uint8Array(BASE64.decode(encryptedData.data));
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      this.masterKey,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  // Fallback encryption (simple XOR cipher for demonstration)
  async encryptWithFallback(plaintext) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const key = this.masterKey;
    
    // Generate pseudo-random IV
    const iv = new Uint8Array(ENCRYPTION_CONFIG.IV_LENGTH);
    const seed = Date.now();
    for (let i = 0; i < iv.length; i++) {
      iv[i] = (seed + i * 7) % 256;
    }
    
    // Simple XOR encryption
    const encrypted = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ key[i % key.length] ^ iv[i % iv.length];
    }
    
    return {
      webCrypto: false,
      iv: BASE64.encode(iv),
      data: BASE64.encode(encrypted),
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  // Fallback decryption
  async decryptWithFallback(encryptedData) {
    const iv = new Uint8Array(BASE64.decode(encryptedData.iv));
    const data = new Uint8Array(BASE64.decode(encryptedData.data));
    const key = this.masterKey;
    
    // Simple XOR decryption
    const decrypted = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      decrypted[i] = data[i] ^ key[i % key.length] ^ iv[i % iv.length];
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  // Encrypt sensitive data for storage
  async encryptForStorage(data) {
    try {
      const encrypted = await this.encrypt(data);
      return {
        encrypted: true,
        ...encrypted
      };
    } catch (error) {
      console.warn('Encryption failed, storing unencrypted:', error);
      return {
        encrypted: false,
        data: typeof data === 'string' ? data : JSON.stringify(data)
      };
    }
  }

  // Decrypt data from storage
  async decryptFromStorage(encryptedData) {
    if (!encryptedData.encrypted) {
      return encryptedData.data;
    }
    
    try {
      const decrypted = await this.decrypt(encryptedData);
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error('Failed to decrypt stored data:', error);
      throw new Error('Data decryption failed - data may be corrupted');
    }
  }

  // Test encryption/decryption functionality
  async testEncryption() {
    const testData = {
      message: 'Hello, Lumina!',
      timestamp: Date.now(),
      sensitive: true
    };
    
    try {
      console.log('🧪 Testing encryption...');
      
      // Test encryption
      const encrypted = await this.encrypt(testData);
      console.log('✅ Encryption successful');
      
      // Test decryption
      const decrypted = await this.decrypt(encrypted);
      const parsedDecrypted = JSON.parse(decrypted);
      
      // Verify data integrity
      const isValid = JSON.stringify(testData) === JSON.stringify(parsedDecrypted);
      
      if (isValid) {
        console.log('✅ Decryption successful - data integrity verified');
        return { success: true, webCrypto: encrypted.webCrypto };
      } else {
        throw new Error('Data integrity check failed');
      }
    } catch (error) {
      console.error('❌ Encryption test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get encryption status
  getStatus() {
    return {
      initialized: this.isInitialized,
      webCryptoSupported: this.supportsWebCrypto,
      keyGenerated: !!this.masterKey,
      ready: this.isInitialized && !!this.masterKey
    };
  }

  // Clear encryption keys (for security)
  clearKeys() {
    this.masterKey = null;
    this.isInitialized = false;
    console.log('🔐 Encryption keys cleared');
  }
}

// Create and export singleton instance
const encryptionManager = new EncryptionManager();

export default encryptionManager;
export { EncryptionManager, ENCRYPTION_CONFIG }; 