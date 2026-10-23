const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, USER_STATUS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    college_id: {
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
    official_email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    password_hash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true,
      enum: Object.values(ROLES)
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE
    },
    failed_login_attempts: {
      type: Number,
      default: 0
    },
    locked_until: {
      type: Date,
      default: null
    },
    last_login_at: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound Index
userSchema.index({ college_id: 1, role: 1 });

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

userSchema.methods.isLocked = function () {
  return !!(this.locked_until && this.locked_until > Date.now());
};

module.exports = mongoose.model('User', userSchema);
