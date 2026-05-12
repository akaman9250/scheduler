const Schedule = require('../models/Schedule');
const User = require('../models/User');
const Leave = require('../models/Leave');
const Section = require('../models/Section');
const { checkShortage } = require('./alertService');

const SHIFTS = ['A', 'B', 'C'];
const SHIFT_ROTATION = { A: 'B', B: 'C', C: 'A' };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get the next shift in rotation: A -> B -> C -> A
 * Filters by preferredShifts if provided
 */
function getNextShift(currentShift, preferredShifts = ['A', 'B', 'C']) {
  const sequence = ['A', 'B', 'C'];
  // Filter sequence to only include preferred shifts
  const allowed = sequence.filter(s => preferredShifts.includes(s));
  
  if (allowed.length === 0) return 'A'; // Fallback
  
  const currentIndex = allowed.indexOf(currentShift);
  const nextIndex = (currentIndex + 1) % allowed.length;
  
  return allowed[nextIndex];
}

/**
 * Get all dates between start and end (inclusive)
 */
function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Get the day name from a date
 */
function getDayName(date) {
  return DAY_NAMES[date.getDay()];
}

/**
 * Get the last assigned shift for an employee before the start date
 */
async function getLastShift(employeeId, beforeDate) {
  const last = await Schedule.findOne({
    employee: employeeId,
    date: { $lt: beforeDate },
    shift: { $in: ['A', 'B', 'C'] },
  }).sort({ date: -1 });

  return last ? last.shift : null;
}

/**
 * Count consecutive duty days ending at a given date
 */
