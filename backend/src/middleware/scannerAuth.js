const GateScanner = require('../models/GateScanner');
const Gate = require('../models/Gate');
const SecurityEvent = require('../models/SecurityEvent');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('./authMiddleware');
const { GATE_STATUS, SCANNER_STATUS } = require('../config/constants');

const authenticateScanner = async (req, res, next) => {
  try {
    const scannerCode = req.headers['x-scanner-code'] || req.body.scanner_code;
    const apiKey = req.headers['x-api-key'] || req.body.api_key;
    const authHeader = req.headers.authorization;

    // Case 1: Direct device authentication with scanner_code and api_key
    if (scannerCode && apiKey) {
      const scanner = await GateScanner.findOne({ scanner_code: scannerCode.toUpperCase() });
      if (!scanner) {
        await SecurityEvent.create({
          event_type: 'FAKE_SCANNER_ATTEMPT',
          severity: 'HIGH',
          description: `Unregistered scanner code used: ${scannerCode}`,
          ip_address: req.ip
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid scanner device credentials'
        });
      }

      if (scanner.status !== SCANNER_STATUS.ONLINE) {
        return res.status(403).json({
          success: false,
          message: `Scanner device is currently ${scanner.status.toLowerCase()}`
        });
      }

      const isValidKey = await scanner.compareApiKey(apiKey);
      if (!isValidKey) {
        await SecurityEvent.create({
          event_type: 'INVALID_SCANNER_KEY',
          severity: 'HIGH',
          description: `Invalid API key for scanner: ${scannerCode}`,
          ip_address: req.ip
        });
        return res.status(401).json({
          success: false,
          message: 'Scanner authentication failed: Invalid API key'
        });
      }

      const gate = await Gate.findById(scanner.gate_id);
      if (!gate || gate.status !== GATE_STATUS.OPEN) {
        return res.status(403).json({
          success: false,
          message: `Gate ${gate ? gate.gate_code : 'Unknown'} is currently ${gate ? gate.status.toLowerCase() : 'unavailable'}`
        });
      }

      // Update scanner heartbeat & last seen
      scanner.last_seen_at = new Date();
      await scanner.save();

      req.scanner = scanner;
      req.gate = gate;
      return next();
    }

    // Case 2: Authenticated Security Guard operating via kiosk/camera scanner
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired guard session' });
      }

      const user = await User.findById(decoded.userId);
      if (!user || user.role !== 'SECURITY_GUARD' && user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Access denied: Requires Security Guard or Admin' });
      }

      req.user = user;

      // Validate gate
      const gateCode = req.headers['x-gate-code'] || req.body.gate_code;
      let gate;
      if (gateCode) {
        gate = await Gate.findOne({ gate_code: gateCode.toUpperCase() });
      } else {
        // Default to first open gate if not explicitly passed
        gate = await Gate.findOne({ status: GATE_STATUS.OPEN });
      }

      if (!gate) {
        return res.status(404).json({ success: false, message: 'Active gate not found' });
      }

      if (gate.status !== GATE_STATUS.OPEN) {
        return res.status(403).json({ success: false, message: `Gate ${gate.gate_code} is ${gate.status.toLowerCase()}` });
      }

      let scanner;
      if (scannerCode) {
        scanner = await GateScanner.findOne({ scanner_code: scannerCode.toUpperCase() });
      }
      if (!scanner) {
        scanner = await GateScanner.findOne({ gate_id: gate._id, status: SCANNER_STATUS.ONLINE });
      }

      req.gate = gate;
      req.scanner = scanner;
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Scanner device credentials or Security Guard authorization required'
    });
  } catch (error) {
    console.error('Scanner auth error:', error);
    return res.status(500).json({ success: false, message: 'Scanner authentication error' });
  }
};

module.exports = { authenticateScanner };
