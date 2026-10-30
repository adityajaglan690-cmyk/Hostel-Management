const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../config/constants');

// Public endpoints
router.post('/login', authLimiter, AuthController.login);
router.post('/register', authLimiter, AuthController.registerStudent);
router.post('/student/forgot-password', authLimiter, AuthController.requestStudentPasswordReset);
router.post('/student/reset-password', authLimiter, AuthController.resetStudentPassword);

// Staff accounts can only be provisioned by an authenticated administrator.
router.post('/register-staff', authLimiter, authenticate, authorize(ROLES.ADMIN), AuthController.registerStaff);

// Other protected endpoints
router.get('/profile', authenticate, AuthController.getProfile);

module.exports = router;
