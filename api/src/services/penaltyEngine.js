// filepath: api/src/services/penaltyEngine.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Violation = require('../models/Violation');
const pointsEngine = require('./pointsEngine');

const PENALTY_RULES = {
  NON_SEGREGATION: [
    { tier: 1, pointsDeduct: 20, fineAmount: 0,    status: 'PENDING' },     // 1st
    { tier: 1, pointsDeduct: 50, fineAmount: 0,    status: 'PENDING' },     // 2nd
    { tier: 2, pointsDeduct: 0,  fineAmount: 200,  status: 'FINE_ISSUED' }, // 3rd+
  ],
  LITTERING: [
    { tier: 2, pointsDeduct: 100, fineAmount: 500,  status: 'FINE_ISSUED' },
    { tier: 2, pointsDeduct: 200, fineAmount: 1000, status: 'FINE_ISSUED' },
    { tier: 3, pointsDeduct: 0,   fineAmount: 2000, status: 'FINE_ISSUED' },
  ],
  BURNING: [
    { tier: 3, pointsDeduct: 150, fineAmount: 1000, status: 'FINE_ISSUED' },
    { tier: 3, pointsDeduct: 0,   fineAmount: 2500, status: 'FINE_ISSUED' },
  ],
  BULK_VIOLATION: [
    { tier: 3, pointsDeduct: 0, fineAmount: 2000, status: 'FINE_ISSUED' },
  ],
};

const buildViolationMessage = (rule, count) => {
  const ordinal = count === 1 ? '1st' : count === 2 ? '2nd' : count === 3 ? '3rd' : `${count}th`;
  if (rule.status === 'FINE_ISSUED') {
    return `${ordinal} offence: ₹${rule.fineAmount} fine issued.`;
  } else {
    return `${ordinal} offence: ${rule.pointsDeduct} points deducted. Warning issued.`;
  }
};

const logViolation = async (citizenId, collectorId, violationType, location) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const existingCount = await Violation.countDocuments({
    citizenId,
    type: violationType,
    createdAt: { $gte: thirtyDaysAgo }
  });

  const offenceCountInWindow = existingCount + 1;
  const rules = PENALTY_RULES[violationType];
  const index = Math.min(offenceCountInWindow - 1, rules.length - 1);
  const rule = rules[index];

  let actualPointsDeducted = 0;
  if (rule.pointsDeduct > 0) {
    const res = await pointsEngine.deductPoints(citizenId, rule.pointsDeduct, 'VIOLATION_PENALTY', `Violation: ${violationType}`);
    actualPointsDeducted = res.pointsDeducted;
  }

  await User.findByIdAndUpdate(citizenId, { $inc: { violationCount30d: 1 } });

  const violation = new Violation({
    citizenId,
    collectorId,
    type: violationType,
    tier: rule.tier,
    offenceCountInWindow,
    status: rule.status,
    fineAmount: rule.fineAmount,
    pointsDeducted: actualPointsDeducted,
    location
  });

  await violation.save();
  
  return { violation, message: buildViolationMessage(rule, offenceCountInWindow) };
};

module.exports = { logViolation };
