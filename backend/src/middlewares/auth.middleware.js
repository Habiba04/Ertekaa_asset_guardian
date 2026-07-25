const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Verifies the Bearer JWT on the Authorization header and attaches
 * the authenticated user (minus password hash) to req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User no longer active or does not exist.' });
    }

    req.user = user.toSafeJSON();
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

/**
 * Restricts a route to one or more roles.
 * Usage: requireRole('SUPER_ADMIN', 'IT_ADMIN')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions for this action.' });
    }
    return next();
  };
}

/** Read-only auditors may never mutate data. */
function blockReadOnly(req, res, next) {
  if (req.user?.role === 'READ_ONLY_AUDITOR') {
    return res.status(403).json({ message: 'Read-Only Auditor accounts cannot modify data.' });
  }
  return next();
}

module.exports = { requireAuth, requireRole, blockReadOnly };
