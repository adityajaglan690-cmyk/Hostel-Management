const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['GENERAL', 'HOSTEL', 'CURFEW', 'HOLIDAY', 'EMERGENCY'],
      default: 'GENERAL'
    },
    target_role: {
      type: String,
      enum: ['ALL', 'STUDENT', 'WARDEN', 'SECURITY_GUARD'],
      default: 'ALL'
    },
    target_hostel: {
      type: String,
      default: 'ALL'
    },
    published_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    is_active: {
      type: Boolean,
      default: true
    },
    expires_at: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

noticeSchema.index({ target_role: 1, target_hostel: 1, is_active: 1 });
noticeSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notice', noticeSchema);
