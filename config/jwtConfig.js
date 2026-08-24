const crypto = require('crypto');

const rawSecret = process.env.JWT_SECRET || 'crm_jwt_secure_session_secret_default';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL ERROR: JWT_SECRET must be defined in production environment variables.');
  process.exit(1);
}

const ENCRYPTED_JWT_SECRET = crypto
  .createHash('sha256')
  .update(rawSecret)
  .digest('hex');

module.exports = ENCRYPTED_JWT_SECRET;

