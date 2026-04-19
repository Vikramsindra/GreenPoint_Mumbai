// filepath: api/src/jobs/penaltyReset.js
const cron = require('node-cron');
const User = require('../models/User');

const resetJob = cron.schedule('0 0 1 * *', async () => {
  try {
    const result = await User.updateMany({}, { $set: { violationCount30d: 0 } });
    console.log(`✅ Monthly violation window reset — ${result.modifiedCount} users updated`);
  } catch (error) {
    console.error('❌ Monthly violation window reset failed:', error.message);
  }
});

module.exports = resetJob;
