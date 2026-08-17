const mongoose = require('mongoose');

const DomainSchema = new mongoose.Schema({
  domainName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  projectName: {
    type: String,
    trim: true,
    default: '',
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  expirationDate: {
    type: Date,
    required: true,
  },
  platform: {
    type: String,
    trim: true,
    default: 'Hostinger',
  },
  accountHolder: {
    type: String,
    trim: true,
    default: '',
  },
  ownerEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['Active', 'Expiring Soon', 'Expired'],
    default: 'Active',
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  renewalCost: {
    type: Number,
    default: 0,
  },
  alertSentAt: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

// Helper: Calculate status based on expiration date (60 days / 2 months threshold)
DomainSchema.methods.calculateStatus = function() {
  if (!this.expirationDate) return 'Active';
  const now = new Date();
  const exp = new Date(this.expirationDate);
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'Expired';
  } else if (diffDays <= 60) {
    // 2 months (60 days) before expiry -> Expiring Soon
    return 'Expiring Soon';
  } else {
    return 'Active';
  }
};

DomainSchema.pre('save', function(next) {
  this.status = this.calculateStatus();
  next();
});

module.exports = mongoose.model('Domain', DomainSchema);
