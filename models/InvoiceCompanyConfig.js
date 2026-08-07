const mongoose = require('mongoose');

const InvoiceCompanyConfigSchema = new mongoose.Schema({
  name: { type: String, default: 'Crevion ads' },
  phone: { type: String, default: '+91 81139 08262' },
  email: { type: String, default: 'crevionads@gmail.com' },
  website: { type: String, default: 'Crevionads.com' },
  address: { type: String, default: 'K.P.M Arcade, Kerala, Valanchery, India' }
}, {
  timestamps: true
});

module.exports = mongoose.model('InvoiceCompanyConfig', InvoiceCompanyConfigSchema);
