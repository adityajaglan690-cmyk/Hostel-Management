const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    description: {
      type: String
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);


module.exports = mongoose.model('SystemSetting', systemSettingSchema);
