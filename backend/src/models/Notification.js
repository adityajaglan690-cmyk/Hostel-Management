const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient_type: {
      type: String,
      enum: ['STUDENT', 'PARENT', 'WARDEN', 'DEAN', 'ADMIN', 'SECURITY_GUARD'],
      required: true
    },
    recipient_id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'recipient_type_model'
    },
    recipient_contact: {
      type: String // phone or email
    },
    outpass_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutpassRequest'
    },
    type: {
      type: String,
      required: true // e.g. OUTPASS_APPROVED, OUTPASS_REJECTED, REMINDER_10MIN, GRACE_WARNING, LATE_RETURN, NO_SHOW, EXTENSION_APPROVED
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    channel: {
      type: String,
      enum: ['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP'],
      default: 'IN_APP'
    },
    sent_at: {
      type: Date,
      default: Date.now
    },
    read_at: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'SENT'
    },
    retry_count: {
      type: Number,
      default: 0
    },
    failure_reason: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipient_id: 1, read_at: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
