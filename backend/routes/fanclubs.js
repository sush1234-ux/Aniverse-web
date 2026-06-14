const express = require('express');
const router = express.Router();
const Fanclub = require('../models/Fanclub');
const User = require('../models/User');

// GET /api/fanclubs - return all fanclubs with populated characters
router.get('/', async (req, res) => {
  try {
    const fanclubs = await Fanclub.find().populate('associatedCharacters');
    res.json(fanclubs);
  } catch (err) {
    console.error('Failed to fetch fanclubs:', err.message);
    res.status(500).json({ message: 'Failed to fetch fanclubs', error: err.message });
  }
});

// POST /api/fanclubs/:id/join - add fanclub to user's joined list
router.post('/:id/join', async (req, res) => {
  try {
    const fanclubId = req.params.id;
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Access token missing' });
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'aniverse_secret';
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.joinedFanclubs.includes(fanclubId)) {
      user.joinedFanclubs.push(fanclubId);
      await user.save();
    }
    res.json({ joinedFanclubs: user.joinedFanclubs });
  } catch (err) {
    console.error('Error joining fanclub:', err.message);
    res.status(500).json({ message: 'Failed to join fanclub', error: err.message });
  }
});

module.exports = router;
