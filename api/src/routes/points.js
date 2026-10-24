// filepath: api/src/routes/points.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const uuid = require('uuid');
const PointEvent = require('../models/PointEvent');
const User = require('../models/User');
const Household = require('../models/Household');
const Violation = require('../models/Violation');
const Society = require('../models/Society');
const SocietyMembership = require('../models/SocietyMembership');
const HouseholdInspection = require('../models/HouseholdInspection');
const { getIstBusinessDate } = require('../utils/dateHelper');
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

router.post('/scan', auth, (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Legacy user ID scanning is disabled. Verified household collection requires /api/points/collector-scan with society membership verification.'
  });
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
  return res.status(403).json({
    success: false,
    message: 'Individual citizen reward redemption is temporarily paused during the BMC Society Rewards pilot. Your personal points balance and transaction history remain fully preserved. Please coordinate with your Society Representative for society-level pilot reward redemptions.'
  });
});

const collectorScanSchema = Joi.object({
  qrCode: Joi.string().allow('', null).optional(),
  householdId: Joi.string().allow('', null).optional(),
  outcome: Joi.string().valid('SEGREGATED', 'MIXED', 'NO_HANDOVER').default('SEGREGATED'),
  note: Joi.string().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
  weightKg: Joi.number().min(0).max(1000).allow(null).optional(),
  weightBasis: Joi.string().valid('ESTIMATED', 'MEASURED').default('ESTIMATED'),
  location: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required()
  }).optional().allow(null),
  requestId: Joi.string().allow('', null).optional()
}).or('qrCode', 'householdId');

