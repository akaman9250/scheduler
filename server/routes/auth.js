const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize, generateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { personalNumber, name, password, email, phone } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ personalNumber });
    if (userExists) {
      return res.status(400).json({ message: 'User with this personal number already exists' });
    }

    const user = await User.create({
      personalNumber,
      name,
      password,
      email,
      phone,
    });

    res.status(201).json({
      _id: user._id,
      personalNumber: user.personalNumber,
      name: user.name,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user & return token
// @access  Public
router.post('/login', [
  body('personalNumber').notEmpty().withMessage('Personal number is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { personalNumber, password } = req.body;

    const user = await User.findOne({ personalNumber });
    if (!user) {
      return res.status(401).json({ message: 'Invalid personal number or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid personal number or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated. Contact admin.' });
    }

    res.json({
      _id: user._id,
      personalNumber: user.personalNumber,
      name: user.name,
      role: user.role,
      section: user.section,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/guest
// @desc    Guest login with a guest ID
// @access  Public
router.post('/guest', async (req, res) => {
  try {
    const { guestId } = req.body;

    const guest = await User.findOne({ personalNumber: guestId, role: 'guest' });
    if (!guest) {
      return res.status(401).json({ message: 'Invalid guest ID' });
    }

    res.json({
      _id: guest._id,
      personalNumber: guest.personalNumber,
      name: guest.name,
      role: guest.role,
      token: generateToken(guest._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change own password (requires current password)
// @access  Authenticated
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/auth/reset-password/:id
// @desc    Admin resets a user's password (no current password needed)
// @access  Admin only
router.put('/reset-password/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: `Password reset successfully for ${user.name}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Authenticated
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
