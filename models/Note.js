const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Untitled Note',
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#ffffff'
  },
  pinned: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
