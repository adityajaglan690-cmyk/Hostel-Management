const ScanService = require('../services/scanService');
const Gate = require('../models/Gate');
const GateScanner = require('../models/GateScanner');
const ScanLog = require('../models/ScanLog');
const { SCANNER_STATUS, GATE_STATUS } = require('../config/constants');

class GateController {
  /**
   * Process QR Scan at Gate
   */
  static async scan(req, res) {
    try {
      const { qr_data, event_type, idempotency_key } = req.body;

      if (!qr_data) {
        return res.status(400).json({
          success: false,
          message: 'QR code data is required.'
        });
      }

      const io = req.app.get('io');

      const result = await ScanService.processScan({
        qr_data,
        scanner: req.scanner,
        gate: req.gate,
        guard: req.user, // If scanned by logged in security guard
        overrideEventType: event_type || null,
        idempotencyKey: idempotency_key || null,
        io
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Scan error:', error);
      return res.status(500).json({
        success: false,
        result: 'DENIED',
        message: 'Internal server error processing scan.'
      });
    }
  }

  /**
   * Scanner Heartbeat
   */
  static async heartbeat(req, res) {
    try {
      const scanner = req.scanner;
      if (scanner) {
        scanner.last_heartbeat_at = new Date();
        scanner.last_seen_at = new Date();
        scanner.status = SCANNER_STATUS.ONLINE;
        await scanner.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Heartbeat acknowledged',
        serverTime: new Date()
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Heartbeat error' });
    }
  }

  /**
   * List all Gates
   */
  static async listGates(req, res) {
    try {
      const gates = await Gate.find().sort({ gate_code: 1 });
      return res.status(200).json({ success: true, gates });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to list gates.' });
    }
  }

  /**
   * List Scanners
   */
  static async listScanners(req, res) {
    try {
      const scanners = await GateScanner.find().populate('gate_id').sort({ scanner_code: 1 });
      return res.status(200).json({ success: true, scanners });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to list scanners.' });
    }
  }

  /**
   * Get Gate Scan History for Security Guard / Kiosk Log
   */
  static async getGateLogs(req, res) {
    try {
      const { gate_id } = req.query;
      const limit = parseInt(req.query.limit) || 20;

      const query = {};
      if (gate_id) query.gate_id = gate_id;

      const logs = await ScanLog.find(query)
        .populate('student_id', 'student_id name course hostel room')
        .populate('gate_id', 'gate_code gate_name')
        .sort({ scanned_at: -1 })
        .limit(limit);

      return res.status(200).json({ success: true, logs });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch scan logs.' });
    }
  }
}

module.exports = GateController;
