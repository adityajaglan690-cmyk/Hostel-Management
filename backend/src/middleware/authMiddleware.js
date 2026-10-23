const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const { USER_STATUS } = require('../config/constants');

const JWT_SECRET = process.env.JWT_SECRET || 'hostel_outpass_jwt_secret_key_2026_mca_project';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session token has expired. Please login again.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Fetch user from DB to verify current state & role
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or revoked'
      });
    }

    // Check account status and lock
    if (user.status === USER_STATUS.LOCKED || user.isLocked()) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked due to security policy. Please contact administrator.'
      });
    }

    if (user.status === USER_STATUS.INACTIVE || user.status === USER_STATUS.SUSPENDED) {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}. Access denied.`
      });
    }

    // Strict Database Role Cross-Check against Token Role
    if (user.role !== decoded.role) {
      return res.status(403).json({
        success: false,
        message: 'Security Alert: Role mismatch detected. Authorization denied.'
      });
    }

    req.user = user;

    // If Student, attach student document
    if (user.role === 'STUDENT') {
      const student = await Student.findOne({ user_id: user._id });
      if (student) {
        req.student = student;
      }
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

module.exports = { authenticate, JWT_SECRET };
