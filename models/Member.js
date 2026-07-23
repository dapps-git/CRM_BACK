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
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Member', MemberSchema);
