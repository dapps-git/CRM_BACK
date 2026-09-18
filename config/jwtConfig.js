const crypto = require('crypto');
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true }); } catch (e) {}

const rawSecret = process.env.JWT_SECRET || 'supersecretjwtkey_crevionads_12345';

const ENCRYPTED_JWT_SECRET = crypto
  .createHash('sha256')
  .update(rawSecret)
  .digest('hex');

module.exports = ENCRYPTED_JWT_SECRET;

