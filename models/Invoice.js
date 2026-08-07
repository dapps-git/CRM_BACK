const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  quantity: { type: Number, required: true, default: 1 },
  rate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 }
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientPhone: {
    type: String,
    default: ''
  },
  clientAddress: {
    type: String,
    default: ''
  },
  clientEmail: {
    type: String,
    default: ''
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  terms: {
    type: String,
    default: 'Due on receipt'
  },
  dueDate: {
    type: Date,
    default: Date.now
  },
  items: [InvoiceItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  receivedAmount: {
    type: Number,
    required: true,
    default: 0
  },
  balanceDue: {
    type: Number,
    required: true,
    default: 0
  },
  companyDetails: {
    name: { type: String, default: 'Crevion ads' },
    phone: { type: String, default: '+91 81139 08262' },
    email: { type: String, default: 'crevionads@gmail.com' },
    website: { type: String, default: 'Crevionads.com' },
    address: { type: String, default: 'K.P.M Arcade, Kerala, Valanchery, India' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
