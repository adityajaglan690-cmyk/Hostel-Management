const OutpassRequest = require('../models/OutpassRequest');
const Student = require('../models/Student');
const QRAuthorization = require('../models/QRAuthorization');
const ExtensionRequest = require('../models/ExtensionRequest');
const NotificationService = require('./notificationService');
const { logAudit } = require('./auditService');
const { OUTPASS_STATUS, DEFAULT_GRACE_MINUTES } = require('../config/constants');

class OutpassService {
  /**
   * Apply for an Outpass / Home Leave / Emergency Leave
   */
  static async createOutpass({
    student_id,
    type,
    reason,
    destination,
    home_address = null,
    requested_start_time,
    requested_end_time,
    supporting_document_url = null
  }) {
    const student = await Student.findById(student_id);
    if (!student) {
      throw new Error('Student record not found');
    }

    if (student.status !== 'ACTIVE') {
      throw new Error(`Student account is currently ${student.status}. Cannot apply for outpass.`);
    }

    const startDate = new Date(requested_start_time);
    const endDate = new Date(requested_end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date/time format provided');
    }

    if (startDate >= endDate) {
      throw new Error('Return time must be after departure time');
    }

    // Overlapping check: Verify no active or pending outpasses in the requested window
    const overlapping = await OutpassRequest.findOne({
      student_id: student._id,
      status: { $in: [OUTPASS_STATUS.PENDING, OUTPASS_STATUS.APPROVED, OUTPASS_STATUS.ACTIVE] },
      $or: [
        { requested_start_time: { $lt: endDate }, requested_end_time: { $gt: startDate } },
        { approved_start_time: { $lt: endDate }, approved_end_time: { $gt: startDate } }
      ]
    });

    if (overlapping) {
      throw new Error(`Conflicting outpass exists (${overlapping.type} #${overlapping._id.toString().slice(-6)}) with status ${overlapping.status}`);
    }

    // Dynamic duration calculation - NO hardcoded 10 or 30 days limit
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

    const outpass = await OutpassRequest.create({
      student_id: student._id,
      type,
      reason,
      destination,
      home_address: home_address || (type === 'HOME_LEAVE' ? destination : null),
      requested_start_time: startDate,
      requested_end_time: endDate,
      approved_duration_minutes: durationMinutes,
      status: OUTPASS_STATUS.PENDING,
      supporting_document_url
    });

    return outpass;
  }

  /**
   * Approve an outpass request
   */
  static async approveOutpass({
    outpass_id,
    approver,
    approved_start_time = null,
    approved_end_time = null,
    comment = 'Approved by Hostel Authority',
    req = null,
    io = null
  }) {
    const outpass = await OutpassRequest.findById(outpass_id).populate('student_id');
    if (!outpass) {
      throw new Error('Outpass request not found');
    }

    if (outpass.status !== OUTPASS_STATUS.PENDING) {
      throw new Error(`Cannot approve outpass with status: ${outpass.status}`);
    }

    const student = outpass.student_id;
    const start = approved_start_time ? new Date(approved_start_time) : outpass.requested_start_time;
    const end = approved_end_time ? new Date(approved_end_time) : outpass.requested_end_time;
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    const oldStatus = outpass.status;
    outpass.status = OUTPASS_STATUS.APPROVED;
    outpass.approved_by = approver._id;
    outpass.approved_start_time = start;
    outpass.approved_end_time = end;
    outpass.approved_duration_minutes = durationMinutes;
    outpass.timer_started_at = start;
    outpass.expires_at = end;
    outpass.expected_return = end;
    outpass.approval_comment = comment;
    await outpass.save();

    // Activate QR authorization window
    const graceEnd = new Date(end.getTime() + DEFAULT_GRACE_MINUTES * 60 * 1000);
    await QRAuthorization.findOneAndUpdate(
      { student_id: student._id, outpass_id: outpass._id },
      {
        student_id: student._id,
        permanent_qr_id: student.permanent_qr_id,
        outpass_id: outpass._id,
        status: 'ACTIVE',
        timer_started_at: start,
        expires_at: end,
        grace_entry_until: graceEnd,
        grace_extension_used: false
      },
      { upsert: true, new: true }
    );

    // Audit log
    await logAudit({
      actor: approver,
      action: 'APPROVE_OUTPASS',
      entity_type: 'OutpassRequest',
      entity_id: outpass._id,
      old_value: { status: oldStatus },
      new_value: { status: outpass.status, approved_start: start, approved_end: end },
      reason: comment,
      req
    });

    // Notify Student & Parent
    NotificationService.notifyStudentAndParent({
      student,
      outpass,
      type: 'OUTPASS_APPROVED',
      title: 'Outpass Request Approved',
      studentMessage: `Your ${outpass.type} request to ${outpass.destination} has been approved from ${start.toLocaleString()} to ${end.toLocaleString()}.`,
      parentMessage: `Dear Parent, Outpass for ${student.name} (${student.student_id}) to ${outpass.destination} has been approved from ${start.toLocaleString()} to ${end.toLocaleString()}.`,
      io
    });

    return outpass;
  }

