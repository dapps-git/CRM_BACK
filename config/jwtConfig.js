const crypto = require('crypto');

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET must be defined in environment variables.');
  process.exit(1);
}

const rawSecret = process.env.JWT_SECRET;

const ENCRYPTED_JWT_SECRET = crypto
  .createHash('sha256')
  .update(rawSecret)
  .digest('hex');

module.exports = ENCRYPTED_JWT_SECRET;

