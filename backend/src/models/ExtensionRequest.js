const mongoose = require('mongoose');

const extensionRequestSchema = new mongoose.Schema(
  {
    outpass_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutpassRequest',
      required: true
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    requested_new_end_time: {
      type: Date,
      required: true
    },
    approved_new_end_time: {
      type: Date
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approval_comment: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

extensionRequestSchema.index({ outpass_id: 1 });
extensionRequestSchema.index({ student_id: 1, status: 1 });

module.exports = mongoose.model('ExtensionRequest', extensionRequestSchema);
