const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    relationship: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    verified: {
      type: Boolean,
      default: true
    },
    student_editable: {
      type: Boolean,
      default: false // Strictly non-editable by student
    }
  },
  {
    timestamps: true
  }
);

parentSchema.index({ student_id: 1 });
parentSchema.index({ phone: 1 });
parentSchema.index({ email: 1 });

module.exports = mongoose.model('Parent', parentSchema);
