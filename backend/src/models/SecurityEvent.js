const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema(
  {
    event_type: {
      type: String,
      required: true // WRONG_ROLE_LOGIN_ATTEMPT, FAILED_LOGIN_ATTEMPT, ACCOUNT_LOCKED, INVALID_QR_SCAN, REPLAY_SCAN_ATTEMPT, UNAUTHORIZED_SCANNER, REPEATED_DENIED_SCAN, SUSPICIOUS_MOVEMENT
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    description: {
      type: String,
      required: true
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    college_id: {
      type: String
    },
    ip_address: {
      type: String
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

securityEventSchema.index({ event_type: 1 });
securityEventSchema.index({ severity: 1 });
securityEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
