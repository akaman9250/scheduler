const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Leave = require('../models/Leave');
const { protect } = require('../middleware/auth');

// @route   GET /api/stats/dashboard
// @desc    Get dashboard summary stats with employee names per section
// @access  Authenticated
router.get('/dashboard', protect, async (req, res) => {
  try {
    const now = new Date();
    const h = now.getHours();

    let currentShift;
    if (h >= 6 && h < 14) {
      currentShift = 'A';
    } else if (h >= 14 && h < 22) {
      currentShift = 'B';
    } else {
      currentShift = 'C';
    }

    const shiftDate = new Date(now);
    shiftDate.setHours(0, 0, 0, 0);
    if (currentShift === 'C' && h < 6) {
      shiftDate.setDate(shiftDate.getDate() - 1);
    }

    const employeeIds = await User.find({ role: 'employee', isActive: true }).distinct('_id');

    const schedulesForShift = await Schedule.find({
      date: shiftDate,
      shift: currentShift,
      isConfirmed: true,
      employee: { $in: employeeIds }
    }).populate('employee', 'name');

    const sectionCountsMap = {};
    const employeesBySection = {};
    schedulesForShift.forEach(sch => {
      const sec = sch.section;
      sectionCountsMap[sec] = (sectionCountsMap[sec] || 0) + 1;
      if (sch.employee && sch.employee.name) {
        if (!employeesBySection[sec]) employeesBySection[sec] = [];
        employeesBySection[sec].push(sch.employee.name);
      }
    });

    const sectionCounts = Object.keys(sectionCountsMap).map(key => ({
      _id: key,
      count: sectionCountsMap[key]
    }));

    const [
      totalEmployees,
      pendingLeaves,
      dailyStats
    ] = await Promise.all([
      User.countDocuments({ role: 'employee', isActive: true }),
      Leave.countDocuments({ status: 'pending', employee: { $in: employeeIds } }),
      Schedule.aggregate([
        { $match: { date: shiftDate, isConfirmed: true, employee: { $in: employeeIds } } },
        { $group: { _id: '$shift', count: { $sum: 1 } } }
      ])
    ]);

    const manpower = {
      shift: currentShift,
      entry: sectionCounts.find(s => s._id === 'CGL-1 Entry')?.count || 0,
      process: sectionCounts.find(s => s._id === 'CGL-1 Process')?.count || 0,
      exit: sectionCounts.find(s => s._id === 'CGL-1 Exit')?.count || 0
    };

    const chartData = ['A', 'B', 'C'].map(s => {
      const stat = dailyStats.find(st => st._id === s);
      return { name: `Shift ${s}`, count: stat ? stat.count : 0 };
    });

    res.json({
      totalEmployees,
      pendingLeaves,
      manpower,
      alerts: (manpower.entry + manpower.process + manpower.exit) < 6 ? 1 : 0,
      chartData,
      employeesBySection
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
