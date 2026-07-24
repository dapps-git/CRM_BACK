const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // 1. Check req.query.token
  if (req.query && req.query.token) {
    token = req.query.token;
  }

  // 2. Check URL searchParams directly from req.url (bulletproof for Passenger / cPanel)
  if (!token && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      token = parsedUrl.searchParams.get('token');
    } catch (e) {}
  }

  // 3. Check originalUrl searchParams (bulletproof for Express routers)
  if (!token && req.originalUrl) {
    try {
      const parsedOriginal = new URL(req.originalUrl, 'http://localhost');
      token = parsedOriginal.searchParams.get('token');
    } catch (e) {}
  }

  // 4. Check headers fallback
  if (!token) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey_crevionads_12345');
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found', code: 'USER_NOT_FOUND' });
      }
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expired, please log in again', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ message: 'Not authorized, token invalid', code: 'TOKEN_INVALID' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token', code: 'NO_TOKEN' });
};

module.exports = { protect };
