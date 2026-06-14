const express = require('express');
const router = express.Router();
const Character = require('../models/Character');

// GET /api/characters - return all characters (no auth required)
router.get('/', async (req, res) => {
  try {
    const characters = await Character.find();
    res.json(characters);
  } catch (err) {
    console.error('Failed to fetch characters:', err.message);
    res.status(500).json({ message: 'Failed to fetch characters', error: err.message });
  }
});

module.exports = router;
