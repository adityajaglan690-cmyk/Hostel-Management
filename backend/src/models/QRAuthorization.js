const mongoose = require('mongoose');
const { QR_STATUS } = require('../config/constants');

const qrAuthorizationSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    permanent_qr_id: {
      type: String,
      required: true
    },
    outpass_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutpassRequest',
      required: true
    },
    status: {
      type: String,
      enum: Object.values(QR_STATUS),
      default: QR_STATUS.ACTIVE
    },
    timer_started_at: {
      type: Date,
      required: true
    },
    expires_at: {
      type: Date,
      required: true
    },
    grace_entry_until: {
      type: Date,
      required: true
    },
    grace_extension_used: {
      type: Boolean,
      default: false
    },
    last_event: {
      type: String,
      enum: ['ENTRY', 'EXIT', 'NONE'],
      default: 'NONE'
    },
    revoked_at: {
      type: Date
    },
    revoked_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    revocation_reason: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

qrAuthorizationSchema.index({ permanent_qr_id: 1, status: 1 });
qrAuthorizationSchema.index({ student_id: 1, status: 1 });
qrAuthorizationSchema.index({ expires_at: 1 });

module.exports = mongoose.model('QRAuthorization', qrAuthorizationSchema);
