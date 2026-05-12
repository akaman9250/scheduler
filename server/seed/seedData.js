const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Section = require('../models/Section');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const connectDB = require('../config/db');

const SECTIONS = ['CGL-1 Entry', 'CGL-1 Process', 'CGL-1 Exit'];
const OFF_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function seed() {
  await connectDB();

  console.log('🗑️  Clearing existing data...');
  await User.deleteMany({});
  await Section.deleteMany({});
  await require('../models/Schedule').deleteMany({});
  await require('../models/Leave').deleteMany({});
  await require('../models/Notification').deleteMany({});

  // Create admin
  console.log('👤 Creating admin user...');
  const admin = await User.create({
    personalNumber: 'ADMIN001',
    name: 'System Admin',
    email: 'admin@cgl.com',
    phone: '9999999999',
    password: 'admin123',
    role: 'admin',
    department: 'CGL',
    offDay: 'Sunday',
  });

  // Create guest user
  console.log('👤 Creating guest user...');
  await User.create({
    personalNumber: 'GUEST001',
    name: 'Guest Viewer',
    password: 'guest123',
    role: 'guest',
    department: 'CGL',
    offDay: 'Sunday',
  });

  // Create shift managers and employees per section
  const shiftManagers = [];

  for (let s = 0; s < SECTIONS.length; s++) {
    const sectionName = SECTIONS[s];
    console.log(`\n📋 Setting up section: ${sectionName}`);

    // Create shift manager
    const manager = await User.create({
      personalNumber: `SM${String(s + 1).padStart(3, '0')}`,
      name: `Manager ${sectionName.split(' ').pop()}`,
      email: `manager${s + 1}@cgl.com`,
      phone: `98000000${s + 1}0`,
      password: 'manager123',
      role: 'shift_manager',
      section: sectionName,
      department: 'CGL',
      offDay: OFF_DAYS[s % 7],
    });
    shiftManagers.push(manager);
    console.log(`  ✅ Shift Manager: ${manager.name} (${manager.personalNumber})`);

    // Create 8 employees per section
    for (let e = 1; e <= 8; e++) {
      const empNum = s * 8 + e;
      const emp = await User.create({
        personalNumber: `EMP${String(empNum).padStart(3, '0')}`,
        name: `Employee ${empNum}`,
        email: `emp${empNum}@cgl.com`,
        phone: `97000000${String(empNum).padStart(2, '0')}`,
        password: 'emp123',
        role: 'employee',
        section: sectionName,
        department: 'CGL',
        offDay: OFF_DAYS[(e - 1) % 7],
      });
      console.log(`  ✅ Employee: ${emp.name} (${emp.personalNumber}) — OFF: ${emp.offDay}`);
    }
  }

  // Create sections with shift manager references
  for (let s = 0; s < SECTIONS.length; s++) {
    await Section.create({
      name: SECTIONS[s],
      minPerShift: 2,
      shiftManager: shiftManagers[s]._id,
    });
    console.log(`\n🏢 Section created: ${SECTIONS[s]} — Manager: ${shiftManagers[s].name}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed data created successfully!');
  console.log('='.repeat(50));
  console.log('\n📝 Login Credentials:');
  console.log('  Admin:          ADMIN001 / admin123');
  console.log('  Guest:          GUEST001 / guest123');
  console.log('  Shift Managers: SM001-SM003 / manager123');
  console.log('  Employees:      EMP001-EMP024 / emp123');
  console.log('');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
