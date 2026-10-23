const mongoose = require('mongoose');
const { LEAVE_TYPES, OUTPASS_STATUS } = require('../config/constants');

const outpassRequestSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    type: {
      type: String,
      enum: Object.values(LEAVE_TYPES),
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    destination: {
      type: String,
      required: true,
      trim: true
    },
    home_address: {
      type: String,
      trim: true
    },
    requested_start_time: {
      type: Date,
      required: true
    },
    requested_end_time: {
      type: Date,
      required: true
    },
    approved_start_time: {
      type: Date
    },
    approved_end_time: {
      type: Date
    },
    approved_duration_minutes: {
      type: Number
    },
    timer_started_at: {
      type: Date // Authoritative start of approved window
    },
    expires_at: {
      type: Date // Authoritative end of approved window
    },
    status: {
      type: String,
      enum: Object.values(OUTPASS_STATUS),
      default: OUTPASS_STATUS.PENDING
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejection_reason: {
      type: String,
      trim: true
    },
    approval_comment: {
      type: String,
      trim: true
    },
    cancellation_reason: {
      type: String,
      trim: true
    },
    expected_return: {
      type: Date
    },
    actual_return: {
      type: Date
    },
    return_status: {
      type: String,
      enum: ['ON_TIME', 'LATE', 'PENDING'],
      default: 'PENDING'
    },
    late_minutes: {
      type: Number,
      default: 0
    },
    grace_extension_used: {
      type: Boolean,
      default: false
    },
    first_exit_at: {
      type: Date
    },
    final_entry_at: {
      type: Date
    },
    reminder_sent: {
      type: Boolean,
      default: false
    },
    supporting_document_url: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes
outpassRequestSchema.index({ student_id: 1, status: 1 });
outpassRequestSchema.index({ status: 1 });
outpassRequestSchema.index({ expires_at: 1 });
outpassRequestSchema.index({ requested_start_time: 1, requested_end_time: 1 });
outpassRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('OutpassRequest', outpassRequestSchema);
