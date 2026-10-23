const mongoose = require('mongoose');
const { MOVEMENT_STATUS, QR_STATUS } = require('../config/constants');

const studentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    student_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    course: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    hostel: {
      type: String,
      required: true,
      trim: true
    },
    block: {
      type: String,
      required: true,
      trim: true
    },
    floor: {
      type: Number,
      required: true
    },
    room: {
      type: String,
      required: true,
      trim: true
    },
    academic_year: {
      type: String,
      required: true,
      trim: true
    },
    semester: {
      type: Number,
      required: true
    },
    permanent_qr_id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    qr_status: {
      type: String,
      enum: Object.values(QR_STATUS),
      default: QR_STATUS.ACTIVE
    },
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parent'
    },
    movement_status: {
      type: String,
      enum: Object.values(MOVEMENT_STATUS),
      default: MOVEMENT_STATUS.INSIDE
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'GRADUATED', 'SUSPENDED', 'BLOCKED'],
      default: 'ACTIVE'
    },
    erp_student_id: {
      type: String,
      trim: true
    },
    photo_url: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// High performance indexes for 5000+ student queries
studentSchema.index({ hostel: 1, block: 1 });
studentSchema.index({ movement_status: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ department: 1, course: 1 });

module.exports = mongoose.model('Student', studentSchema);
