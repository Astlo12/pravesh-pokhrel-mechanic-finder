const authenticate = require('./auth');

const adminAuth = (req, res, next) => {
  authenticate(req, res, () => {
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
  });
};

module.exports = adminAuth;