  /**
   * Reject an outpass request
   */
  static async rejectOutpass({
    outpass_id,
    approver,
    rejection_reason,
    req = null,
    io = null
  }) {
    const outpass = await OutpassRequest.findById(outpass_id).populate('student_id');
    if (!outpass) {
      throw new Error('Outpass request not found');
    }

    if (outpass.status !== OUTPASS_STATUS.PENDING) {
      throw new Error(`Cannot reject outpass with status: ${outpass.status}`);
    }

    const oldStatus = outpass.status;
    outpass.status = OUTPASS_STATUS.REJECTED;
    outpass.approved_by = approver._id;
    outpass.rejection_reason = rejection_reason || 'Rejected by Hostel Authority';
    await outpass.save();

    await logAudit({
      actor: approver,
      action: 'REJECT_OUTPASS',
      entity_type: 'OutpassRequest',
      entity_id: outpass._id,
      old_value: { status: oldStatus },
      new_value: { status: outpass.status, rejection_reason: outpass.rejection_reason },
      reason: rejection_reason,
      req
    });

    NotificationService.notifyStudentAndParent({
      student: outpass.student_id,
      outpass,
      type: 'OUTPASS_REJECTED',
      title: 'Outpass Request Rejected',
      studentMessage: `Your ${outpass.type} request was rejected. Reason: ${outpass.rejection_reason}`,
      parentMessage: `Dear Parent, the Outpass request for ${outpass.student_id.name} was rejected. Reason: ${outpass.rejection_reason}`,
      io
    });

    return outpass;
  }

  /**
   * Cancel an outpass request (Student only before first exit)
   */
  static async cancelOutpass({ outpass_id, student_id, reason = 'Cancelled by student' }) {
    const outpass = await OutpassRequest.findOne({ _id: outpass_id, student_id });
    if (!outpass) {
      throw new Error('Outpass request not found or does not belong to you');
    }

    if (outpass.status === OUTPASS_STATUS.ACTIVE || outpass.first_exit_at) {
      throw new Error('Cannot cancel an outpass that is already ACTIVE or where EXIT has occurred');
    }

    if (![OUTPASS_STATUS.PENDING, OUTPASS_STATUS.APPROVED].includes(outpass.status)) {
      throw new Error(`Cannot cancel outpass with status: ${outpass.status}`);
    }

    outpass.status = OUTPASS_STATUS.CANCELLED;
    outpass.cancellation_reason = reason;
    await outpass.save();

    // Deactivate QR authorization if it was approved
    await QRAuthorization.updateMany(
      { outpass_id: outpass._id },
      { status: 'INACTIVE' }
    );

    return outpass;
  }

  /**
   * Request extension for an active outpass
   */
  static async requestExtension({ outpass_id, student_id, reason, requested_new_end_time }) {
    const outpass = await OutpassRequest.findOne({ _id: outpass_id, student_id });
    if (!outpass) {
      throw new Error('Active outpass not found');
    }

    if (![OUTPASS_STATUS.APPROVED, OUTPASS_STATUS.ACTIVE].includes(outpass.status)) {
      throw new Error('Extensions can only be requested for APPROVED or ACTIVE outpasses');
    }

    const newEnd = new Date(requested_new_end_time);
    const currentEnd = new Date(outpass.approved_end_time || outpass.requested_end_time);

    if (newEnd <= currentEnd) {
      throw new Error('New requested return time must be later than current return time');
    }

    const existingPending = await ExtensionRequest.findOne({
      outpass_id: outpass._id,
      status: 'PENDING'
    });

    if (existingPending) {
      throw new Error('An extension request is already pending approval for this outpass');
    }

    const extension = await ExtensionRequest.create({
      outpass_id: outpass._id,
      student_id,
      reason,
      requested_new_end_time: newEnd,
      status: 'PENDING'
    });

    return extension;
  }

  /**
   * Approve extension request
   */
  static async approveExtension({ extension_id, approver, comment = 'Extension approved', req = null, io = null }) {
    const extension = await ExtensionRequest.findById(extension_id)
      .populate('outpass_id')
      .populate('student_id');

    if (!extension || extension.status !== 'PENDING') {
      throw new Error('Valid pending extension request not found');
    }

    const outpass = extension.outpass_id;
    const student = extension.student_id;
    const oldEnd = outpass.approved_end_time;
    const newEnd = extension.requested_new_end_time;

    extension.status = 'APPROVED';
    extension.approved_by = approver._id;
    extension.approved_new_end_time = newEnd;
    extension.approval_comment = comment;
    await extension.save();

    outpass.approved_end_time = newEnd;
    outpass.expires_at = newEnd;
    outpass.expected_return = newEnd;
    outpass.approved_duration_minutes = Math.round((newEnd - outpass.approved_start_time) / (1000 * 60));
    await outpass.save();

    // Update QR authorization
    const graceEnd = new Date(newEnd.getTime() + DEFAULT_GRACE_MINUTES * 60 * 1000);
    await QRAuthorization.updateMany(
      { outpass_id: outpass._id },
      { expires_at: newEnd, grace_entry_until: graceEnd }
    );

    await logAudit({
      actor: approver,
      action: 'EXTENSION_APPROVE',
      entity_type: 'ExtensionRequest',
      entity_id: extension._id,
      old_value: { expires_at: oldEnd },
      new_value: { expires_at: newEnd },
      reason: comment,
      req
    });

    NotificationService.notifyStudentAndParent({
      student,
      outpass,
      type: 'EXTENSION_APPROVED',
      title: 'Outpass Extension Approved',
      studentMessage: `Your outpass extension has been approved. New return deadline: ${newEnd.toLocaleString()}.`,
      parentMessage: `Notice: Return time extension for ${student.name} approved until ${newEnd.toLocaleString()}.`,
      io
    });

    return { extension, outpass };
  }
}

module.exports = OutpassService;
