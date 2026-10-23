const mongoose = require('mongoose');
const { SCAN_EVENT_TYPE, SCAN_RESULT } = require('../config/constants');

const scanLogSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    outpass_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutpassRequest'
    },
    scanner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GateScanner'
    },
    gate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gate',
      required: true
    },
    guard_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    event_type: {
      type: String,
      enum: Object.values(SCAN_EVENT_TYPE),
      required: true
    },
    scanned_at: {
      type: Date,
      default: Date.now,
      required: true
    },
    device_verified: {
      type: Boolean,
      default: true
    },
    result: {
      type: String,
      enum: Object.values(SCAN_RESULT),
      required: true
    },
    rejection_reason: {
      type: String,
      default: null
    },
    idempotency_key: {
      type: String
    },
    movement_transition: {
      type: String // e.g. 'INSIDE -> OUTSIDE' or 'OUTSIDE -> INSIDE'
    }
  },
  {
    timestamps: true
  }
);

scanLogSchema.index({ student_id: 1, scanned_at: -1 });
scanLogSchema.index({ gate_id: 1, scanned_at: -1 });
scanLogSchema.index({ result: 1 });
scanLogSchema.index({ scanned_at: -1 });

module.exports = mongoose.model('ScanLog', scanLogSchema);
