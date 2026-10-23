const { ROLES } = require('../config/constants');
const SecurityEvent = require('../models/SecurityEvent');

const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log security event for unauthorized access attempt
      try {
        await SecurityEvent.create({
          event_type: 'UNAUTHORIZED_API_ACCESS_ATTEMPT',
          severity: 'MEDIUM',
          description: `User ${req.user.college_id} (${req.user.role}) attempted unauthorized access to ${req.originalUrl} requiring [${allowedRoles.join(', ')}]`,
          user_id: req.user._id,
          college_id: req.user.college_id,
          ip_address: req.ip || req.connection.remoteAddress,
          metadata: { path: req.originalUrl, method: req.method, requiredRoles: allowedRoles }
        });
      } catch (err) {
        console.error('Failed to log security event:', err);
      }

      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to authorized roles [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
};

module.exports = { authorize };
