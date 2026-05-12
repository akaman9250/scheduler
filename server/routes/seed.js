const express = require('express');
const router = express.Router();
const seed = require('../seed/seedData');

// @route   POST /api/seed
// @desc    Seed the database with default users and sections
// @access  Public
router.post('/', async (req, res) => {
  try {
    await seed();
    res.json({ message: 'Database seeded successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;