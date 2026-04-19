// filepath: api/src/routes/points.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const uuid = require('uuid');
const PointEvent = require('../models/PointEvent');
const User = require('../models/User');
const Household = require('../models/Household');
const Violation = require('../models/Violation');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const pointsEngine = require('../services/pointsEngine');
const { validate } = require('../middleware/validate');
const { checkWardMatch, checkGPSBoundary, checkDuplicateHouseholdScan, checkCollectorApprovalRate } = require('../utils/antifraud');

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

// Leaderboard — top citizens by points
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const wardId = req.user.wardId;

    const leaders = await User.find({ role: 'citizen', wardId, isActive: true })
      .sort({ pointsBalance: -1, _id: 1 })
      .limit(limit)
      .select('name phone pointsBalance totalPointsEarned createdAt');

    // Get current user's actual balance from DB
    const currentUser = await User.findById(req.user.id).select('pointsBalance _id');
    const myBalance = currentUser?.pointsBalance || 0;

    // Find current user's rank, breaking ties by _id (which perfectly matches the sort order)
    const myRank = await User.countDocuments({
      role: 'citizen', wardId, isActive: true,
      $or: [
        { pointsBalance: { $gt: myBalance } },
        { pointsBalance: myBalance, _id: { $lt: currentUser._id } }
      ]
    }) + 1;

    res.json({
      success: true,
      data: { leaders, myRank, myBalance, totalCitizens: await User.countDocuments({ role: 'citizen', wardId, isActive: true }) },
      message: 'Leaderboard fetched'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
  }
});

// Badges — compute badges for a user
router.get('/badges', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const totalEarned = user.totalPointsEarned || user.pointsBalance || 0;
    const balance = user.pointsBalance || 0;

    // Count segregation scans
    const segregationCount = await PointEvent.countDocuments({ userId: req.user.id, action: 'SEGREGATION' });
    const compostingCount = await PointEvent.countDocuments({ userId: req.user.id, action: 'COMPOSTING' });
    const referralCount = await PointEvent.countDocuments({ userId: req.user.id, action: 'REFERRAL' });
    const redemptionCount = await PointEvent.countDocuments({ userId: req.user.id, type: 'REDEEM' });

    // Count consecutive days (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentScans = await PointEvent.aggregate([
      { $match: { userId: user._id, action: 'SEGREGATION', createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } }
    ]);
    const streakDays = recentScans.length;

    const allBadges = [
      { id: 'first_scan', name: 'First Scan', icon: '🌱', desc: 'Complete your first segregation scan', earned: segregationCount >= 1, progress: Math.min(segregationCount, 1), target: 1 },
      { id: 'green_starter', name: 'Green Starter', icon: '🌿', desc: 'Earn 50 GreenPoints', earned: totalEarned >= 50, progress: Math.min(totalEarned, 50), target: 50 },
      { id: 'eco_warrior', name: 'Eco Warrior', icon: '🛡️', desc: 'Earn 200 GreenPoints', earned: totalEarned >= 200, progress: Math.min(totalEarned, 200), target: 200 },
      { id: 'green_champion', name: 'Green Champion', icon: '🏆', desc: 'Earn 500 GreenPoints', earned: totalEarned >= 500, progress: Math.min(totalEarned, 500), target: 500 },
      { id: 'legend', name: 'Mumbai Legend', icon: '⭐', desc: 'Earn 1000 GreenPoints', earned: totalEarned >= 1000, progress: Math.min(totalEarned, 1000), target: 1000 },
      { id: 'streak_7', name: '7-Day Streak', icon: '🔥', desc: 'Segregate waste 7 days in a row', earned: streakDays >= 7, progress: streakDays, target: 7 },
      { id: 'composter', name: 'Home Composter', icon: '🪱', desc: 'Log 5 composting events', earned: compostingCount >= 5, progress: Math.min(compostingCount, 5), target: 5 },
      { id: 'referral_star', name: 'Referral Star', icon: '🤝', desc: 'Refer 3 friends', earned: referralCount >= 3, progress: Math.min(referralCount, 3), target: 3 },
      { id: 'redeemer', name: 'Smart Redeemer', icon: '🎁', desc: 'Redeem 3 rewards', earned: redemptionCount >= 3, progress: Math.min(redemptionCount, 3), target: 3 },
      { id: 'century', name: 'Century Club', icon: '💯', desc: 'Complete 100 segregation scans', earned: segregationCount >= 100, progress: Math.min(segregationCount, 100), target: 100 },
    ];

    res.json({
      success: true,
      data: { badges: allBadges, totalEarned: allBadges.filter(b => b.earned).length, total: allBadges.length },
      message: 'Badges fetched'
    });
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

const collectorScanSchema = Joi.object({
  qrCode: Joi.string().required(),
  location: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required()
  }).optional().allow(null),
  note: Joi.string().allow('', null).optional()
});

