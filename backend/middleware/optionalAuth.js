const jwt = require('jsonwebtoken');

/**
 * Sets req.user when a valid Bearer token is present; otherwise continues without user.
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    req.user = {
      id: decoded.id,
      email: decoded.email,
      user_type: decoded.user_type,
    };
  } catch {
    // Invalid token — treat as anonymous
  }
  next();
};

module.exports = optionalAuth;
