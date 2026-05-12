const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const { protect, authorize, authorizeSection } = require('../middleware/auth');
const { checkShortage } = require('../services/alertService');
const ScheduleLog = require('../models/ScheduleLog');
const Notification = require('../models/Notification');

// @route   GET /api/schedules
// @desc    Get schedules (query: section, dateFrom, dateTo, employee)
// @access  Authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { section, dateFrom, dateTo, employee } = req.query;
    const filter = {};

    if (section) filter.section = section;
    if (employee) filter.employee = employee;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    if (req.query.confirmedOnly === 'true') {
      filter.isConfirmed = true;
    }

    const schedules = await Schedule.find(filter)
      .populate('employee', 'name personalNumber section offDay')
      .populate('overrideBy', 'name')
      .sort({ date: 1, 'employee.name': 1 });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/schedules/employee/:id
// @desc    Get individual employee schedule
// @access  Authenticated
router.get('/employee/:id', protect, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const filter = { employee: req.params.id };

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const schedules = await Schedule.find(filter)
      .populate('employee', 'name personalNumber section offDay')
      .sort({ date: 1 });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/schedules/summary
// @desc    Get shift counts per day per section (A/B/C/G/L/OFF/CO counts)
// @access  Authenticated
router.get('/summary', protect, async (req, res) => {
  try {
    const { section, dateFrom, dateTo } = req.query;
    const matchStage = {};

    if (section) matchStage.section = section;
    if (dateFrom || dateTo) {
      matchStage.date = {};
      if (dateFrom) matchStage.date.$gte = new Date(dateFrom);
      if (dateTo) matchStage.date.$lte = new Date(dateTo);
    }
    
    if (req.query.confirmedOnly === 'true') {
      matchStage.isConfirmed = true;
    }

    const summary = await Schedule.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { date: '$date', section: '$section', shift: '$shift' },
          count: { $sum: 1 },
          employees: { $push: '$employee' },
        },
      },
      {
        $group: {
          _id: { date: '$_id.date', section: '$_id.section' },
          shifts: {
            $push: {
              shift: '$_id.shift',
              count: '$count',
              employees: '$employees',
            },
          },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Populate employee details for the summary
    const populatedSummary = await User.populate(summary, {
      path: 'shifts.employees',
      select: 'name personalNumber',
    });

    res.json(populatedSummary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/schedules/:id
// @desc    Override a single schedule entry
// @access  Admin or Section Manager
router.put('/:id', protect, authorize('admin', 'shift_manager'), async (req, res) => {
  try {
    const { shift } = req.body;
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule entry not found' });
    }

    // Section manager can only edit their own section
    if (req.user.role === 'shift_manager' && schedule.section !== req.user.section) {
      return res.status(403).json({ message: 'You can only manage your own section' });
    }

    schedule.shift = shift;
    schedule.isOverride = true;
    schedule.overrideBy = req.user._id;
    await schedule.save();

    // Check for shortage after override
    await checkShortage(schedule.section, schedule.date);

    const populated = await schedule.populate([
      { path: 'employee', select: 'name personalNumber section' },
      { path: 'overrideBy', select: 'name' },
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/schedules/update-manual
// @desc    Update or create a specific shift manually
// @access  Admin, Shift Manager
router.post('/update-manual', protect, authorize('admin', 'shift_manager'), async (req, res) => {
  try {
    // Find existing for log
    const oldSchedule = await Schedule.findOne({ employee: employeeId, date: new Date(date) });
    const oldShift = oldSchedule ? oldSchedule.shift : 'NONE';

    // Find or create
    const schedule = await Schedule.findOneAndUpdate(
      { employee: employeeId, date: new Date(date) },
      { 
        $set: { 
          shift, 
          section, 
          isLocked: false,
          isConfirmed: false,
          isOverride: true
        } 
      },
      { upsert: true, new: true }
    ).populate('employee', 'name');

    // Create Log
    await ScheduleLog.create({
      admin: req.user._id,
      section,
      employeeName: schedule.employee.name,
      shiftDate: new Date(date),
      oldShift: oldShift,
      newShift: shift,
      action: 'manual_update'
    });

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/schedules/confirm
// @desc    Confirm generated schedule for a section and date range
// @access  Admin or Section Manager
router.post('/confirm', protect, authorize('admin', 'shift_manager'), async (req, res) => {
  try {
    const { section, dateFrom, dateTo } = req.body;

    // Section manager can only confirm their own section
    if (req.user.role === 'shift_manager' && section !== req.user.section) {
      return res.status(403).json({ message: 'You can only confirm your own section' });
    }

    const filter = { section };
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const result = await Schedule.updateMany(filter, { isConfirmed: true, isLocked: true });

    // Find affected employees to notify
    const affectedEmployees = await Schedule.distinct('employee', filter);
    
    // Create notifications for all affected employees
    if (affectedEmployees.length > 0) {
      const notificationPromises = affectedEmployees.map(empId => 
        Notification.create({
          recipient: empId,
          type: 'schedule_published',
          message: `Your schedule for ${section} has been published/updated for the period starting ${new Date(dateFrom).toLocaleDateString()}.`,
          metadata: { section, dateFrom, dateTo }
        })
      );
      await Promise.all(notificationPromises);
    }

    res.json({
      message: `Confirmed and notified ${result.modifiedCount} schedule entries for ${section}`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/schedules/save-draft
// @desc    Lock current draft without publishing
// @access  Admin or Section Manager
router.post('/save-draft', protect, authorize('admin', 'shift_manager'), async (req, res) => {
  try {
    const { section, dateFrom, dateTo } = req.body;

    const filter = { section };
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const result = await Schedule.updateMany(filter, { isLocked: true });

    res.json({
      message: `Saved ${result.modifiedCount} entries as draft`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/schedules/generate
// @desc    Generate schedule using the shift generator algorithm
// @access  Admin or Section Manager
router.post('/generate', protect, authorize('admin', 'shift_manager'), async (req, res) => {
  try {
    const { section, dateFrom, dateTo, targetEmployeeId } = req.body;

    // Section manager can only generate for their own section
    if (req.user.role === 'shift_manager' && section !== req.user.section) {
      return res.status(403).json({ message: 'You can only generate schedule for your own section' });
    }

    const shiftGenerator = require('../services/shiftGenerator');
    await shiftGenerator.generate(section, new Date(dateFrom), new Date(dateTo), targetEmployeeId);

    // Create Log
    await ScheduleLog.create({
      admin: req.user._id,
      section,
      employeeName: targetEmployeeId ? 'Specific Employee' : 'All Employees',
      shiftDate: new Date(dateFrom),
      oldShift: 'VARIES',
      newShift: 'AUTO',
      action: 'auto_generate'
    });

    res.json({ message: 'Schedule generated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/schedules/logs
// @desc    Get schedule activity logs
// @access  Admin or Shift Manager
router.get('/logs', protect, authorize('admin', 'shift_manager'), async (req, res) => {
  try {
    const { section } = req.query;
    const filter = section ? { section } : {};
    
    const logs = await ScheduleLog.find(filter)
      .populate('admin', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
      
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/schedules/clear
// @desc    Clear schedules for a section and date range
// @access  Admin or Section Manager
router.delete('/clear', protect, authorize('admin', 'shift_manager'), async (req, res) => {
  try {
    const { section, dateFrom, dateTo, targetEmployeeId } = req.body;

    const filter = { section };
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }
    if (targetEmployeeId) {
      filter.employee = targetEmployeeId;
    }

    // Only allow clearing unlocked schedules? Or all? 
    // User said "Clear", usually implies reset everything.
    const result = await Schedule.deleteMany(filter);

    res.json({
      message: `Cleared ${result.deletedCount} schedule entries`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