router.post('/collector-scan', auth, requireRole('collector'), validate(collectorScanSchema), async (req, res) => {
  try {
    const { qrCode, householdId, outcome, location, weightKg, weightBasis, requestId } = req.body;
    const noteText = (req.body.notes || req.body.note || '').trim();
    const collectorId = req.user.id;
    const collectorWardId = req.user.wardId;

    // 1. Explanatory note requirement for non-segregated outcomes
    if ((outcome === 'MIXED' || outcome === 'NO_HANDOVER') && !noteText) {
      return res.status(400).json({
        success: false,
        message: `An explanatory note is required when recording ${outcome === 'MIXED' ? 'Mixed waste / Needs improvement' : 'No Handover'}.`
      });
    }

    // 2. Weight validation
    if (outcome === 'NO_HANDOVER' && weightKg != null && Number(weightKg) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Collected weight cannot be recorded for No Handover.'
      });
    }

    // 3. Find household by qrCode or householdId
    let household;
    if (qrCode) {
      household = await Household.findOne({ qrCode, isActive: true }).populate('citizenId');
    } else if (householdId) {
      household = await Household.findOne({ _id: householdId, isActive: true }).populate('citizenId');
    }

    if (!household) {
      return res.status(404).json({
        success: false,
        message: 'Household not recognised or inactive. Please scan an approved household QR.'
      });
    }

    const citizen = household.citizenId;
    if (!citizen || !citizen.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Citizen account associated with this household is inactive.'
      });
    }

    // 4. Collector assignment check: collector must be assigned to an approved society
    const collector = await User.findById(collectorId);
    if (!collector || !collector.isActive || !collector.assignedSocietyId) {
      return res.status(403).json({
        success: false,
        message: 'You have not been assigned to an approved housing society. Cannot inspect households.'
      });
    }

    const society = await Society.findById(collector.assignedSocietyId);
    if (!society || society.registrationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'Assigned society is inactive or not approved.'
      });
    }

    if (!society.internalCollectorId || society.internalCollectorId.toString() !== collector._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned as the designated internal collector for this society.'
      });
    }

    // 5. Society scope check: canonical societyRef cannot conflict
    if (household.societyRef && household.societyRef.toString() !== society._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Household does not belong to your assigned housing society.'
      });
    }

    // 6. Approved membership check: household must have an APPROVED membership in this society
    const approvedMembership = await SocietyMembership.findOne({
      societyId: society._id,
      status: 'APPROVED',
      $or: [
        { householdId: household._id },
        { citizenId: citizen._id }
      ]
    });

    if (!approvedMembership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Household does not have an approved membership in your assigned housing society.'
      });
    }

    // 7. Ward check
    const wardCheck = checkWardMatch(collectorWardId, household.wardId);
    if (!wardCheck.valid) {
      return res.status(403).json({
        success: false,
        message: wardCheck.reason
      });
    }

    const istBusinessDate = getIstBusinessDate(new Date());
    const effectiveRequestId = (requestId || '').trim() || `req_${collectorId}_${household._id}_${Date.now()}`;

    // 8. Retry & Idempotency check:
    if (requestId && requestId.trim()) {
      const existingByRequestId = await HouseholdInspection.findOne({
        collectorId: collector._id,
        requestId: requestId.trim()
      });

      if (existingByRequestId) {
        // If the request ID matches same household and same outcome, replay the original saved result
        const isSameInspection =
          existingByRequestId.householdId.toString() === household._id.toString() &&
          existingByRequestId.outcome === outcome;

        if (isSameInspection) {
          return res.status(200).json({
            success: true,
            message: 'Inspection replay: outcome previously recorded today.',
            data: {
              isReplay: true,
              inspection: existingByRequestId,
              pointsEarned: 0,
              citizenName: citizen.name,
              citizenPhone: citizen.phone,
              citizenNewBalance: citizen.pointsBalance,
              householdAddress: household.address,
              societyName: society.name,
              outcome: existingByRequestId.outcome,
              notes: existingByRequestId.notes,
              scannedAt: existingByRequestId.inspectedAt,
              collectorId: collectorId
            }
          });
        } else {
          // Conflicting reuse of request ID for different inspection
          return res.status(409).json({
            success: false,
            message: 'Conflict: Request ID has already been used for a different inspection record.'
          });
        }
      }
    }

    // 9. Daily uniqueness check: max one final inspection per household per IST day
    const existingInspectionToday = await HouseholdInspection.findOne({
      householdId: household._id,
      istBusinessDate
    });

    if (existingInspectionToday) {
      return res.status(409).json({
        success: false,
        message: `Already inspected today (${existingInspectionToday.outcome} at ${new Date(existingInspectionToday.inspectedAt).toLocaleTimeString('en-IN')}). Each household has one final inspection per day.`,
        data: {
          alreadyInspected: true,
          savedOutcome: existingInspectionToday.outcome,
          inspectedAt: existingInspectionToday.inspectedAt,
          notes: existingInspectionToday.notes
        }
      });
    }

    // 10. Persist structured HouseholdInspection
    const inspection = new HouseholdInspection({
      householdId: household._id,
      citizenId: citizen._id,
      societyId: society._id,
      collectorId: collector._id,
      outcome,
      notes: noteText,
      weightKg: outcome === 'NO_HANDOVER' ? 0 : (weightKg != null ? Number(weightKg) : null),
      weightBasis: weightBasis || 'ESTIMATED',
      location: location || null,
      istBusinessDate,
      requestId: effectiveRequestId,
      inspectedAt: new Date()
    });

    await inspection.save();

    // 11. Update household metadata (without awarding personal or society points)
    await Household.findByIdAndUpdate(household._id, {
      lastScannedAt: new Date(),
      lastScannedBy: collectorId,
      $inc: { totalScans: 1 }
    });

    // 12. Return clear receipt
    const outcomeLabel =
      outcome === 'SEGREGATED'
        ? 'Segregated waste handover'
        : outcome === 'MIXED'
        ? 'Mixed waste handover (needs improvement)'
        : 'No handover / absent';

    return res.status(200).json({
      success: true,
      message: `Participation recorded — no points awarded. (${outcomeLabel})`,
      data: {
        inspection: {
          _id: inspection._id,
          householdId: household._id,
          householdAddress: household.address,
          citizenName: citizen.name,
          citizenPhone: citizen.phone,
          societyId: society._id,
          societyName: society.name,
          outcome: inspection.outcome,
          notes: inspection.notes,
          weightKg: inspection.weightKg,
          weightBasis: inspection.weightBasis,
          inspectedAt: inspection.inspectedAt,
          istBusinessDate: inspection.istBusinessDate
        },
        pointsEarned: 0,
        citizenName: citizen.name,
        citizenPhone: citizen.phone,
        citizenNewBalance: citizen.pointsBalance,
        householdAddress: household.address,
        societyName: society.name,
        outcome: inspection.outcome,
        notes: inspection.notes,
        scannedAt: inspection.inspectedAt,
        collectorId: collectorId
      }
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate record: Household already has an inspection recorded for today or request ID conflict.'
      });
    }
    console.error('Collector inspection scan error:', err);
    return res.status(500).json({ success: false, message: 'Inspection submission failed. Please try again.' });
  }
});

