const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { SCANNER_STATUS } = require('../config/constants');

const gateScannerSchema = new mongoose.Schema(
  {
    scanner_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true // e.g. SCANNER-001
    },
    scanner_name: {
      type: String,
      required: true,
      trim: true
    },
    gate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gate',
      required: true
    },
    api_key_hash: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(SCANNER_STATUS),
      default: SCANNER_STATUS.ONLINE
    },
    registered_at: {
      type: Date,
      default: Date.now
    },
    last_seen_at: {
      type: Date,
      default: Date.now
    },
    last_heartbeat_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

gateScannerSchema.index({ gate_id: 1 });
gateScannerSchema.index({ status: 1 });

gateScannerSchema.methods.compareApiKey = async function (apiKey) {
  return bcrypt.compare(apiKey, this.api_key_hash);
};

module.exports = mongoose.model('GateScanner', gateScannerSchema);
