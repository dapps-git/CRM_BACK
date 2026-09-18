const crypto = require('crypto');

const GCM_ALGORITHM = 'aes-256-gcm';
const CBC_ALGORITHM = 'aes-256-cbc';

if (!process.env.ENCRYPTION_KEY) {
  console.error('FATAL ERROR: ENCRYPTION_KEY must be defined in environment variables.');
  process.exit(1);
}

const RAW_KEY = process.env.ENCRYPTION_KEY;
const SECRET_KEY = crypto.scryptSync(RAW_KEY, 'crm_vault_salt_crevionads', 32);
const LEGACY_SECRET_KEY = crypto.scryptSync(RAW_KEY, 'salt', 32);

/**
 * Encrypt plaintext string into AES-256-GCM authenticated string:
 * Format: "ivHex:authTagHex:encryptedHex"
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Encrypted authenticated string
 */
const encrypt = (text) => {
  if (!text || typeof text !== 'string') return text;
  try {
    const iv = crypto.randomBytes(12); // Standard 12-byte IV for AES-GCM
    const cipher = crypto.createCipheriv(GCM_ALGORITHM, SECRET_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex'); // 16-byte authentication tag

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err.message);
    return text;
  }
};

/**
 * Decrypt string back into plaintext with integrity verification
 * Supports:
 *  1. Modern AES-256-GCM ("iv:tag:ciphertext") - Authenticated with integrity check
 *  2. Legacy AES-256-CBC ("iv:ciphertext") - Backward compatibility
 *  3. Plaintext fallback for unencrypted legacy fields
 * 
 * @param {string} text - Encrypted string
 * @returns {string} Decrypted plaintext string
 */
const decrypt = (text) => {
  if (!text || typeof text !== 'string') return text;
  if (!text.includes(':')) return text; // Plaintext fallback

  const parts = text.split(':');

  // 1. Authenticated AES-256-GCM format: iv:tag:encryptedHex
  if (parts.length === 3) {
    const [ivHex, authTagHex, encryptedHex] = parts;
    if (!ivHex || !authTagHex || !encryptedHex) return text;

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(GCM_ALGORITHM, SECRET_KEY, iv);
      
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8'); // Will throw error if tag or ciphertext is tampered
      return decrypted;
    } catch (err) {
      console.error('[SECURITY WARNING] Decryption/Integrity verification failed (Data may have been altered or corrupted):', err.message);
      return ''; // Refuse to return tampered plaintext
    }
  }

  // 2. Legacy AES-256-CBC fallback: iv:encryptedHex
  if (parts.length === 2) {
    const [ivHex, encryptedHex] = parts;
    if (!ivHex || !encryptedHex || ivHex.length !== 32) return text;

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(CBC_ALGORITHM, LEGACY_SECRET_KEY, iv);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.warn('Legacy CBC decryption failed:', err.message);
      return text;
    }
  }

  return text;
};

module.exports = {
  encrypt,
  decrypt,
};