router.get('/collector-stats', auth, requireRole('collector', 'officer'), async (req, res) => {
  try {
    let collectorId;
    if (req.user.role === 'collector') {
      collectorId = req.user.id;
    } else if (req.user.role === 'officer') {
      const queryCollectorId = req.query.collectorId;
      if (!queryCollectorId) {
        return res.status(400).json({ success: false, message: 'collectorId query parameter is required for officer audit' });
      }
      const collector = await User.findOne({ _id: queryCollectorId, role: 'collector', isActive: true });
      if (!collector || collector.wardId !== req.user.wardId) {
        return res.status(403).json({ success: false, message: 'Collector not found or not in your administrative ward' });
      }
      collectorId = collector._id.toString();
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized role' });
    }

    const collector = await User.findById(collectorId);
    const societyId = collector?.assignedSocietyId;
    const istBusinessDate = getIstBusinessDate(new Date());

    let assignedHouseholds = 0;
    if (societyId) {
      assignedHouseholds = await SocietyMembership.countDocuments({
        societyId,
        status: 'APPROVED'
      });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Operational counts from HouseholdInspection
    const inspectionsToday = await HouseholdInspection.find({
      collectorId,
      istBusinessDate
    })
      .populate('householdId', 'address')
      .populate('citizenId', 'name')
      .sort({ inspectedAt: -1 });

    const inspectedToday = inspectionsToday.length;
    const segregatedToday = inspectionsToday.filter(i => i.outcome === 'SEGREGATED').length;
    const mixedToday = inspectionsToday.filter(i => i.outcome === 'MIXED').length;
    const noHandoverToday = inspectionsToday.filter(i => i.outcome === 'NO_HANDOVER').length;
    const successfulHandoversToday = segregatedToday + mixedToday;
    const remainingToday = Math.max(0, assignedHouseholds - inspectedToday);

    const topHouseholdsToday = inspectionsToday.map(i => ({
      address: i.householdId?.address || 'Unknown',
      citizenName: i.citizenId?.name || 'Unknown',
      outcome: i.outcome,
      notes: i.notes || '',
      scannedAt: i.inspectedAt
    }));

    const [scansThisWeek, scansThisMonth] = await Promise.all([
      HouseholdInspection.countDocuments({ collectorId, inspectedAt: { $gte: sevenDaysAgo } }),
      HouseholdInspection.countDocuments({ collectorId, inspectedAt: { $gte: thirtyDaysAgo } })
    ]);

    const approvalRate = inspectedToday > 0 ? Math.round((segregatedToday / inspectedToday) * 100) : 0;

    res.json({
      success: true,
      data: {
        assignedHouseholds,
        inspectedToday,
        segregatedToday,
        mixedToday,
        noHandoverToday,
        successfulHandoversToday,
        remainingToday,
        // Compatibility fields:
        scansToday: inspectedToday,
        scansThisWeek,
        scansThisMonth,
        violationsLoggedToday: mixedToday,
        violationsLoggedThisMonth: 0,
        approvalRate,
        topHouseholdsToday
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Stats fetch failed: ' + err.message });
  }
});

router.get('/collector-history', auth, requireRole('collector'), async (req, res) => {
  try {
    const collectorId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const inspections = await HouseholdInspection.find({ collectorId })
      .populate('householdId', 'address qrCode')
      .populate('citizenId', 'name phone')
      .populate('societyId', 'name')
      .sort({ inspectedAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: { inspections },
      message: 'Collector inspection history fetched'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'History fetch failed: ' + err.message });
  }
});

module.exports = router;
