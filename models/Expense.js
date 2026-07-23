const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Office',
      'Travel',
      'Food',
      'Software',
      'Hardware',
      'Marketing',
      'Salary',
      'Utilities',
      'Miscellaneous'
    ],
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  partner: {
    type: String,
    required: true,
    enum: ['Saleel VT', 'Anfas Sir', 'Shamna Madam', 'Sabith Boss'],
  },
  billImage: {
    type: String,
    default: '', // Cloudinary URL
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Expense', ExpenseSchema);
