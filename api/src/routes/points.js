// filepath: api/src/routes/points.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const uuid = require('uuid');
const PointEvent = require('../models/PointEvent');
const User = require('../models/User');
const auth = require('../middleware/auth');
const pointsEngine = require('../services/pointsEngine');
const { validate } = require('../middleware/validate');

const POINTS_MAP = { SEGREGATION: 10, COMPOSTING: 20, RECYCLABLE_DROP: 5, REFERRAL: 15 };

const scanSchema = Joi.object({
  qrCode: Joi.string().required(),
  action: Joi.string().valid('SEGREGATION', 'COMPOSTING', 'RECYCLABLE_DROP', 'REFERRAL').required(),
  collectorId: Joi.string().allow(null, ''),
  isSegregated: Joi.boolean().optional(),
  amount: Joi.string().allow(null, '').optional(),
  notes: Joi.string().allow(null, '').optional()
});

router.post('/scan', auth, validate(scanSchema), async (req, res) => {
  try {
    const { qrCode, action, collectorId, isSegregated, amount, notes } = req.body;
    
    // Check if the collector explicitly marked it as not segregated
    if (isSegregated === false) {
      // We don't award points, but we could log it. For now, just return success.
      return res.json({
        success: true,
        data: { pointsEarned: 0, newBalance: null, action },
        message: 'Waste not segregated. No points awarded.'
      });
    }

    let desc = `Points earned for ${action.toLowerCase().replace('_', ' ')}`;
    if (action === 'SEGREGATION') desc = 'Daily segregation at pickup';
    else if (action === 'COMPOSTING') desc = 'Weekly home composting';
    else if (action === 'RECYCLABLE_DROP') desc = 'Recyclable drop at kiosk';

    const metadata = {
      collectorId: req.user.id, // The person scanning is the collector
      amount,
      notes
    };

    // The 'qrCode' acts as the Citizen's User ID
    const result = await pointsEngine.earnPoints(qrCode, action, POINTS_MAP[action], desc, metadata);
    
    res.json({
      success: true,
      data: { pointsEarned: result.pointsEarned, newBalance: result.newBalance, action },
      message: `+${result.pointsEarned} GreenPoints awarded to citizen!`
    });
  } catch (error) {
    if (error.code === 'DUPLICATE_SCAN') {
      return res.status(409).json({ success: false, message: 'Already logged today for this citizen. Come back tomorrow!' });
    }
    res.status(500).json({ success: false, message: 'Scan processing failed: ' + error.message });
  }
});

router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('pointsBalance name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { balance: user.pointsBalance, name: user.name }, message: 'Balance fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const page = parseInt(req.query.page) || 1;
    
    const [events, totalCount] = await Promise.all([
      PointEvent.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PointEvent.countDocuments({ userId: req.user.id })
    ]);
    
    res.json({ success: true, data: { events, totalCount, page, limit }, message: 'History fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
  }
});

router.get('/redeem-options', auth, (req, res) => {
  const options = [
    { id: 'BEST_50',    name: 'BEST Bus Credit',          description: '₹10 credit added to your BEST bus card',             pointsCost: 50,  category: 'transport', emoji: '🚌' },
    { id: 'METRO_75',   name: 'Metro Credit',             description: '₹15 added to your Mumbai Metro wallet',              pointsCost: 75,  category: 'transport', emoji: '🚇' },
    { id: 'UTILITY_100',name: 'Electricity Bill Discount', description: '₹20 off your next MSEDCL electricity bill via BBPS', pointsCost: 100, category: 'utility',   emoji: '⚡' },
    { id: 'VENDOR_30',  name: 'Kirana Voucher',           description: '₹5 voucher at any registered Green Partner store',   pointsCost: 30,  category: 'shopping',  emoji: '🛒' },
    { id: 'TAX_200',    name: 'BMC Tax Rebate',           description: 'Applied to your society\'s property tax account',    pointsCost: 200, category: 'civic',     emoji: '🏛️' },
  ];
  return res.json({ success: true, data: options, message: 'Options fetched' });
});

const redeemSchema = Joi.object({
  rewardId: Joi.string().required(),
  pointsCost: Joi.number().min(1).required()
});

router.post('/redeem', auth, validate(redeemSchema), async (req, res) => {
  try {
    const { rewardId, pointsCost } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.pointsBalance < pointsCost) {
      return res.status(400).json({ success: false, message: 'Insufficient points balance' });
    }
    
    const voucherCode = uuid.v4().toUpperCase().slice(0, 12);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const result = await pointsEngine.deductPoints(req.user.id, pointsCost, 'REDEMPTION', `Redeemed: ${rewardId}`, {
      voucherCode,
      rewardId,
      expiresAt
    });
    
    res.json({
      success: true,
      data: {
        voucherCode,
        rewardId,
        pointsSpent: pointsCost,
        remainingBalance: result.newBalance,
        expiresAt
      },
      message: 'Redemption successful'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Redemption failed: ' + error.message });
  }
});

module.exports = router;
