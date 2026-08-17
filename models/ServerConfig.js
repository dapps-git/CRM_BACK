const mongoose = require('mongoose');

const ServerConfigSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
    trim: true,
  },
  accountName: {
    type: String,
    trim: true,
    default: '',
  },
  websiteUrl: {
    type: String,
    trim: true,
    default: '',
  },
  frontendServer: {
    type: String,
    trim: true,
    default: 'Vercel',
  },
  backendServer: {
    type: String,
    trim: true,
    default: 'Render',
  },
  adminServer: {
    type: String,
    trim: true,
    default: 'cPanel',
  },
  adminPanelUrl: {
    type: String,
    trim: true,
    default: '',
  },
  adminEmail: {
    type: String,
    trim: true,
    default: '',
  },
  adminPassword: {
    type: String,
    default: '',
  },
  databaseUrl: {
    type: String,
    trim: true,
    default: '',
  },
  databasePassword: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('ServerConfig', ServerConfigSchema);
