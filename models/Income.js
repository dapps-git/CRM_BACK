const mongoose = require('mongoose');

const IncomeSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  source: {
    type: String,
    required: true,
    trim: true,
  },
  receiver: {
    type: String,
    required: true,
    enum: ['Saleel VT', 'Anfas Sir', 'Shamna Madam', 'Sabith Boss'],
  },
  businessName: {
    type: String,
    default: '',
  },
  commissionEnabled: {
    type: Boolean,
    default: false,
  },
  commissionAgent: {
    type: String,
    default: '',
  },
  commissionAmount: {
    type: Number,
    default: 0,
  },
  receiptImage: {
    type: String,
    default: '', // Cloudinary image URL
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Income', IncomeSchema);
