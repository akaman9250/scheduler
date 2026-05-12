const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    enum: ['CGL-1 Entry', 'CGL-1 Process', 'CGL-1 Exit'],
  },
  minPerShift: {
    type: Number,
    default: 2,
  },
  shiftManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Section', sectionSchema);
