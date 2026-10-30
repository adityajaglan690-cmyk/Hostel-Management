const Notice = require('../models/Notice');
const Incident = require('../models/Incident');
const Notification = require('../models/Notification');
const { logAudit } = require('../services/auditService');

class CommonControllers {
  // Notices
  static async getNotices(req, res) {
    try {
      const userRole = req.user.role;
      const query = {
        is_active: true,
        $or: [{ target_role: 'ALL' }, { target_role: userRole }, { published_by: req.user._id }]
      };
      const notices = await Notice.find(query).populate('published_by', 'name role').sort({ createdAt: -1 });
      return res.status(200).json({ success: true, notices });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch notices.' });
    }

  }

  static async updateNotice(req, res) {
    try {
      const { title, content, type, target_role, target_hostel, expires_at } = req.body;
      const notice = await Notice.findOne({ _id: req.params.id, published_by: req.user._id });
      if (!notice) {
        return res.status(404).json({ success: false, message: 'Notice not found or not owned by current user.' });
      }

      notice.title = title;
      notice.content = content;
      notice.type = type || notice.type;
      notice.target_role = target_role || notice.target_role;
      notice.target_hostel = target_hostel || notice.target_hostel;
      notice.expires_at = expires_at ? new Date(expires_at) : null;
      await notice.save();

      return res.status(200).json({ success: true, message: 'Notice updated successfully.', notice });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async createNotice(req, res) {
    try {
      const { title, content, type, target_role, target_hostel, expires_at } = req.body;
      const notice = await Notice.create({
        title,
        content,
        type: type || 'GENERAL',
        target_role: target_role || 'ALL',
        target_hostel: target_hostel || 'ALL',
        published_by: req.user._id,
        expires_at: expires_at ? new Date(expires_at) : null
      });

      if (req.app.get('io')) {
        req.app.get('io').emit('new_notice', notice);
      }

      await logAudit({
        actor: req.user,
        action: 'CREATE_NOTICE',
        entity_type: 'Notice',
        entity_id: notice._id,
        new_value: { title, type },
        reason: 'New notice published',
        req
      });

      return res.status(201).json({ success: true, message: 'Notice published successfully.', notice });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // Incidents
  static async getIncidents(req, res) {
    try {
      const incidents = await Incident.find()
        .populate('student_id', 'student_id name hostel room')
        .populate('gate_id', 'gate_code gate_name')
        .populate('reported_by', 'name role')
        .sort({ createdAt: -1 });
      return res.status(200).json({ success: true, incidents });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch incidents.' });
    }
  }

  static async createIncident(req, res) {
    try {
      const { title, description, student_id, gate_id } = req.body;
      const incident = await Incident.create({
        title,
        description,
        student_id: student_id || null,
        gate_id: gate_id || null,
        reported_by: req.user._id
      });
      return res.status(201).json({ success: true, message: 'Incident logged.', incident });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async updateIncident(req, res) {
    try {
      const { status, resolution_notes } = req.body;
      const incident = await Incident.findById(req.params.id);
      if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });

      incident.status = status;
      if (resolution_notes) incident.resolution_notes = resolution_notes;
      if (status === 'RESOLVED') incident.resolved_at = new Date();
      await incident.save();

      return res.status(200).json({ success: true, message: 'Incident updated.', incident });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // Notifications
  static async getMyNotifications(req, res) {
    try {
      const query = {
        $or: [
          { recipient_id: req.user._id },
          { recipient_type: req.user.role }
        ]
      };
      const notifications = await Notification.find(query).sort({ sent_at: -1 }).limit(30);
      return res.status(200).json({ success: true, notifications });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
    }
  }

  static async markNotificationRead(req, res) {
    try {
      await Notification.findByIdAndUpdate(req.params.id, { read_at: new Date() });
      return res.status(200).json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to update notification.' });
    }
  }
}

module.exports = CommonControllers;