router.post('/collector-scan', auth, requireRole('collector'), validate(collectorScanSchema), async (req, res) => {
  try {
    const { qrCode, location, note } = req.body;
    const collectorId = req.user.id;
    const collectorWardId = req.user.wardId;

    // 1. Find household by qrCode
    const household = await Household.findOne({ qrCode, isActive: true }).populate('citizenId');
    if (!household) {
      return res.status(404).json({
        success: false,
        message: 'QR code not recognised. This household may not be registered in GreenPoint.',
      });
    }

    const citizen = household.citizenId;
    if (!citizen || !citizen.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Citizen account associated with this household is inactive.',
      });
    }

    // 2. Anti-fraud: ward match check
    const wardCheck = checkWardMatch(collectorWardId, household.wardId);
    if (!wardCheck.valid) {
      return res.status(403).json({
        success: false,
        message: wardCheck.reason,
      });
    }

    // 3. Anti-fraud: GPS boundary check
    const gpsCheck = checkGPSBoundary(location?.lat, location?.lng, collectorWardId);
    if (!gpsCheck.valid) {
      return res.status(403).json({
        success: false,
        message: gpsCheck.reason,
      });
    }

    // 4. Anti-fraud: duplicate household scan check (already scanned today?)
    const dupCheck = await checkDuplicateHouseholdScan(household._id, PointEvent);
    if (dupCheck.duplicate) {
      return res.status(409).json({
        success: false,
        message: `Already scanned today at ${new Date(dupCheck.scannedAt).toLocaleTimeString('en-IN')}. Each household is scanned once per day.`,
      });
    }

    // 5. Award points to citizen
    const SEGREGATION_POINTS = 10;
    const result = await pointsEngine.earnPoints(
      citizen._id,
      'SEGREGATION',
      SEGREGATION_POINTS,
      `Waste segregation verified by collector`,
      {
        collectorId: collectorId.toString(),
        householdId: household._id.toString(),
        householdQrCode: qrCode,
        location: location || null,
        note: note || '',
      }
    );

    // 6. Update household metadata
    await Household.findByIdAndUpdate(household._id, {
      lastScannedAt: new Date(),
      lastScannedBy: collectorId,
      $inc: { totalScans: 1 },
    });

    // 7. Check collector approval rate (async, don't block response)
    checkCollectorApprovalRate(collectorId, PointEvent, Violation).then((audit) => {
      if (audit.suspicious) {
        console.warn(`⚠️  Suspicious collector activity: collectorId=${collectorId}, approvalRate=${audit.approvalRate}%, totalActions=${audit.totalActions}`);
      }
    }).catch(() => {}); // never throw

    // 8. Return success with full details
    return res.status(200).json({
      success: true,
      message: `Segregation verified! +${SEGREGATION_POINTS} GreenPoints credited to ${citizen.name}`,
      data: {
        pointsEarned: result.pointsEarned,
        citizenName: citizen.name,
        citizenPhone: citizen.phone,
        citizenNewBalance: result.newBalance,
        householdAddress: household.address,
        scannedAt: new Date().toISOString(),
        collectorId: collectorId,
      },
    });

  } catch (err) {
    if (err.code === 'DUPLICATE_SCAN') {
      return res.status(409).json({ success: false, message: 'Points already earned today for this action.' });
    }
    console.error('Collector scan error:', err);
    return res.status(500).json({ success: false, message: 'Scan failed. Please try again.' });
  }
});

router.get('/collector-stats', auth, requireRole('collector', 'officer'), async (req, res) => {
  try {
    const collectorId = req.user.role === 'officer' && req.query.collectorId ? req.query.collectorId : req.user.id;
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      scansToday, scansThisWeek, scansThisMonth,
      violationsLoggedToday, violationsLoggedThisMonth,
      todayEvents
    ] = await Promise.all([
      PointEvent.countDocuments({ 'metadata.collectorId': collectorId, action: 'SEGREGATION', createdAt: { $gte: todayStart } }),
      PointEvent.countDocuments({ 'metadata.collectorId': collectorId, action: 'SEGREGATION', createdAt: { $gte: sevenDaysAgo } }),
      PointEvent.countDocuments({ 'metadata.collectorId': collectorId, action: 'SEGREGATION', createdAt: { $gte: thirtyDaysAgo } }),
      Violation.countDocuments({ collectorId, createdAt: { $gte: todayStart } }),
      Violation.countDocuments({ collectorId, createdAt: { $gte: thirtyDaysAgo } }),
      PointEvent.find({ 'metadata.collectorId': collectorId, action: 'SEGREGATION', createdAt: { $gte: todayStart } })
        .populate({ path: 'userId', select: 'name' })
        .sort({ createdAt: -1 })
    ]);

    const topHouseholdsToday = await Promise.all(todayEvents.map(async (event) => {
      let address = 'Unknown';
      if (event.metadata && event.metadata.householdId) {
        const hh = await Household.findById(event.metadata.householdId).select('address');
        if (hh) address = hh.address;
      }
      return {
        address,
        citizenName: event.userId ? event.userId.name : 'Unknown',
        scannedAt: event.createdAt
      };
    }));

    const totalActionsThisMonth = scansThisMonth + violationsLoggedThisMonth;
    const approvalRate = totalActionsThisMonth > 0 ? Math.round((scansThisMonth / totalActionsThisMonth) * 100) : 0;

    res.json({
      success: true,
      data: {
        scansToday, scansThisWeek, scansThisMonth,
        violationsLoggedToday, violationsLoggedThisMonth,
        approvalRate,
        topHouseholdsToday
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Stats fetch failed: ' + err.message });
  }
});

module.exports = router;
