const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const Gate = require('../models/Gate');
const GateScanner = require('../models/GateScanner');
const AuditLog = require('../models/AuditLog');
const SecurityEvent = require('../models/SecurityEvent');
const SystemSetting = require('../models/SystemSetting');
const QRAuthorization = require('../models/QRAuthorization');
const ImportExportService = require('../services/importExportService');
const { logAudit } = require('../services/auditService');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ROLES, USER_STATUS } = require('../config/constants');

class AdminController {
  /**
   * Get Students List (High-Performance Server-Side Pagination, Search & Filters)
   * Scalable for 5,000+ students without loading full database into browser
   */
  static async getStudents(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const { search, hostel, movement_status, status } = req.query;
      const filter = {};

      if (hostel) filter.hostel = hostel;
      if (movement_status) filter.movement_status = movement_status;
      if (status) filter.status = status;

      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [
          { student_id: regex },
          { name: regex },
          { permanent_qr_id: regex },
          { course: regex },
          { room: regex }
        ];
      }

      const [students, total] = await Promise.all([
        Student.find(filter)
          .populate('parent_id')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Student.countDocuments(filter)
      ]);

      return res.status(200).json({
        success: true,
        data: students,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('getStudents error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch students.' });
    }
  }

  /**
   * Provision Staff / Employee Users (Warden, Dean, Security Guard, Admin)
   */
  static async createUser(req, res) {
    try {
      const { college_id, name, official_email, phone, password, role } = req.body;

      if (!college_id || !name || !official_email || !phone || !password || !role) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
      }

      const cleanRole = role.toUpperCase();
      if (!Object.values(ROLES).includes(cleanRole)) {
        return res.status(400).json({ success: false, message: 'Invalid role specified.' });
      }

      const cleanId = college_id.trim().toUpperCase();
      const cleanEmail = official_email.trim().toLowerCase();

      const existing = await User.findOne({ $or: [{ college_id: cleanId }, { official_email: cleanEmail }] });
      if (existing) {
        return res.status(409).json({ success: false, message: 'User with this ID or Email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        college_id: cleanId,
        name: name.trim(),
        official_email: cleanEmail,
        phone: phone.trim(),
        password_hash: passwordHash,
        role: cleanRole,
        status: USER_STATUS.ACTIVE
      });

      await logAudit({
        actor: req.user,
        action: 'PROVISION_USER',
        entity_type: 'User',
        entity_id: user._id,
        new_value: { college_id: cleanId, role: cleanRole, name },
        reason: `Staff user provisioned by ${req.user.name}`,
        req
      });

      return res.status(201).json({
        success: true,
        message: `${cleanRole} account created successfully.`,
        user: { id: user._id, college_id: user.college_id, name: user.name, role: user.role }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get all Users
   */
  static async getUsers(req, res) {
    try {
      const { role } = req.query;
      const query = role ? { role } : {};
      const users = await User.find(query).select('-password_hash').sort({ role: 1, name: 1 });
      return res.status(200).json({ success: true, users });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
    }
  }

  /**
   * Toggle User Status (Protects Last Active Admin)
   */
  static async toggleUserStatus(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Safeguard: NEVER allow disabling or deleting the last active Admin
      if (user.role === ROLES.ADMIN && user.status === USER_STATUS.ACTIVE) {
        const activeAdminsCount = await User.countDocuments({ role: ROLES.ADMIN, status: USER_STATUS.ACTIVE });
        if (activeAdminsCount <= 1) {
          return res.status(403).json({
            success: false,
            message: 'Action prohibited: Cannot deactivate the last active System Administrator.'
          });
        }
      }

      const oldStatus = user.status;
      user.status = user.status === USER_STATUS.ACTIVE ? USER_STATUS.INACTIVE : USER_STATUS.ACTIVE;
      await user.save();

      await logAudit({
        actor: req.user,
        action: 'TOGGLE_USER_STATUS',
        entity_type: 'User',
        entity_id: user._id,
        old_value: { status: oldStatus },
        new_value: { status: user.status },
        reason: req.body.reason || 'Status changed by admin',
        req
      });

      return res.status(200).json({
        success: true,
        message: `User status changed to ${user.status}`,
        user: { id: user._id, status: user.status }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Revoke Student Permanent QR Code
   */
  static async revokeQR(req, res) {
    try {
      const student = await Student.findById(req.params.studentId);
      if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

      const oldStatus = student.qr_status;
      student.qr_status = 'REVOKED';
      await student.save();

      // Deactivate all active QR authorizations
      await QRAuthorization.updateMany(
        { student_id: student._id },
        { status: 'REVOKED', revoked_at: new Date(), revoked_by: req.user._id, revocation_reason: req.body.reason || 'Revoked by Admin' }
      );

      await logAudit({
        actor: req.user,
        action: 'REVOKE_QR',
        entity_type: 'Student',
        entity_id: student._id,
        old_value: { qr_status: oldStatus, qr_id: student.permanent_qr_id },
        new_value: { qr_status: 'REVOKED' },
        reason: req.body.reason || 'Administrative QR Revocation',
        req
      });

      return res.status(200).json({
        success: true,
        message: `QR code for student ${student.student_id} has been revoked.`
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Regenerate Permanent QR Code for Student
   */
  static async regenerateQR(req, res) {
    try {
      const student = await Student.findById(req.params.studentId);
      if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

      const oldQR = student.permanent_qr_id;
      const newSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const newQR = `QR-STU-${student.student_id}-${newSuffix}`;

      student.permanent_qr_id = newQR;
      student.qr_status = 'ACTIVE';
      await student.save();

      // Expire old authorizations
      await QRAuthorization.updateMany(
        { student_id: student._id },
        { status: 'REVOKED', revocation_reason: 'QR regenerated' }
      );

      await logAudit({
        actor: req.user,
        action: 'REGENERATE_QR',
        entity_type: 'Student',
        entity_id: student._id,
        old_value: { permanent_qr_id: oldQR },
        new_value: { permanent_qr_id: newQR },
        reason: req.body.reason || 'QR code regeneration requested',
        req
      });

      return res.status(200).json({
        success: true,
        message: 'Permanent QR identity regenerated successfully.',
        permanent_qr_id: newQR
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Gate & Scanner Management
   */
  static async createGate(req, res) {
    try {
      const { gate_code, gate_name, location } = req.body;
      const gate = await Gate.create({
        gate_code: gate_code.trim().toUpperCase(),
        gate_name: gate_name.trim(),
        location: location.trim(),
        status: 'OPEN'
      });

      return res.status(201).json({ success: true, message: 'Gate created successfully.', gate });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateGateStatus(req, res) {
    try {
      const { status } = req.body;
      const gate = await Gate.findById(req.params.id);
      if (!gate) return res.status(404).json({ success: false, message: 'Gate not found.' });

      const oldStatus = gate.status;
      gate.status = status;
      await gate.save();

      await logAudit({
        actor: req.user,
        action: 'UPDATE_GATE_STATUS',
        entity_type: 'Gate',
        entity_id: gate._id,
        old_value: { status: oldStatus },
        new_value: { status: gate.status },
        reason: req.body.reason || 'Gate status updated',
        req
      });

      return res.status(200).json({ success: true, message: `Gate status updated to ${status}`, gate });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async registerScanner(req, res) {
    try {
      const { scanner_code, scanner_name, gate_id } = req.body;
      const rawApiKey = `SCN-KEY-${crypto.randomBytes(16).toString('hex')}`;
      const apiKeyHash = await bcrypt.hash(rawApiKey, 10);

      const scanner = await GateScanner.create({
        scanner_code: scanner_code.trim().toUpperCase(),
        scanner_name: scanner_name.trim(),
        gate_id,
        api_key_hash: apiKeyHash,
        status: 'ONLINE'
      });

      return res.status(201).json({
        success: true,
        message: 'Scanner registered successfully. Save the API Key securely.',
        scanner,
        apiKey: rawApiKey // Shown only once upon registration
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async rotateScannerKey(req, res) {
    try {
      const scanner = await GateScanner.findById(req.params.id);
      if (!scanner) return res.status(404).json({ success: false, message: 'Scanner not found.' });

      const rawApiKey = `SCN-KEY-${crypto.randomBytes(16).toString('hex')}`;
      scanner.api_key_hash = await bcrypt.hash(rawApiKey, 10);
      await scanner.save();

      await logAudit({
        actor: req.user,
        action: 'ROTATE_SCANNER_KEY',
        entity_type: 'GateScanner',
        entity_id: scanner._id,
        reason: req.body.reason || 'Routine credential rotation',
        req
      });

      return res.status(200).json({
        success: true,
        message: 'Scanner credentials rotated. Save new API Key securely.',
        apiKey: rawApiKey
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Bulk Student CSV Import
   */
  static async bulkImportStudents(req, res) {
    try {
      const { students_data } = req.body; // Can accept parsed JSON array or rows
      if (!Array.isArray(students_data) || students_data.length === 0) {
        return res.status(400).json({ success: false, message: 'Valid array of student rows required.' });
      }

      const result = await ImportExportService.processBulkStudentImport(students_data, req.user, req);
      return res.status(200).json({ success: true, message: 'Bulk import completed.', result });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Update Parent Details (Warden / Dean / Admin only with audit log)
   * Student is strictly prohibited from updating parent details
   */
  static async updateParentDetails(req, res) {
    try {
      const { name, relationship, phone, email, address, reason } = req.body;
      const parent = await Parent.findById(req.params.id);

      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent record not found.' });
      }

      if (!reason) {
        return res.status(400).json({ success: false, message: 'An administrative reason is required to modify parent information.' });
      }

      const oldValue = {
        name: parent.name,
        relationship: parent.relationship,
        phone: parent.phone,
        email: parent.email,
        address: parent.address
      };

      if (name) parent.name = name.trim();
      if (relationship) parent.relationship = relationship.trim();
      if (phone) parent.phone = phone.trim();
      if (email) parent.email = email.trim().toLowerCase();
      if (address) parent.address = address.trim();

      await parent.save();

      await logAudit({
        actor: req.user,
        action: 'UPDATE_PARENT_DETAILS',
        entity_type: 'Parent',
        entity_id: parent._id,
        old_value: oldValue,
        new_value: { name: parent.name, phone: parent.phone, email: parent.email, address: parent.address },
        reason,
        req
      });

      return res.status(200).json({
        success: true,
        message: 'Parent contact details updated successfully and audited.',
        parent
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Audit Logs
   */
  static async getAuditLogs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 25;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
        AuditLog.countDocuments()
      ]);

      return res.status(200).json({
        success: true,
        data: logs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
    }
  }

  /**
   * Security Events
   */
  static async getSecurityEvents(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 25;
      const skip = (page - 1) * limit;

      const [events, total] = await Promise.all([
        SecurityEvent.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
        SecurityEvent.countDocuments()
      ]);

      return res.status(200).json({
        success: true,
        data: events,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch security events.' });
    }
  }

  /**
   * System Settings
   */
  static async getSettings(req, res) {
    try {
      const settings = await SystemSetting.find();
      return res.status(200).json({ success: true, settings });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
    }
  }

  static async updateSetting(req, res) {
    try {
      const { key, value, description } = req.body;
      const setting = await SystemSetting.findOneAndUpdate(
        { key },
        { key, value, description, updated_by: req.user._id },
        { upsert: true, new: true }
      );

      await logAudit({
        actor: req.user,
        action: 'UPDATE_SYSTEM_SETTING',
        entity_type: 'SystemSetting',
        entity_id: setting._id,
        new_value: { key, value },
        reason: 'System settings updated',
        req
      });

      return res.status(200).json({ success: true, message: 'Setting updated.', setting });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = AdminController;
