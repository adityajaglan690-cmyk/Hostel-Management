const mongoose = require('mongoose');
const { GATE_STATUS } = require('../config/constants');

const gateSchema = new mongoose.Schema(
  {
    gate_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true // e.g. GATE-001
    },
    gate_name: {
      type: String,
      required: true,
      trim: true // e.g. Main Entrance Gate
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(GATE_STATUS),
      default: GATE_STATUS.OPEN
    }
  },
  {
    timestamps: true
  }
);

gateSchema.index({ status: 1 });

module.exports = mongoose.model('Gate', gateSchema);
