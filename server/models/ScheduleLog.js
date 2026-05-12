const mongoose = require('mongoose');

const scheduleLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  section: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  shiftDate: {
    type: Date,
    required: true
  },
  oldShift: {
    type: String
  },
  newShift: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['manual_update', 'auto_generate', 'clear'],
    default: 'manual_update'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ScheduleLog', scheduleLogSchema);
