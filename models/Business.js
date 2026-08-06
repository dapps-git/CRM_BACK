const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  agentName: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    required: true,
    trim: true,
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  requirement: {
    type: [String],
    required: true,
    enum: [
      'Website Development',
      'Digital Marketing',
      'SEO',
      'Application Development',
      'CRM Development',
      'ERP Development',
      'E-Commerce',
      'Video Editing',
      'Photography',
      'Branding',
      'Other'
    ],
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Business', BusinessSchema);
