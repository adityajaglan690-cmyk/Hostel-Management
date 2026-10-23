const express = require('express');
const router = express.Router();
const GateController = require('../controllers/gateController');
const { authenticateScanner } = require('../middleware/scannerAuth');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { scanLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../config/constants');

// Gate Scan endpoint (Authenticates via Scanner Device Key or Logged-in Guard Kiosk)
router.post('/scan', scanLimiter, authenticateScanner, GateController.scan);

// Scanner Heartbeat
router.post('/heartbeat', authenticateScanner, GateController.heartbeat);

// Gate & Scanner public / authenticated listings
router.get('/list', authenticate, GateController.listGates);
router.get('/scanners', authenticate, GateController.listScanners);
router.get('/logs', authenticate, authorize(ROLES.SECURITY_GUARD, ROLES.ADMIN, ROLES.WARDEN), GateController.getGateLogs);

module.exports = router;
