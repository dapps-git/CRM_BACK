const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ENCRYPTED_JWT_SECRET = require('../config/jwtConfig');

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

  // 4. Check headers (supports Bearer, Apache HTTP_AUTHORIZATION, and custom headers)
  if (!token) {
    const authHeader = req.headers.authorization || 
                       req.headers.Authorization || 
                       req.headers.http_authorization || 
                       req.headers.HTTP_AUTHORIZATION;

    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    } else if (authHeader && authHeader.length > 20) {
      token = authHeader;
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    } else if (req.headers['X-Auth-Token']) {
      token = req.headers['X-Auth-Token'];
    } else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
    }
  }

  // 5. Check req.body.token
  if (!token && req.body && req.body.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided', code: 'NO_TOKEN' });
  }

  try {
    const decoded = jwt.verify(token, ENCRYPTED_JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found', code: 'USER_NOT_FOUND' });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ 
      message: error.name === 'TokenExpiredError' ? 'Session expired, please login again' : 'Not authorized, token invalid', 
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED' 
    });
  }
};

module.exports = { protect };
