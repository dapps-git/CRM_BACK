const crypto = require('crypto');

// Raw secret key string from env
const rawSecret = process.env.JWT_SECRET || 'supersecretjwtkey_crevionads_12345';

// Derives a cryptographically hashed, 256-bit high-entropy secret key for HMAC-SHA256 JWT signing
const ENCRYPTED_JWT_SECRET = crypto
  .createHash('sha256')
  .update(rawSecret)
  .digest('hex');

module.exports = ENCRYPTED_JWT_SECRET;
