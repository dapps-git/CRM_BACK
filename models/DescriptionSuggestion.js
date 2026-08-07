const mongoose = require('mongoose');

const DescriptionSuggestionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('DescriptionSuggestion', DescriptionSuggestionSchema);
