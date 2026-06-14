const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  senderType: {
    type: String,
    enum: ['USER', 'AI_AGENT', 'SYSTEM'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.Mixed, // Can be User ObjectId or String "AI_AGENT"
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  characterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character'
  },
  fanclubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fanclub'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
