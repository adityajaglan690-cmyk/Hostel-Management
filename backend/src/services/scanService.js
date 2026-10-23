const Student = require('../models/Student');
const OutpassRequest = require('../models/OutpassRequest');
const QRAuthorization = require('../models/QRAuthorization');
const ScanLog = require('../models/ScanLog');
const SecurityEvent = require('../models/SecurityEvent');
const NotificationService = require('./notificationService');
const { SCAN_EVENT_TYPE, SCAN_RESULT, MOVEMENT_STATUS, OUTPASS_STATUS, DEFAULT_GRACE_MINUTES } = require('../config/constants');

class ScanService {
  /**
   * Process a QR scan at a gate scanner
   * Authoritative server time is used throughout.
   */
  static async processScan({
    qr_data,
    scanner,
    gate,
    guard = null,
    overrideEventType = null,
    idempotencyKey = null,
    io = null
  }) {
    const serverTime = new Date();
    const cleanQR = (qr_data || '').trim();

    // 1. Identify Student by QR code or ID
    let student = await Student.findOne({
      $or: [
        { permanent_qr_id: cleanQR },
        { student_id: cleanQR.toUpperCase() }
      ]
    }).populate('user_id');

    if (!student) {
      await SecurityEvent.create({
        event_type: 'INVALID_QR_SCAN',
        severity: 'MEDIUM',
        description: `Scanned unregistered QR code: ${cleanQR} at Gate ${gate.gate_code}`,
        metadata: { gate_code: gate.gate_code, qr_data: cleanQR }
      });

      return {
        success: false,
        result: SCAN_RESULT.DENIED,
        rejection_reason: 'Invalid or unregistered QR code identity',
        student: null,
        serverTime
      };
    }

    // Check student account status
    if (student.status === 'SUSPENDED' || student.status === 'BLOCKED') {
      await this.recordScanLog({
        student_id: student._id,
        gate_id: gate._id,
        scanner_id: scanner ? scanner._id : null,
        guard_id: guard ? guard._id : null,
        event_type: student.movement_status === MOVEMENT_STATUS.INSIDE ? SCAN_EVENT_TYPE.EXIT : SCAN_EVENT_TYPE.ENTRY,
        result: SCAN_RESULT.DENIED,
        rejection_reason: `Student status is ${student.status}. Movement prohibited.`,
        idempotency_key: idempotencyKey
      });

      return {
        success: false,
        result: SCAN_RESULT.DENIED,
        rejection_reason: `Student account is ${student.status}. Movement prohibited.`,
        student: this.sanitizeStudentForGuard(student),
        serverTime
      };
    }

    if (student.qr_status === 'REVOKED') {
      await this.recordScanLog({
        student_id: student._id,
        gate_id: gate._id,
        scanner_id: scanner ? scanner._id : null,
        guard_id: guard ? guard._id : null,
        event_type: student.movement_status === MOVEMENT_STATUS.INSIDE ? SCAN_EVENT_TYPE.EXIT : SCAN_EVENT_TYPE.ENTRY,
        result: SCAN_RESULT.DENIED,
        rejection_reason: 'Student QR code identity has been REVOKED by Administration',
        idempotency_key: idempotencyKey
      });

      return {
        success: false,
        result: SCAN_RESULT.DENIED,
        rejection_reason: 'Student QR identity has been REVOKED by Administration. Please visit hostel office.',
        student: this.sanitizeStudentForGuard(student),
        serverTime
      };
    }

    // 2. Replay Protection - check for rapid duplicate scans (< 3 seconds)
    const recentScan = await ScanLog.findOne({
      student_id: student._id,
      scanned_at: { $gte: new Date(serverTime.getTime() - 3000) }
    });

    if (recentScan) {
      return {
        success: false,
        result: SCAN_RESULT.DENIED,
        rejection_reason: 'Replay scan detected: Scan already processed seconds ago.',
        student: this.sanitizeStudentForGuard(student),
        serverTime
      };
    }

    // 3. Find current active/approved outpass for this student
    const activeOutpass = await OutpassRequest.findOne({
      student_id: student._id,
      status: { $in: [OUTPASS_STATUS.APPROVED, OUTPASS_STATUS.ACTIVE] }
    }).sort({ createdAt: -1 });

    if (!activeOutpass) {
      // Permanent QR without approved leave does NOT grant exit
      const intendedEvent = student.movement_status === MOVEMENT_STATUS.INSIDE ? SCAN_EVENT_TYPE.EXIT : SCAN_EVENT_TYPE.ENTRY;

      await this.recordScanLog({
        student_id: student._id,
        gate_id: gate._id,
        scanner_id: scanner ? scanner._id : null,
        guard_id: guard ? guard._id : null,
        event_type: intendedEvent,
        result: SCAN_RESULT.DENIED,
        rejection_reason: 'No approved or active outpass found for student',
        idempotency_key: idempotencyKey
      });

      return {
        success: false,
        result: SCAN_RESULT.DENIED,
        rejection_reason: 'No approved or active outpass found. Permanent QR does not grant authorization.',
        student: this.sanitizeStudentForGuard(student),
        serverTime
      };
    }

    // 4. Time Window & Grace Validation
    const approvedStart = new Date(activeOutpass.approved_start_time || activeOutpass.requested_start_time);
    const approvedEnd = new Date(activeOutpass.approved_end_time || activeOutpass.requested_end_time);
    const graceEnd = new Date(approvedEnd.getTime() + DEFAULT_GRACE_MINUTES * 60 * 1000);

    // Determine event type:
    // If student is INSIDE, next valid event is EXIT.
    // If student is OUTSIDE, next valid event is ENTRY.
    let eventType = overrideEventType;
    if (!eventType) {
      eventType = student.movement_status === MOVEMENT_STATUS.INSIDE ? SCAN_EVENT_TYPE.EXIT : SCAN_EVENT_TYPE.ENTRY;
    }

    // Validate Movement Direction Transitions
    if (student.movement_status === MOVEMENT_STATUS.OUTSIDE && eventType === SCAN_EVENT_TYPE.EXIT) {
      await this.recordScanLog({
        student_id: student._id,
        outpass_id: activeOutpass._id,
        gate_id: gate._id,
        scanner_id: scanner ? scanner._id : null,
        guard_id: guard ? guard._id : null,
        event_type: SCAN_EVENT_TYPE.EXIT,
        result: SCAN_RESULT.DENIED,
        rejection_reason: 'Student is already recorded as OUTSIDE',
        idempotency_key: idempotencyKey
      });

      return {
        success: false,
        result: SCAN_RESULT.DENIED,
        rejection_reason: 'Invalid movement: Student is already OUTSIDE. Cannot perform EXIT.',
        student: this.sanitizeStudentForGuard(student),
        serverTime
      };
    }

    if (student.movement_status === MOVEMENT_STATUS.INSIDE && eventType === SCAN_EVENT_TYPE.ENTRY) {
      await this.recordScanLog({
        student_id: student._id,
        outpass_id: activeOutpass._id,
        gate_id: gate._id,
        scanner_id: scanner ? scanner._id : null,
        guard_id: guard ? guard._id : null,
        event_type: SCAN_EVENT_TYPE.ENTRY,
        result: SCAN_RESULT.DENIED,
        rejection_reason: 'Student is already recorded as INSIDE',
        idempotency_key: idempotencyKey
      });

      return {
        success: false,
        result: SCAN_RESULT.DENIED,
        rejection_reason: 'Invalid movement: Student is already INSIDE. Cannot perform ENTRY.',
        student: this.sanitizeStudentForGuard(student),
        serverTime
      };
    }

    // If EXIT: Verify start time and expiry
    if (eventType === SCAN_EVENT_TYPE.EXIT) {
      if (serverTime < approvedStart) {
        const minutesUntilStart = Math.ceil((approvedStart - serverTime) / 60000);
        await this.recordScanLog({
          student_id: student._id,
          outpass_id: activeOutpass._id,
          gate_id: gate._id,
          scanner_id: scanner ? scanner._id : null,
          guard_id: guard ? guard._id : null,
          event_type: SCAN_EVENT_TYPE.EXIT,
          result: SCAN_RESULT.DENIED,
          rejection_reason: `Exit before approved start time. Starts in ${minutesUntilStart} min.`,
          idempotency_key: idempotencyKey
        });

        return {
          success: false,
          result: SCAN_RESULT.DENIED,
          rejection_reason: `EXIT DENIED: Outpass starts at ${approvedStart.toLocaleTimeString()} (in ${minutesUntilStart} mins).`,
          student: this.sanitizeStudentForGuard(student),
          outpass: this.sanitizeOutpass(activeOutpass),
          serverTime
        };
      }

      if (serverTime > approvedEnd) {
        await this.recordScanLog({
          student_id: student._id,
          outpass_id: activeOutpass._id,
          gate_id: gate._id,
          scanner_id: scanner ? scanner._id : null,
          guard_id: guard ? guard._id : null,
          event_type: SCAN_EVENT_TYPE.EXIT,
          result: SCAN_RESULT.DENIED,
          rejection_reason: 'Exit attempted after approved outpass expired',
          idempotency_key: idempotencyKey
        });

        return {
          success: false,
          result: SCAN_RESULT.DENIED,
          rejection_reason: 'EXIT DENIED: Outpass approved window has already expired.',
          student: this.sanitizeStudentForGuard(student),
          outpass: this.sanitizeOutpass(activeOutpass),
          serverTime
        };
      }
    }

    // If ENTRY: Verify grace period and late status
    let isGraceEntry = false;
    let isLate = false;
    let lateMinutes = 0;

    if (eventType === SCAN_EVENT_TYPE.ENTRY) {
      if (serverTime > approvedEnd && serverTime <= graceEnd) {
        // Within 15-minute grace period
        isGraceEntry = true;
      } else if (serverTime > graceEnd) {
        // Returned after grace period
        isLate = true;
        lateMinutes = Math.round((serverTime - approvedEnd) / (1000 * 60));
      }
    }

    // 5. Execute Atomic Movement Transition
    const prevMovement = student.movement_status;
    const nextMovement = eventType === SCAN_EVENT_TYPE.EXIT ? MOVEMENT_STATUS.OUTSIDE : MOVEMENT_STATUS.INSIDE;
    const transitionStr = `${prevMovement} -> ${nextMovement}`;

    student.movement_status = nextMovement;
    await student.save();

    // Update Outpass state
    if (eventType === SCAN_EVENT_TYPE.EXIT) {
      activeOutpass.status = OUTPASS_STATUS.ACTIVE;
      if (!activeOutpass.first_exit_at) {
        activeOutpass.first_exit_at = serverTime;
      }
      await activeOutpass.save();
    } else if (eventType === SCAN_EVENT_TYPE.ENTRY) {
      activeOutpass.actual_return = serverTime;
      activeOutpass.final_entry_at = serverTime;

      if (isGraceEntry) {
        activeOutpass.grace_extension_used = true;
        activeOutpass.return_status = 'ON_TIME';
      } else if (isLate) {
        activeOutpass.return_status = 'LATE';
        activeOutpass.late_minutes = lateMinutes;
        activeOutpass.status = OUTPASS_STATUS.LATE;
      } else {
        activeOutpass.return_status = 'ON_TIME';
        activeOutpass.late_minutes = 0;
      }

      // If Home Leave or Emergency Leave, or if at/past expiry, complete the outpass
      if (activeOutpass.type === 'HOME_LEAVE' || activeOutpass.type === 'EMERGENCY_LEAVE' || serverTime >= approvedEnd) {
        if (activeOutpass.status !== OUTPASS_STATUS.LATE) {
          activeOutpass.status = OUTPASS_STATUS.EXPIRED;
        }
      }

      await activeOutpass.save();
    }

    // Record verified Scan Log
    const scanLog = await this.recordScanLog({
      student_id: student._id,
      outpass_id: activeOutpass._id,
      gate_id: gate._id,
      scanner_id: scanner ? scanner._id : null,
      guard_id: guard ? guard._id : null,
      event_type: eventType,
      result: SCAN_RESULT.ALLOWED,
      rejection_reason: null,
      idempotency_key: idempotencyKey,
      movement_transition: transitionStr
    });

    // Notify student & parent on movement
    const movementMsg = eventType === SCAN_EVENT_TYPE.EXIT
      ? `EXIT recorded at Gate ${gate.gate_code} at ${serverTime.toLocaleTimeString()}. Expected return by ${approvedEnd.toLocaleTimeString()}.`
      : `ENTRY recorded at Gate ${gate.gate_code} at ${serverTime.toLocaleTimeString()}. Status: ${isLate ? `LATE by ${lateMinutes} min` : (isGraceEntry ? 'Returned in Grace Period' : 'On Time')}.`;

    NotificationService.notifyStudentAndParent({
      student,
      outpass: activeOutpass,
      type: eventType === SCAN_EVENT_TYPE.EXIT ? 'GATE_EXIT' : 'GATE_ENTRY',
      title: `Hostel Gate ${eventType} Recorded`,
      studentMessage: movementMsg,
      parentMessage: `Hostel Gate Update: Student ${student.name} (${student.student_id}) has completed ${eventType} at Gate ${gate.gate_code} at ${serverTime.toLocaleTimeString()}.`,
      io
    });

    // Real-time broadcast for live dashboard sync
    if (io) {
      io.emit('scan_event', {
        scanId: scanLog._id,
        student: this.sanitizeStudentForGuard(student),
        gate: { gate_code: gate.gate_code, gate_name: gate.gate_name },
        eventType,
        result: SCAN_RESULT.ALLOWED,
        transition: transitionStr,
        isGraceEntry,
        isLate,
        lateMinutes,
        scannedAt: serverTime
      });
    }

    return {
      success: true,
      result: SCAN_RESULT.ALLOWED,
      eventType,
      movementTransition: transitionStr,
      isGraceEntry,
      isLate,
      lateMinutes,
      rejection_reason: null,
      student: this.sanitizeStudentForGuard(student),
      outpass: this.sanitizeOutpass(activeOutpass),
      gate: { gate_code: gate.gate_code, gate_name: gate.gate_name },
      serverTime
    };
  }

  static async recordScanLog(params) {
    try {
      return await ScanLog.create(params);
    } catch (err) {
      console.error('Failed to record scan log:', err);
      return null;
    }
  }

  static sanitizeStudentForGuard(student) {
    // Guard must ONLY see operational data - NEVER parent contacts or unnecessary sensitive info
    return {
      _id: student._id,
      student_id: student.student_id,
      name: student.name,
      course: student.course,
      department: student.department,
      hostel: student.hostel,
      block: student.block,
      room: student.room,
      movement_status: student.movement_status,
      photo_url: student.photo_url || ''
    };
  }

  static sanitizeOutpass(outpass) {
    return {
      _id: outpass._id,
      type: outpass.type,
      reason: outpass.reason,
      destination: outpass.destination,
      approved_start_time: outpass.approved_start_time || outpass.requested_start_time,
      approved_end_time: outpass.approved_end_time || outpass.requested_end_time,
      status: outpass.status,
      grace_extension_used: outpass.grace_extension_used,
      first_exit_at: outpass.first_exit_at,
      actual_return: outpass.actual_return
    };
  }
}

module.exports = ScanService;
