const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Public endpoints
router.post('/login', authLimiter, AuthController.login);
router.post('/register', authLimiter, AuthController.registerStudent);
router.post('/register-staff', authLimiter, AuthController.registerStaff);

// Protected endpoints
router.get('/profile', authenticate, AuthController.getProfile);

module.exports = router;
