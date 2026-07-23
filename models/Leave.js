const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['Present', 'Absent', 'Casual Leave', 'Sick Leave', 'Half Day'],
  },
  reason: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

// Compound index to ensure a member only has one record per calendar date
LeaveSchema.index({ memberId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Leave', LeaveSchema);
