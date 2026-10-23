const OutpassRequest = require('../models/OutpassRequest');
const Student = require('../models/Student');
const QRAuthorization = require('../models/QRAuthorization');
const GateScanner = require('../models/GateScanner');
const NotificationService = require('./notificationService');
const { OUTPASS_STATUS, MOVEMENT_STATUS, DEFAULT_GRACE_MINUTES, REMINDER_WINDOW_MINUTES, SCANNER_STATUS } = require('../config/constants');

class BackgroundJobService {
  /**
   * Run the master reconciliation cycle
   */
  static async runReconciliation(io = null) {
    const now = new Date();

    try {
      await Promise.all([
        this.process10MinuteReminders(now, io),
        this.processExpiriesAndGrace(now, io),
        this.processLateReturns(now, io),
        this.processNoShows(now, io),
        this.checkScannerHeartbeats(now, io)
      ]);
    } catch (err) {
      console.error('[BackgroundJobs] Error in reconciliation loop:', err);
    }
  }

  /**
   * 1. 10-Minute Return Reminders
   */
  static async process10MinuteReminders(now, io) {
    const reminderThreshold = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

    // Find active/approved outpasses whose expiry is within the next 10 minutes and reminder not yet sent
    const passes = await OutpassRequest.find({
      status: { $in: [OUTPASS_STATUS.APPROVED, OUTPASS_STATUS.ACTIVE] },
      expires_at: { $lte: reminderThreshold, $gt: now },
      reminder_sent: false
    }).populate('student_id');

    for (const outpass of passes) {
      const student = outpass.student_id;
      if (!student) continue;

      // Only send reminder if student is currently outside or active
      if (student.movement_status === MOVEMENT_STATUS.OUTSIDE) {
        outpass.reminder_sent = true;
        await outpass.save();

        await NotificationService.notifyStudentAndParent({
          student,
          outpass,
          type: 'REMINDER_10MIN',
          title: '10-Minute Return Reminder',
          studentMessage: 'Your outpass will expire in 10 minutes. Please return to the hostel immediately.',
          parentMessage: `Reminder: Outpass for ${student.name} will expire in 10 minutes. Student expected at hostel.`,
          io
        });

        console.log(`[Job] 10-minute reminder sent for student ${student.student_id}`);
      }
    }
  }

  /**
   * 2. Process Expiries at Approved End Time
   */
  static async processExpiriesAndGrace(now, io) {
    // Find approved/active outpasses that have passed their expires_at
    const expiredPasses = await OutpassRequest.find({
      status: { $in: [OUTPASS_STATUS.APPROVED, OUTPASS_STATUS.ACTIVE] },
      expires_at: { $lte: now }
    }).populate('student_id');

    for (const outpass of expiredPasses) {
      const student = outpass.student_id;
      if (!student) continue;

      // If student is INSIDE:
      // If student exited and already returned -> marked EXPIRED (completed)
      if (student.movement_status === MOVEMENT_STATUS.INSIDE) {
        if (outpass.first_exit_at) {
          outpass.status = OUTPASS_STATUS.EXPIRED;
          await outpass.save();

          await QRAuthorization.updateMany(
            { outpass_id: outpass._id },
            { status: 'EXPIRED' }
          );
        }
      } else {
        // Student is OUTSIDE at expiry:
        // Grace period is active for 15 minutes!
        const graceEnd = new Date(outpass.expires_at.getTime() + DEFAULT_GRACE_MINUTES * 60 * 1000);
        if (now <= graceEnd) {
          // Grace entry window is active
          // Log or emit socket notification for warden monitoring
          if (io) {
            io.emit('student_in_grace', {
              studentId: student.student_id,
              name: student.name,
              hostel: student.hostel,
              expiresAt: outpass.expires_at,
              graceEnd
            });
          }
        }
      }
    }
  }

  /**
   * 3. Process Late Returns (After 15-Minute Grace Period)
   */
  static async processLateReturns(now, io) {
    const graceCutoff = new Date(now.getTime() - DEFAULT_GRACE_MINUTES * 60 * 1000);

    // Find outpasses that passed grace cutoff, still marked ACTIVE or APPROVED, and student is OUTSIDE
    const latePasses = await OutpassRequest.find({
      status: { $in: [OUTPASS_STATUS.APPROVED, OUTPASS_STATUS.ACTIVE] },
      expires_at: { $lt: graceCutoff }
    }).populate('student_id');

    for (const outpass of latePasses) {
      const student = outpass.student_id;
      if (!student) continue;

      if (student.movement_status === MOVEMENT_STATUS.OUTSIDE) {
        const lateMins = Math.round((now.getTime() - outpass.expires_at.getTime()) / (1000 * 60));

        outpass.status = OUTPASS_STATUS.LATE;
        outpass.return_status = 'LATE';
        outpass.late_minutes = lateMins;
        await outpass.save();

        await QRAuthorization.updateMany(
          { outpass_id: outpass._id },
          { status: 'EXPIRED' }
        );

        // Notify Student, Parent, and Warden
        await NotificationService.notifyStudentAndParent({
          student,
          outpass,
          type: 'LATE_RETURN_ALERT',
          title: 'URGENT: Late Return Notice',
          studentMessage: `You are overdue by ${lateMins} minutes past the 15-minute grace period. Return to hostel gate immediately.`,
          parentMessage: `URGENT ALERT: Your ward ${student.name} (${student.student_id}) has NOT returned to hostel on time. Overdue by ${lateMins} mins.`,
          io
        });

        if (io) {
          io.emit('student_marked_late', {
            studentId: student.student_id,
            name: student.name,
            hostel: student.hostel,
            lateMinutes: lateMins
          });
        }

        console.log(`[Job] Marked student ${student.student_id} as LATE (${lateMins} min)`);
      }
    }
  }

  /**
   * 4. Process No-Shows (Student never exited during approved window)
   */
  static async processNoShows(now, io) {
    const graceCutoff = new Date(now.getTime() - DEFAULT_GRACE_MINUTES * 60 * 1000);

    const noShowPasses = await OutpassRequest.find({
      status: OUTPASS_STATUS.APPROVED,
      expires_at: { $lt: graceCutoff },
      first_exit_at: null
    }).populate('student_id');

    for (const outpass of noShowPasses) {
      const student = outpass.student_id;
      if (!student || student.movement_status !== MOVEMENT_STATUS.INSIDE) continue;

      outpass.status = OUTPASS_STATUS.NO_SHOW;
      await outpass.save();

      await QRAuthorization.updateMany(
        { outpass_id: outpass._id },
        { status: 'EXPIRED' }
      );

      console.log(`[Job] Marked outpass ${outpass._id} as NO_SHOW for student ${student.student_id}`);
    }
  }

  /**
   * 5. Check Scanner Device Heartbeats
   */
  static async checkScannerHeartbeats(now, io) {
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);

    const offlineScanners = await GateScanner.find({
      status: SCANNER_STATUS.ONLINE,
      last_seen_at: { $lt: threeMinutesAgo }
    });

    for (const scanner of offlineScanners) {
      scanner.status = SCANNER_STATUS.OFFLINE;
      await scanner.save();

      if (io) {
        io.emit('scanner_status_change', {
          scanner_code: scanner.scanner_code,
          status: SCANNER_STATUS.OFFLINE
        });
      }
    }
  }
}

module.exports = BackgroundJobService;
