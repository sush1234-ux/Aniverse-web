const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');

// GET /api/messages/:fanclubId - return last 50 messages for a fanclub (or all if no fanclubId)
router.get('/:fanclubId', async (req, res) => {
  try {
    const fanclubId = req.params.fanclubId;
    const query = fanclubId ? { fanclubId } : {};
    const messages = await ChatMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(50);
    // reverse so oldest first
    res.json(messages.reverse());
  } catch (err) {
    console.error('Failed to fetch messages:', err.message);
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
});

module.exports = router;
