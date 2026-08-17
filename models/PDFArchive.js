const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  quantity: { type: mongoose.Schema.Types.Mixed, default: 1 },
  rate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 }
});

const PDFArchiveSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  invoiceNumber: {
    type: String,
    required: true,
    trim: true
  },
  version: {
    type: Number,
    default: 1
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientPhone: { type: String, default: '' },
  clientAddress: { type: String, default: '' },
  clientEmail: { type: String, default: '' },
  invoiceDate: { type: Date, default: Date.now },
  terms: { type: String, default: 'Due on receipt' },
  dueDate: { type: Date, default: Date.now },
  items: [InvoiceItemSchema],
  totalAmount: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  companyDetails: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('PDFArchive', PDFArchiveSchema);
