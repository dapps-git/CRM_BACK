const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: 'Crevionads',
  },
  companyLogo: {
    type: String,
    default: '',
  },
  emailConfig: {
    service: { type: String, default: '' },
    user: { type: String, default: '' },
    pass: { type: String, default: '' },
  },
  cloudinaryConfig: {
    cloudName: { type: String, default: '' },
    apiKey: { type: String, default: '' },
    apiSecret: { type: String, default: '' },
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'dark',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Settings', SettingsSchema);
