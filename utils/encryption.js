const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync(
  process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'crevionads_crm_encryption_key_2026',
  'salt',
  32
);

/**
 * Encrypt plaintext string into IV:EncryptedHex string
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Encrypted string in format "iv:encryptedHex"
 */
const encrypt = (text) => {
  if (!text || typeof text !== 'string') return text;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return text;
  }
};

/**
 * Decrypt IV:EncryptedHex string back into plaintext string
 * @param {string} text - Encrypted string in format "iv:encryptedHex"
 * @returns {string} Decrypted plaintext string
 */
const decrypt = (text) => {
  if (!text || typeof text !== 'string') return text;
  if (!text.includes(':')) return text; // Plaintext fallback for legacy records
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text;
    const [ivHex, encryptedHex] = parts;
    if (!ivHex || !encryptedHex || ivHex.length !== 32) return text;

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Return original text if decryption fails or text is unencrypted
    return text;
  }
};

module.exports = {
  encrypt,
  decrypt,
};
