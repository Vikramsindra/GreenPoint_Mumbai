// filepath: api/src/services/pointsEngine.js
const mongoose = require('mongoose');
const User = require('../models/User');
const PointEvent = require('../models/PointEvent');

const earnPoints = async (userId, action, points, description, metadata = {}) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const existing = await PointEvent.findOne({ userId, action, createdAt: { $gte: startOfToday } });
  if (existing) {
    throw Object.assign(new Error('Already logged today'), { code: 'DUPLICATE_SCAN' });
  }

  // Using sequential operations due to lack of transactions on M0 tier
  const event = new PointEvent({ userId, type: 'EARN', action, points, description, metadata });
  await event.save();
  
  const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { pointsBalance: points } }, { new: true });
  if (!updatedUser) {
    throw new Error('Citizen not found. Invalid QR code.');
  }
  
  return { pointsEarned: points, newBalance: updatedUser.pointsBalance };
};

const deductPoints = async (userId, points, action, description, metadata = {}) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const actualDeduction = Math.min(points, user.pointsBalance);
  
  const event = new PointEvent({ userId, type: 'DEDUCT', action, points: actualDeduction, description, metadata });
  await event.save();

  let newBalance = user.pointsBalance;
  if (actualDeduction > 0) {
    const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { pointsBalance: -actualDeduction } }, { new: true });
    newBalance = updatedUser.pointsBalance;
  }
  
  return { pointsDeducted: actualDeduction, newBalance };
};

const reverseDeduction = async (userId, pointsToRestore, violationId) => {
  const event = new PointEvent({ userId, type: 'EARN', action: 'REVERSAL', points: pointsToRestore, description: 'Appeal upheld — points restored', metadata: { violationId } });
  await event.save();
  
  const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { pointsBalance: pointsToRestore } }, { new: true });
  return { pointsRestored: pointsToRestore, newBalance: updatedUser.pointsBalance };
};

module.exports = { earnPoints, deductPoints, reverseDeduction };
