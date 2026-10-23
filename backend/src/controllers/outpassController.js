const OutpassRequest = require('../models/OutpassRequest');
const Student = require('../models/Student');
const ExtensionRequest = require('../models/ExtensionRequest');
const OutpassService = require('../services/outpassService');
const { OUTPASS_STATUS, ROLES, MOVEMENT_STATUS } = require('../config/constants');

class OutpassController {
  /**
   * Apply for an Outpass / Home Leave / Emergency Leave
   */
  static async apply(req, res) {
    try {
      if (!req.student) {
        return res.status(403).json({ success: false, message: 'Only registered students can apply for an outpass.' });
      }

      const {
        type,
        reason,
        destination,
        home_address,
        requested_start_time,
        requested_end_time,
        supporting_document_url
      } = req.body;

      if (!type || !reason || !destination || !requested_start_time || !requested_end_time) {
        return res.status(400).json({
          success: false,
          message: 'All fields (type, reason, destination, departure time, return time) are required.'
        });
      }

      const outpass = await OutpassService.createOutpass({
        student_id: req.student._id,
        type,
        reason,
        destination,
        home_address,
        requested_start_time,
        requested_end_time,
        supporting_document_url
      });

      // Emit real-time notification to Warden & Dean rooms
      if (req.app.get('io')) {
        req.app.get('io').to('role_WARDEN').to('role_DEAN').emit('new_outpass_application', {
          outpassId: outpass._id,
          studentName: req.student.name,
          hostel: req.student.hostel,
          type: outpass.type,
          destination: outpass.destination
        });
      }

      return res.status(201).json({
        success: true,
        message: `${type} request submitted successfully. Pending approval.`,
        outpass
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get Student's Own Outpasses (Server-Side Pagination & Filters)
   */
  static async getMyOutpasses(req, res) {
    try {
      if (!req.student) {
        return res.status(403).json({ success: false, message: 'Access denied: Student account required.' });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const { status, type } = req.query;

      const query = { student_id: req.student._id };
      if (status) query.status = status;
      if (type) query.type = type;

      const [outpasses, total] = await Promise.all([
        OutpassRequest.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        OutpassRequest.countDocuments(query)
      ]);

      return res.status(200).json({
        success: true,
        data: outpasses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch outpasses.' });
    }
  }

  /**
   * Get Current Active Outpass with Authoritative Live Timer Information
   */
  static async getActiveOutpass(req, res) {
    try {
      if (!req.student) {
        return res.status(403).json({ success: false, message: 'Access denied: Student account required.' });
      }

      const active = await OutpassRequest.findOne({
        student_id: req.student._id,
        status: { $in: [OUTPASS_STATUS.APPROVED, OUTPASS_STATUS.ACTIVE] }
      }).sort({ createdAt: -1 });

      const serverTime = new Date();

      return res.status(200).json({
        success: true,
        activeOutpass: active,
        movementStatus: req.student.movement_status,
        serverTime,
        permanentQrId: req.student.permanent_qr_id
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch active outpass.' });
    }
  }

  /**
   * Get Outpass by ID (Strict Ownership Verification)
   */
  static async getById(req, res) {
    try {
      const outpass = await OutpassRequest.findById(req.params.id)
        .populate('student_id')
        .populate('approved_by', 'name college_id role');

      if (!outpass) {
        return res.status(404).json({ success: false, message: 'Outpass not found.' });
      }

      // Ownership enforcement:
      // If STUDENT, they can ONLY view their OWN outpass.
      if (req.user.role === ROLES.STUDENT) {
        if (!req.student || String(outpass.student_id._id) !== String(req.student._id)) {
          return res.status(403).json({
            success: false,
            message: 'Access Denied: You cannot view another student outpass.'
          });
        }
      }

      return res.status(200).json({ success: true, outpass });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch outpass details.' });
    }
  }

  /**
   * Cancel Outpass (Student-only before first exit)
   */
  static async cancel(req, res) {
    try {
      if (!req.student) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }

      const outpass = await OutpassService.cancelOutpass({
        outpass_id: req.params.id,
        student_id: req.student._id,
        reason: req.body.reason || 'Cancelled by student'
      });

      return res.status(200).json({
        success: true,
        message: 'Outpass cancelled successfully.',
        outpass
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Student Requests Time Extension
   */
  static async requestExtension(req, res) {
    try {
      if (!req.student) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }

      const { reason, requested_new_end_time } = req.body;
      if (!reason || !requested_new_end_time) {
        return res.status(400).json({
          success: false,
          message: 'Reason and requested new return time are required.'
        });
      }

      const extension = await OutpassService.requestExtension({
        outpass_id: req.params.id,
        student_id: req.student._id,
        reason,
        requested_new_end_time
      });

      return res.status(201).json({
        success: true,
        message: 'Extension request submitted. Awaiting approval.',
        extension
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get Pending Outpasses for Approvers (Warden scope / Dean institute-wide)
   */
  static async getPending(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const filter = { status: OUTPASS_STATUS.PENDING };

      // If Warden, can optionally filter by assigned hostel
      if (req.user.role === ROLES.WARDEN && req.query.hostel) {
        const studentIds = await Student.find({ hostel: req.query.hostel }).distinct('_id');
        filter.student_id = { $in: studentIds };
      }

      const [outpasses, total] = await Promise.all([
        OutpassRequest.find(filter)
          .populate('student_id')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        OutpassRequest.countDocuments(filter)
      ]);

      return res.status(200).json({
        success: true,
        data: outpasses,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch pending requests.' });
    }
  }

  /**
   * Approve Outpass Request
   */
  static async approve(req, res) {
    try {
      const { approved_start_time, approved_end_time, comment } = req.body;
      const io = req.app.get('io');

      const outpass = await OutpassService.approveOutpass({
        outpass_id: req.params.id,
        approver: req.user,
        approved_start_time,
        approved_end_time,
        comment,
        req,
        io
      });

      return res.status(200).json({
        success: true,
        message: 'Outpass approved successfully.',
        outpass
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Reject Outpass Request
   */
  static async reject(req, res) {
    try {
      const { rejection_reason } = req.body;
      const io = req.app.get('io');

      const outpass = await OutpassService.rejectOutpass({
        outpass_id: req.params.id,
        approver: req.user,
        rejection_reason,
        req,
        io
      });

      return res.status(200).json({
        success: true,
        message: 'Outpass rejected.',
        outpass
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Approve Extension Request
   */
  static async approveExtension(req, res) {
    try {
      const { comment } = req.body;
      const io = req.app.get('io');

      const result = await OutpassService.approveExtension({
        extension_id: req.params.id,
        approver: req.user,
        comment,
        req,
        io
      });

      return res.status(200).json({
        success: true,
        message: 'Extension approved successfully.',
        data: result
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get Students Currently OUTSIDE
   */
  static async getOutsideStudents(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const filter = { movement_status: MOVEMENT_STATUS.OUTSIDE };
      if (req.query.hostel) filter.hostel = req.query.hostel;

      const [students, total] = await Promise.all([
        Student.find(filter)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit),
        Student.countDocuments(filter)
      ]);

      return res.status(200).json({
        success: true,
        data: students,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch outside students.' });
    }
  }

  /**
   * Get Grace & Late Returns Monitoring List
   */
  static async getGraceAndLate(req, res) {
    try {
      const now = new Date();
      const latePasses = await OutpassRequest.find({
        status: { $in: [OUTPASS_STATUS.LATE, OUTPASS_STATUS.ACTIVE] },
        expires_at: { $lte: now }
      })
        .populate('student_id')
        .sort({ expires_at: 1 });

      const formatted = latePasses.map(p => {
        const isLate = p.status === OUTPASS_STATUS.LATE || (now - p.expires_at > 15 * 60 * 1000);
        const lateMinutes = Math.max(0, Math.round((now - p.expires_at) / (1000 * 60)));
        return {
          outpass: p,
          student: p.student_id,
          isLate,
          inGrace: !isLate && (now >= p.expires_at),
          lateMinutes
        };
      });

      return res.status(200).json({
        success: true,
        data: formatted
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch monitoring list.' });
    }
  }
}

module.exports = OutpassController;
