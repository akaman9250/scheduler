const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Section = require('../models/Section');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/leaves
// @desc    Employee requests leave
// @access  Authenticated (employee, shift_manager, admin)
router.post('/', protect, async (req, res) => {
  try {
    const { date, type, reason } = req.body;

    // Check if leave already exists for this date
    const existing = await Leave.findOne({ employee: req.user._id, date: new Date(date) });
    if (existing) {
      return res.status(400).json({ message: 'Leave already requested for this date' });
    }

    const leave = await Leave.create({
      employee: req.user._id,
      date: new Date(date),
      type: type || 'leave',
      reason: reason || '',
    });

    // Notify the shift manager of the employee's section
    if (req.user.section) {
      const section = await Section.findOne({ name: req.user.section }).populate('shiftManager');
      if (section && section.shiftManager) {
        await Notification.create({
          recipient: section.shiftManager._id,
          type: 'leave_request',
          message: `${req.user.name} (${req.user.personalNumber}) has requested leave on ${new Date(date).toLocaleDateString()}`,
          metadata: {
            leaveId: leave._id,
            employeeId: req.user._id,
            date: leave.date,
            section: req.user.section,
          },
        });
      }
    }

    const populated = await leave.populate('employee', 'name personalNumber section');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/leaves
// @desc    Get leaves (query: section, dateFrom, dateTo, status, employee)
// @access  Authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { section, dateFrom, dateTo, status, employee } = req.query;
    const filter = {};

    if (employee) {
      filter.employee = employee;
    } else if (req.user.role === 'employee') {
      // Employees can only see their own leaves
      filter.employee = req.user._id;
    }

    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    let leaves = await Leave.find(filter)
      .populate('employee', 'name personalNumber section')
      .populate('approvedBy', 'name')
      .sort({ date: -1 });

    // Filter by section if provided (after populate)
    if (section) {
      leaves = leaves.filter(l => l.employee && l.employee.section === section);
    }

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/leaves/:id/approve
// @desc    Approve or reject leave
// @access  Admin or Section Manager
router.put('/:id/approve', protect, authorize('admin', 'shift_manager'), async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const leave = await Leave.findById(req.params.id).populate('employee', 'name personalNumber section');

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Section manager can only approve leaves for their section
    if (req.user.role === 'shift_manager' && leave.employee.section !== req.user.section) {
      return res.status(403).json({ message: 'You can only manage leaves for your own section' });
    }

    leave.status = status;
    leave.approvedBy = req.user._id;
    await leave.save();

    // If approved, update schedule to mark 'L' for that day
    if (status === 'approved') {
      const Schedule = require('../models/Schedule');
      await Schedule.findOneAndUpdate(
        { employee: leave.employee._id, date: leave.date },
        { shift: 'L', isOverride: true, overrideBy: req.user._id },
        { upsert: true, new: true }
      );
    }

    const populated = await leave.populate('approvedBy', 'name');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
