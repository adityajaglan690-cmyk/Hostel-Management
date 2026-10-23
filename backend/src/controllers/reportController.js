const Student = require('../models/Student');
const OutpassRequest = require('../models/OutpassRequest');
const ScanLog = require('../models/ScanLog');
const SecurityEvent = require('../models/SecurityEvent');
const Gate = require('../models/Gate');
const { MOVEMENT_STATUS, OUTPASS_STATUS, SCAN_RESULT } = require('../config/constants');

class ReportController {
  /**
   * Comprehensive System Analytics & Dashboard Metrics
   */
  static async getOverviewMetrics(req, res) {
    try {
      const [
        totalStudents,
        insideStudents,
        outsideStudents,
        pendingApprovals,
        activeOutpasses,
        lateReturns,
        noShows,
        totalScansToday,
        failedScansToday
      ] = await Promise.all([
        Student.countDocuments({ status: 'ACTIVE' }),
        Student.countDocuments({ movement_status: MOVEMENT_STATUS.INSIDE, status: 'ACTIVE' }),
        Student.countDocuments({ movement_status: MOVEMENT_STATUS.OUTSIDE, status: 'ACTIVE' }),
        OutpassRequest.countDocuments({ status: OUTPASS_STATUS.PENDING }),
        OutpassRequest.countDocuments({ status: OUTPASS_STATUS.ACTIVE }),
        OutpassRequest.countDocuments({ status: OUTPASS_STATUS.LATE }),
        OutpassRequest.countDocuments({ status: OUTPASS_STATUS.NO_SHOW }),
        ScanLog.countDocuments({
          scanned_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        ScanLog.countDocuments({
          scanned_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          result: SCAN_RESULT.DENIED
        })
      ]);

      // Hostel-wise distribution
      const hostelStats = await Student.aggregate([
        { $match: { status: 'ACTIVE' } },
        {
          $group: {
            _id: '$hostel',
            total: { $sum: 1 },
            outside: {
              $sum: { $cond: [{ $eq: ['$movement_status', MOVEMENT_STATUS.OUTSIDE] }, 1, 0] }
            },
            inside: {
              $sum: { $cond: [{ $eq: ['$movement_status', MOVEMENT_STATUS.INSIDE] }, 1, 0] }
            }
          }
        },
        { $sort: { total: -1 } }
      ]);

      // Leave type distribution
      const leaveTypeStats = await OutpassRequest.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);

      // Recent 7 days outpass volume
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const dailyTrend = await OutpassRequest.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return res.status(200).json({
        success: true,
        metrics: {
          totalStudents,
          insideStudents,
          outsideStudents,
          pendingApprovals,
          activeOutpasses,
          lateReturns,
          noShows,
          totalScansToday,
          failedScansToday
        },
        hostelStats,
        leaveTypeStats,
        dailyTrend
      });
    } catch (error) {
      console.error('Report metrics error:', error);
      return res.status(500).json({ success: false, message: 'Failed to generate metrics.' });
    }
  }

  /**
   * Export Outpass Data (CSV format)
   */
  static async exportOutpassCSV(req, res) {
    try {
      const outpasses = await OutpassRequest.find()
        .populate('student_id', 'student_id name course hostel room')
        .sort({ createdAt: -1 })
        .limit(1000);

      const headers = 'OutpassID,StudentID,StudentName,Hostel,Room,Type,Status,DepartureTime,ReturnTime,ActualReturn,ReturnStatus,LateMinutes\n';
      const rows = outpasses.map(o => {
        const s = o.student_id || {};
        return [
          o._id,
          s.student_id || '',
          `"${(s.name || '').replace(/"/g, '""')}"`,
          s.hostel || '',
          s.room || '',
          o.type,
          o.status,
          o.requested_start_time ? new Date(o.requested_start_time).toISOString() : '',
          o.requested_end_time ? new Date(o.requested_end_time).toISOString() : '',
          o.actual_return ? new Date(o.actual_return).toISOString() : '',
          o.return_status,
          o.late_minutes || 0
        ].join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=hostel_outpasses_export.csv');
      return res.status(200).send(headers + rows);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Export failed.' });
    }
  }
}

module.exports = ReportController;
