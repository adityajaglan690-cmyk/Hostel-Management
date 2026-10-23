const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs for auth routes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  }
});

const scanLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // Scanners can make up to 120 scans per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Gate scanner rate limit reached. Please wait.'
  }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { authLimiter, scanLimiter, generalLimiter };
