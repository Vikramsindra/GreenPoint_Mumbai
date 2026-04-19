// filepath: api/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const User = require('../models/User');
const Violation = require('../models/Violation');
const PointEvent = require('../models/PointEvent');
const Campaign = require('../models/Campaign');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');

router.get('/ward-stats', auth, requireRole('officer'), async (req, res) => {
  try {
    const wardId = req.user.wardId;
    const todayStart = new Date(); 
    todayStart.setHours(0,0,0,0);
    const monthStart = new Date(); 
    monthStart.setDate(1); 
    monthStart.setHours(0,0,0,0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Only looking at SEGREGATION scans here
    const [
      scansToday,
      totalCitizens,
      activeViolations,
      redemptionsThisMonth,
      dailyTrendRaw,
      violationBreakdown,
      topCitizens
    ] = await Promise.all([
      PointEvent.countDocuments({ action: 'SEGREGATION', createdAt: { $gte: todayStart } }),
      User.countDocuments({ role: 'citizen', wardId, isActive: true }),
      Violation.countDocuments({ status: { $in: ['PENDING', 'FINE_ISSUED'] } }),
      PointEvent.countDocuments({ action: 'REDEMPTION', createdAt: { $gte: monthStart } }),
      PointEvent.aggregate([
        { $match: { action: 'SEGREGATION', createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Violation.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $project: { _id: 1, count: 1 } }
      ]),
      User.find({ role: 'citizen', wardId, isActive: true }).sort({ pointsBalance: -1 }).limit(5).select('name phone pointsBalance')
    ]);

    const compliancePercent = totalCitizens > 0 ? Math.min(Math.round((scansToday / totalCitizens) * 100), 100) : 0;
    
    // Fill in missing days for trend
    const dailyTrend = [];
    const _dateMapping = {};
    dailyTrendRaw.forEach(item => _dateMapping[item._id] = item.count);
    
    for (let i = 0; i <= 6; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const isoStr = d.toISOString().split('T')[0];
        dailyTrend.push({ date: isoStr, count: _dateMapping[isoStr] || 0 });
    }

    res.json({
      success: true,
      data: {
        scansToday,
        totalCitizens,
        activeViolations,
        redemptionsThisMonth,
        compliancePercent,
        dailyTrend,
        violationBreakdown,
        topCitizens
      },
      message: 'Ward stats fetched'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
  }
});

router.get('/citizens', auth, requireRole('officer'), async (req, res) => {
  try {
    const { search, sortBy } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    let filter = { wardId: req.user.wardId, role: 'citizen' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    let sortObj = { pointsBalance: -1 };
    if (sortBy === 'violationCount30d') {
        sortObj = { violationCount30d: -1 };
    }
    
    const [citizens, totalCount] = await Promise.all([
      User.find(filter)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-passwordHash'),
      User.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: { citizens, totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
      message: 'Citizens fetched'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
  }
});

router.get('/recent-violations', auth, requireRole('officer'), async (req, res) => {
  try {
    const violations = await Violation.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('citizenId', 'name phone')
      .populate('collectorId', 'name phone');
    res.json({ success: true, data: violations, message: 'Recent violations fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
  }
});

const campaignSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  type: Joi.string().valid('AWARENESS', 'CHALLENGE', 'QUIZ').required(),
  bonusPoints: Joi.number().min(0).max(200).required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  quizQuestions: Joi.when('type', {
    is: 'QUIZ',
    then: Joi.array().items(
      Joi.object({
        question: Joi.string().required(),
        options: Joi.array().items(Joi.string()).length(4).required(),
        correctIndex: Joi.number().min(0).max(3).required()
      })
    ).min(3).max(5).required(),
    otherwise: Joi.array().optional()
  })
});

router.post('/campaigns', auth, requireRole('officer'), validate(campaignSchema), async (req, res) => {
  try {
    const campaignData = {
      ...req.body,
      createdBy: req.user.id,
      wardId: req.user.wardId
    };
    
    const campaign = new Campaign(campaignData);
    await campaign.save();
    
    res.status(201).json({ success: true, data: campaign, message: 'Campaign created' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Create failed: ' + error.message });
  }
});

router.patch('/campaigns/:id/deactivate', auth, requireRole('officer'), async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: campaign, message: 'Campaign deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Deactivate failed: ' + error.message });
  }
});

module.exports = router;
