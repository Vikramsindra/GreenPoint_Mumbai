// filepath: api/src/scripts/backfillSocietyJoinCodes.js
require('dotenv').config();
const mongoose = require('mongoose');
const Society = require('../models/Society');
const { generateSocietyJoinCode } = require('../utils/qrGenerator');

async function backfillSocietyJoinCodes() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not configured in environment');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB for Society Join Code backfill');

  const approvedSocietiesWithoutCode = await Society.find({
    registrationStatus: 'APPROVED',
    $or: [{ joinCode: null }, { joinCode: '' }, { joinCode: { $exists: false } }]
  });

  console.log(`Found ${approvedSocietiesWithoutCode.length} approved societies without join codes.`);

  let updatedCount = 0;
  for (const soc of approvedSocietiesWithoutCode) {
    let assigned = false;
    let attempts = 0;
    while (!assigned && attempts < 10) {
      attempts++;
      const code = generateSocietyJoinCode();
      const conflict = await Society.findOne({ joinCode: code });
      if (!conflict) {
        soc.joinCode = code;
        await soc.save();
        console.log(`✓ Assigned join code ${code} to society: ${soc.name} (${soc._id})`);
        assigned = true;
        updatedCount++;
      }
    }
  }

  console.log(`🎉 Backfill completed. Updated ${updatedCount} societies.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  backfillSocietyJoinCodes().catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
}

module.exports = backfillSocietyJoinCodes;
