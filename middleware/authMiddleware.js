const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  } else if (req.query && req.query.token) {
    token = req.query.token;
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
