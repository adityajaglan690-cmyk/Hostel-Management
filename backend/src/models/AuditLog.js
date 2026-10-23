const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actor_role: {
      type: String
    },
    actor_name: {
      type: String
    },
    action: {
      type: String,
      required: true // e.g. LOGIN, UPDATE_PARENT, APPROVE_OUTPASS, REJECT_OUTPASS, EXTENSION_APPROVE, REVOKE_QR, REGENERATE_QR, GATE_CHANGE, BULK_IMPORT
    },
    entity_type: {
      type: String,
      required: true // e.g. User, Student, Parent, OutpassRequest, Gate, GateScanner
    },
    entity_id: {
      type: String
    },
    old_value: {
      type: mongoose.Schema.Types.Mixed
    },
    new_value: {
      type: mongoose.Schema.Types.Mixed
    },
    reason: {
      type: String
    },
    ip_address: {
      type: String
    },
    user_agent: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ entity_type: 1, entity_id: 1 });
auditLogSchema.index({ actor_id: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
