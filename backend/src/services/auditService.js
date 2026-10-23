const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  actor,
  action,
  entity_type,
  entity_id,
  old_value = null,
  new_value = null,
  reason = '',
  req = null
}) => {
  try {
    await AuditLog.create({
      actor_id: actor ? actor._id : null,
      actor_role: actor ? actor.role : 'SYSTEM',
      actor_name: actor ? actor.name : 'System Background Job',
      action,
      entity_type,
      entity_id: entity_id ? String(entity_id) : '',
      old_value,
      new_value,
      reason,
      ip_address: req ? (req.ip || req.connection?.remoteAddress) : '127.0.0.1',
      user_agent: req ? req.headers['user-agent'] : 'Server Process'
    });
  } catch (error) {
    console.error('[AuditService] Failed to record audit log:', error);
  }
};

module.exports = { logAudit };
