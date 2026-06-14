const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  animeSource: {
    type: String,
    required: true
  },
  avatarUrl: {
    type: String,
    required: true
  },
  cardBackdropUrl: {
    type: String
  },
  themeColor: {
    type: String,
    default: '#00f0ff'
  },
  vibeTag: {
    type: String,
    enum: ['hype', 'dark', 'chill'],
    required: true
  },
  catchphrases: [{
    type: String
  }],
  personalityPrompt: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Character', CharacterSchema);
