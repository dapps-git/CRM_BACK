const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  profileImage: {
    type: String,
    trim: true,
    default: ''
  },
  dob: {
    type: Date,
    default: null
  },
  birthdayAlertSentYear: {
    type: Number,
    default: null
  },
  birthday2DaysAlertSentYear: {
    type: Number,
    default: null
  },
  birthdayTodayAlertSentYear: {
    type: Number,
    default: null
  },
  idProofs: [{
    idName: { type: String, trim: true },
    idPhoto: { type: String, trim: true }
  }]
}, {
  timestamps: true,
});

module.exports = mongoose.model('Member', MemberSchema);
