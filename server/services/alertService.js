const Schedule = require('../models/Schedule');
const Section = require('../models/Section');
const Notification = require('../models/Notification');
const User = require('../models/User');

const WORKING_SHIFTS = ['A', 'B', 'C'];

/**
 * Check for staffing shortages in a section on a given date.
 * Creates notifications for shift managers when shifts are understaffed.
 */
async function checkShortage(sectionName, date) {
  const section = await Section.findOne({ name: sectionName });
  if (!section) return;

  const minPerShift = section.minPerShift || 2;
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  // Count employees per shift for this section and date
  const schedules = await Schedule.find({
    section: sectionName,
    date: { $gte: dateStart, $lte: dateEnd },
  });

  const shiftCounts = {};
  for (const shift of WORKING_SHIFTS) {
    shiftCounts[shift] = schedules.filter(s => s.shift === shift).length;
  }

  // Check each shift for shortage
  const shortages = [];
  for (const shift of WORKING_SHIFTS) {
    if (shiftCounts[shift] < minPerShift) {
      shortages.push({
        shift,
        count: shiftCounts[shift],
        needed: minPerShift,
        deficit: minPerShift - shiftCounts[shift],
      });
    }
  }

  if (shortages.length === 0) return;

  // Find shift manager for this section
  const manager = section.shiftManager
    ? await User.findById(section.shiftManager)
    : null;

  // Also notify all admins
  const admins = await User.find({ role: 'admin', isActive: true });
  const recipients = [...admins];
  if (manager) recipients.push(manager);

  // Build alert message
  const dateStr = dateStart.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  for (const shortage of shortages) {
    const message = `⚠️ SHORTAGE ALERT: ${sectionName} — Shift ${shortage.shift} on ${dateStr} has only ${shortage.count} employee(s) (minimum: ${shortage.needed}). ${shortage.deficit} more needed.`;

    for (const recipient of recipients) {
      // Avoid duplicate notifications
      const existing = await Notification.findOne({
        recipient: recipient._id,
        type: 'shortage_alert',
        'metadata.section': sectionName,
        'metadata.date': dateStart,
        'metadata.shift': shortage.shift,
      });

      if (!existing) {
        await Notification.create({
          recipient: recipient._id,
          type: 'shortage_alert',
          message,
          metadata: {
            section: sectionName,
            date: dateStart,
            shift: shortage.shift,
            currentCount: shortage.count,
            minRequired: shortage.needed,
          },
        });
      }
    }
  }

  return shortages;
}

/**
 * Check max leave/off limit for a section on a date
 * Max allowed: (total employees in section - 6)
 */
async function checkMaxLeaveOff(sectionName, date) {
  const totalEmployees = await User.countDocuments({
    section: sectionName,
    isActive: true,
    role: { $in: ['employee', 'shift_manager'] },
  });

  const maxAllowed = Math.max(0, totalEmployees - 6);

  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  const leaveOffCount = await Schedule.countDocuments({
    section: sectionName,
    date: { $gte: dateStart, $lte: dateEnd },
    shift: { $in: ['L', 'OFF', 'CO'] },
  });

  if (leaveOffCount > maxAllowed) {
    const section = await Section.findOne({ name: sectionName });
    const recipients = await User.find({
      $or: [
        { role: 'admin' },
        { _id: section?.shiftManager },
      ],
      isActive: true,
    });

    const dateStr = dateStart.toLocaleDateString('en-IN');
    const message = `⚠️ MAX LEAVE ALERT: ${sectionName} on ${dateStr} — ${leaveOffCount} employees on leave/OFF (max allowed: ${maxAllowed}). Please adjust OFF days or manage leave.`;

    for (const recipient of recipients) {
      await Notification.create({
        recipient: recipient._id,
        type: 'max_leave_alert',
        message,
        metadata: {
          section: sectionName,
          date: dateStart,
          currentCount: leaveOffCount,
          maxAllowed,
        },
      });
    }

    return { exceeded: true, current: leaveOffCount, max: maxAllowed };
  }

  return { exceeded: false, current: leaveOffCount, max: maxAllowed };
}

module.exports = { checkShortage, checkMaxLeaveOff };