async function getConsecutiveDutyDays(employeeId, upToDate) {
  const schedules = await Schedule.find({
    employee: employeeId,
    date: { $lte: upToDate },
    shift: { $in: ['A', 'B', 'C', 'G'] },
  }).sort({ date: -1 }).limit(15);

  let count = 0;
  let expectedDate = new Date(upToDate);
  expectedDate.setHours(0, 0, 0, 0);

  for (const s of schedules) {
    const sDate = new Date(s.date);
    sDate.setHours(0, 0, 0, 0);

    if (sDate.getTime() === expectedDate.getTime()) {
      count++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }

  return count;
}

/**
 * Main shift generation algorithm
 *
 * Rules:
 * 1. One shift per person per day
 * 2. Min 2 employees per shift (A/B/C) per section
 * 3. Default shift continuity for the week until OFF day
 * 4. Rotation: A -> B -> C -> A after OFF day
 * 5. Leave: mark L, resume same shift next working day
 * 6. OFF days from profile
 * 7. Max 10 continuous duty days
 * 8. Minimize G shift usage
 * 9. Minimize intermediate shift changeovers
 * 10. Max (employees - 6) on leave/OFF per day
 */
async function generate(sectionName, startDate, endDate, targetEmployeeId = null) {
  // Get all active employees in this section
  const employees = await User.find({
    section: sectionName,
    isActive: true,
    role: 'employee',
  }).sort({ name: 1 });

  if (employees.length === 0) {
    throw new Error(`No active employees found in section ${sectionName}`);
  }

  const section = await Section.findOne({ name: sectionName });
  const minPerShift = section ? section.minPerShift : 2;
  const dates = getDateRange(startDate, endDate);
  const maxLeaveOff = Math.max(0, employees.length - 6);

  // Get approved leaves for the date range
  const leaves = await Leave.find({
    employee: { $in: employees.map(e => e._id) },
    date: { $gte: startDate, $lte: endDate },
    status: 'approved',
  });

  const leaveMap = {};
  for (const leave of leaves) {
    const key = `${leave.employee.toString()}_${leave.date.toISOString().split('T')[0]}`;
    leaveMap[key] = true;
  }

  // Track state per employee
  const empState = {};
  for (const emp of employees) {
    // Look back at the previous week for rotation context if no last shift found
    let lastShift = await getLastShift(emp._id, startDate);
    
    // If no last shift, look back further or default
    if (!lastShift) {
      const oneWeekAgo = new Date(startDate);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      lastShift = await getLastShift(emp._id, oneWeekAgo);
    }

    const consecutiveDays = await getConsecutiveDutyDays(emp._id, new Date(startDate.getTime() - 86400000));

    empState[emp._id.toString()] = {
      employee: emp,
      currentShift: lastShift || null,
      consecutiveDutyDays: consecutiveDays,
      wasOnOff: false,
      preferredShifts: emp.preferredShifts && emp.preferredShifts.length > 0 ? emp.preferredShifts : ['A', 'B', 'C'],
    };
  }

  // Assign initial shifts if employees don't have one yet
  // Distribute evenly across A, B, C
  const unassigned = Object.values(empState).filter(s => !s.currentShift);
  unassigned.forEach((state, idx) => {
    // Pick the first allowed shift from their preferences
    state.currentShift = state.preferredShifts[idx % state.preferredShifts.length];
  });

  const generatedSchedules = [];

  for (const date of dates) {
    const dateStr = date.toISOString().split('T')[0];
    const dayName = getDayName(date);

    // Phase 1: Determine each employee's shift for this day
    const dayAssignments = [];

    for (const emp of employees) {
      const id = emp._id.toString();
      const state = empState[id];
      const leaveKey = `${id}_${dateStr}`;

      // Check if there's a locked schedule already
      const existingLocked = await Schedule.findOne({
        employee: emp._id,
        date: date,
        isLocked: true
      });

      let shift;

      if (existingLocked) {
        shift = existingLocked.shift;
        // Update state based on locked shift
        if (['A', 'B', 'C', 'G'].includes(shift)) {
          state.currentShift = shift === 'G' ? state.currentShift : shift;
          state.consecutiveDutyDays++;
          state.wasOnOff = false;
        } else {
          state.consecutiveDutyDays = 0;
          state.wasOnOff = true;
        }
      }
      // Check if on leave
      else if (leaveMap[leaveKey]) {
        shift = 'L';
      }
      // Check if it's their OFF day
      else if (dayName === emp.offDay) {
        shift = 'OFF';
        state.wasOnOff = true;
        state.consecutiveDutyDays = 0;
      }
      // Check max 10 consecutive duty days
      else if (state.consecutiveDutyDays >= 10) {
        shift = 'CO'; // Forced comp off
        state.consecutiveDutyDays = 0;
        state.wasOnOff = true;
      }
      // Normal duty day
      else {
        // If coming back from OFF, rotate shift
        if (state.wasOnOff) {
          state.currentShift = getNextShift(state.currentShift, state.preferredShifts);
          state.wasOnOff = false;
        }
        shift = state.currentShift;
        state.consecutiveDutyDays++;
      }

      dayAssignments.push({
        employee: emp._id,
        date: date,
        shift: shift,
        section: sectionName,
        state: state,
      });
    }

    // Phase 2: Verify minimum staffing per shift (A/B/C)
    const shiftCounts = { A: 0, B: 0, C: 0 };
    const shiftEmployees = { A: [], B: [], C: [] };
    let leaveOffCount = 0;

    for (const a of dayAssignments) {
      if (['A', 'B', 'C'].includes(a.shift)) {
        shiftCounts[a.shift]++;
        shiftEmployees[a.shift].push(a);
      }
      if (['L', 'OFF', 'CO'].includes(a.shift)) {
        leaveOffCount++;
      }
    }

    // Phase 3: Check max leave/OFF limit
    if (leaveOffCount > maxLeaveOff) {
      // Too many people off — mark excess as needing attention
      // (In production, shift manager would handle this manually)
    }

    // Phase 4: Fill understaffed shifts using G shift
    // Find shifts below minimum and try to reassign from overstaffed shifts
    for (const shift of SHIFTS) {
      while (shiftCounts[shift] < minPerShift) {
        // Find an overstaffed shift to borrow from
        let donor = null;
        let maxCount = 0;

        for (const otherShift of SHIFTS) {
          if (otherShift !== shift && shiftCounts[otherShift] > minPerShift && shiftCounts[otherShift] > maxCount) {
            maxCount = shiftCounts[otherShift];
            donor = otherShift;
          }
        }

        if (donor) {
          // Move last employee from donor shift to understaffed shift
          const moved = shiftEmployees[donor].pop();
          if (moved) {
            moved.shift = shift;
            // Mark as G shift usage to track it
            shiftCounts[donor]--;
            shiftCounts[shift]++;
            shiftEmployees[shift].push(moved);
          }
        } else {
          // No donor available — cannot fill, will trigger alert
          break;
        }
      }
    }

    // Phase 4b: Excess Manpower -> Comp Off (CO)
    // If we have more than enough people in A/B/C/G, and total working is high,
    // we can give CO to people with high consecutive days.
    const workingCount = dayAssignments.filter(a => ['A', 'B', 'C', 'G'].includes(a.shift)).length;
    if (workingCount > 6) {
      const excess = workingCount - 6;
      // Find candidates for CO (unlocked duty shifts with most consecutive days)
      const candidates = dayAssignments
        .filter(a => ['A', 'B', 'C', 'G'].includes(a.shift))
        .filter(a => !a.isLocked) // Only unlocked can be changed to CO
        .sort((a, b) => empState[a.employee.toString()].consecutiveDutyDays - empState[b.employee.toString()].consecutiveDutyDays);

      for (let i = 0; i < excess && candidates.length > 0; i++) {
        const target = candidates.pop();
        if (target) {
          const s = empState[target.employee.toString()];
          // Only give CO if it doesn't drop a shift below minimum
          if (shiftCounts[target.shift] > minPerShift) {
            shiftCounts[target.shift]--;
            target.shift = 'CO';
            s.consecutiveDutyDays = 0;
            s.wasOnOff = true;
          }
        }
      }
    }

    // Phase 5: Save assignments
    for (const a of dayAssignments) {
      // Only add to generated list if not already locked (locked ones are already in DB)
      if (!a.isLocked) {
        generatedSchedules.push({
          employee: a.employee,
          date: a.date,
          shift: a.shift,
          section: a.section,
          isOverride: false,
          isConfirmed: false,
          isLocked: false,
        });
      }
    }
  }

  // Bulk upsert schedules
  const bulkOps = generatedSchedules
    .filter(s => !targetEmployeeId || s.employee.toString() === targetEmployeeId)
    .map(s => ({
      updateOne: {
        filter: { employee: s.employee, date: s.date },
        update: { $set: s },
        upsert: true,
      },
    }));

  if (bulkOps.length > 0) {
    await Schedule.bulkWrite(bulkOps);
  }

  // Check for shortages across all generated dates
  for (const date of dates) {
    await checkShortage(sectionName, date);
  }

  // Return the generated schedules with populated employee info
  const result = await Schedule.find({
    section: sectionName,
    date: { $gte: startDate, $lte: endDate },
  })
    .populate('employee', 'name personalNumber')
    .sort({ date: 1 });

  return result;
}

module.exports = { generate };
