const Notification = require('../models/Notification');
const Parent = require('../models/Parent');
const Student = require('../models/Student');

class NotificationService {
  /**
   * Dispatch a notification to a recipient and persist in database
   */
  static async send({
    recipient_type,
    recipient_id,
    recipient_contact,
    outpass_id = null,
    type,
    title,
    message,
    channel = 'IN_APP',
    io = null
  }) {
    try {
      const notification = await Notification.create({
        recipient_type,
        recipient_id,
        recipient_contact,
        outpass_id,
        type,
        title,
        message,
        channel,
        status: 'SENT',
        sent_at: new Date()
      });

      // Emit real-time socket event if Socket.io is provided
      if (io) {
        io.to(`user_${recipient_id}`).emit('new_notification', notification);
        // Also emit to role room
        io.to(`role_${recipient_type}`).emit('role_notification', notification);
      }

      console.log(`[Notification][${channel}] To ${recipient_type} (${recipient_contact || recipient_id}): ${title} - ${message}`);
      return notification;
    } catch (error) {
      console.error('[NotificationService] Error sending notification:', error);
      return null;
    }
  }

  /**
   * Notify both Student and their Parent simultaneously
   */
  static async notifyStudentAndParent({
    student,
    outpass,
    type,
    title,
    studentMessage,
    parentMessage,
    io = null
  }) {
    try {
      // 1. Notify Student (In-app + Email/SMS)
      await this.send({
        recipient_type: 'STUDENT',
        recipient_id: student.user_id,
        recipient_contact: student.student_id,
        outpass_id: outpass._id,
        type,
        title,
        message: studentMessage,
        channel: 'IN_APP',
        io
      });

      // 2. Lookup parent and notify
      if (student.parent_id) {
        const parent = await Parent.findById(student.parent_id);
        if (parent) {
          // Send to Parent (SMS / Email notification)
          await this.send({
            recipient_type: 'PARENT',
            recipient_id: parent._id,
            recipient_contact: parent.phone || parent.email,
            outpass_id: outpass._id,
            type,
            title,
            message: parentMessage || studentMessage,
            channel: 'SMS',
            io
          });
        }
      }
    } catch (error) {
      console.error('[NotificationService] notifyStudentAndParent error:', error);
    }
  }
}

module.exports = NotificationService;
