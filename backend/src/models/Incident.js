const mongoose = require('mongoose');
const { INCIDENT_STATUS } = require('../config/constants');

const incidentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    gate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gate'
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(INCIDENT_STATUS),
      default: INCIDENT_STATUS.OPEN
    },
    reported_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolution_notes: {
      type: String
    },
    resolved_at: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

incidentSchema.index({ status: 1 });
incidentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
