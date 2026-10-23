const mongoose = require('mongoose');

const hostelAllocationSchema = new mongoose.Schema(
  {
    hostel_name: {
      type: String,
      required: true,
      trim: true
    },
    block_name: {
      type: String,
      required: true,
      trim: true
    },
    floor: {
      type: Number,
      required: true
    },
    room_number: {
      type: String,
      required: true,
      trim: true
    },
    capacity: {
      type: Number,
      default: 2
    },
    occupied: {
      type: Number,
      default: 0
    },
    warden_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

hostelAllocationSchema.index({ hostel_name: 1, block_name: 1, room_number: 1 }, { unique: true });

module.exports = mongoose.model('HostelAllocation', hostelAllocationSchema);
