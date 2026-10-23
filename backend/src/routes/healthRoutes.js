const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const GateScanner = require('../models/GateScanner');

router.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
    const totalScanners = await GateScanner.countDocuments();
    const onlineScanners = await GateScanner.countDocuments({ status: 'ONLINE' });

    const uptime = process.uptime();

    res.status(200).json({
      status: 'HEALTHY',
      timestamp: new Date(),
      uptimeSeconds: Math.round(uptime),
      services: {
        api: 'UP',
        database: dbStatus,
        backgroundJobs: 'RUNNING',
        scanners: {
          total: totalScanners,
          online: onlineScanners
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'DEGRADED',
      error: error.message
    });
  }
});

module.exports = router;
