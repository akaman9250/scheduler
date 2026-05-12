const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize, authorizeSection } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users (filterable by section, role)
// @access  Authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { section, role, active } = req.query;
    const filter = {};

    if (section) filter.section = section;
    if (role === 'all') {
      // Don't filter by role
    } else if (role) {
      filter.role = role;
    } else {
      filter.role = 'employee'; // Default to employees only
    }
    if (active !== undefined) filter.isActive = active === 'true';

    const users = await User.find(filter).select('-password').sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/users/search
// @desc    Search users by name or personalNumber
// @access  Authenticated
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { personalNumber: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { section: { $regex: q, $options: 'i' } },
      ],
      role: 'employee',
      isActive: true,
    }).select('-password').limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user profile
// @access  Authenticated
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Admin or Self
router.put('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only admin or user themselves or section manager can update
    const isSectionManager = req.user.role === 'shift_manager' && req.user.section === user.section;
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id && !isSectionManager) {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }

    const { name, email, phone, department, password, personalNumber } = req.body;
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (department) user.department = department;

    // Only admin or section manager can change these fields
    if (req.user.role === 'admin' || isSectionManager) {
      const { role, section, offDay, isActive, preferredShifts } = req.body;
      
      if (req.user.role === 'admin') {
        if (role) user.role = role;
        if (section !== undefined) user.section = section;
        if (isActive !== undefined) user.isActive = isActive;
        if (password) user.password = password; // pre-save hook will hash this
        if (personalNumber) user.personalNumber = personalNumber;
      }
      
      if (offDay) user.offDay = offDay;
      if (preferredShifts) user.preferredShifts = preferredShifts;
    }

    await user.save();
    const updatedUser = user.toJSON();

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/users/:id/section
// @desc    Change employee's section
// @access  Admin only
router.put('/:id/section', protect, authorize('admin'), async (req, res) => {
  try {
    const { section } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { section },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/users/:id/off-day
// @desc    Change employee's OFF day
// @access  Admin only
router.put('/:id/off-day', protect, authorize('admin'), async (req, res) => {
  try {
    const { offDay } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { offDay },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/users/section/:section/add
// @desc    Add employee to section
// @access  Admin or Section Manager
router.post('/section/:section/add', protect, authorize('admin', 'shift_manager'), authorizeSection, async (req, res) => {
  try {
    const { userId } = req.body;
    const section = decodeURIComponent(req.params.section);

    const user = await User.findByIdAndUpdate(
      userId,
      { section },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/users/section/:section/:userId
// @desc    Remove employee from section
// @access  Admin or Section Manager
router.delete('/section/:section/:userId', protect, authorize('admin', 'shift_manager'), authorizeSection, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { section: null },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: `${user.name} removed from section`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
