// filepath: api/src/scripts/provisionStaff.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const connectDB = require('../config/db');
const { isValidWard } = require('../constants/wards');

async function provisionStaff() {
  const args = process.argv.slice(2);
  const params = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      params[key] = value;
    }
  }

  const {
    name = process.env.STAFF_NAME,
    phone = process.env.STAFF_PHONE,
    role = process.env.STAFF_ROLE || 'officer',
    ward = process.env.STAFF_WARD || 'N-WARD',
    password = process.env.STAFF_PASSWORD || 'Staff@123',
    collectorId = process.env.STAFF_COLLECTOR_ID
  } = params;

  if (!name || !phone || !password) {
    console.error('Usage: node src/scripts/provisionStaff.js --name "Full Name" --phone "9876543210" --role "officer|collector|bmc_collector" [--ward "N-WARD"] [--collectorId "BMC1001"] [--password "Secret@123"]');
    process.exit(1);
  }

  const allowedRoles = ['officer', 'collector', 'bmc_collector'];
  if (!allowedRoles.includes(role)) {
    console.error(`Invalid role: ${role}. Must be one of: ${allowedRoles.join(', ')}`);
    process.exit(1);
  }

  if (!/^\d{10}$/.test(phone)) {
    console.error('Phone number must be exactly 10 digits.');
    process.exit(1);
  }

  if (!isValidWard(ward)) {
    console.error(`Invalid ward: ${ward}.`);
    process.exit(1);
  }

  if ((role === 'collector' || role === 'bmc_collector') && !collectorId) {
    console.error(`Collector ID is required for role ${role}`);
    process.exit(1);
  }

  await connectDB();

  try {
    const existing = await User.findOne({ phone });
    if (existing) {
      console.error(`❌ User with phone ${phone} already exists (role: ${existing.role}, name: ${existing.name}). Will not overwrite.`);
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      phone,
      passwordHash,
      role,
      wardId: ward.toUpperCase(),
      collectorId: collectorId || null
    });

    await user.save();
    console.log(`✅ Successfully provisioned ${role}:`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Ward: ${user.wardId}`);
    if (user.collectorId) console.log(`   Collector ID: ${user.collectorId}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Provisioning failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  provisionStaff();
}

module.exports = provisionStaff;
