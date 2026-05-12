const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  shift: {
    type: String,
    enum: ['A', 'B', 'C', 'G', 'L', 'OFF', 'CO'],
    required: true,
  },
  section: {
    type: String,
    enum: ['CGL-1 Entry', 'CGL-1 Process', 'CGL-1 Exit'],
    required: true,
  },
  isOverride: {
    type: Boolean,
    default: false,
  },
  overrideBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  isConfirmed: {
    type: Boolean,
    default: false,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Unique constraint: one schedule entry per employee per day
scheduleSchema.index({ employee: 1, date: 1 }, { unique: true });

// Query indexes for common lookups
scheduleSchema.index({ section: 1, date: 1 });
scheduleSchema.index({ date: 1, shift: 1 });
scheduleSchema.index({ section: 1, date: 1, shift: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
