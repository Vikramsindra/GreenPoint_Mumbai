// filepath: api/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const User = require('../models/User');
const Violation = require('../models/Violation');
const PointEvent = require('../models/PointEvent');
const Campaign = require('../models/Campaign');
const Society = require('../models/Society');
const SocietyMembership = require('../models/SocietyMembership');
const Household = require('../models/Household');
const HouseholdInspection = require('../models/HouseholdInspection');
const BulkCollection = require('../models/BulkCollection');
const SocietyPointEvent = require('../models/SocietyPointEvent');
const SocietyVoucher = require('../models/SocietyVoucher');
const CollectionPoint = require('../models/CollectionPoint');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const { getIstBusinessDate, getIstDayRange, getPastIstDays } = require('../utils/dateHelper');

// ----------------------------------------------------------------------
// GET /api/dashboard/ward-stats
// Accurate, fully ward-scoped overview metrics for Ward Officer
// ----------------------------------------------------------------------
router.get('/ward-stats', auth, requireRole('officer'), async (req, res) => {
  try {
    const wardId = req.user.wardId;
    const todayStr = getIstBusinessDate();
    const todayRange = getIstDayRange(todayStr);

    // 1. Societies in ward
    const [approvedSocietiesCount, pendingSocietiesCount, wardSocieties] = await Promise.all([
      Society.countDocuments({ wardId, registrationStatus: 'APPROVED' }),
      Society.countDocuments({ wardId, registrationStatus: 'PENDING' }),
      Society.find({ wardId, registrationStatus: 'APPROVED' }).select('_id pointsBalance name')
    ]);
    const wardSocietyIds = wardSocieties.map(s => s._id);

    // 2. Member households in approved societies in ward
    // Exclude inactive households and inactive citizen accounts, using distinct valid household identities
    const approvedMemberships = await SocietyMembership.find({
      societyId: { $in: wardSocietyIds },
      status: 'APPROVED'
    })
      .populate('householdId', 'isActive')
      .populate('citizenId', 'isActive');

    const validApprovedHouseholdIds = new Set();
    for (const m of approvedMemberships) {
      if (
        m.householdId &&
        m.householdId.isActive !== false &&
        m.citizenId &&
        m.citizenId.isActive !== false
      ) {
        validApprovedHouseholdIds.add(m.householdId._id ? m.householdId._id.toString() : m.householdId.toString());
      }
    }
    const approvedHouseholdsCount = validApprovedHouseholdIds.size;

    // 3. Internal Household Inspections Today (from real HouseholdInspection)
    const householdInspectionsToday = await HouseholdInspection.find({
      societyId: { $in: wardSocietyIds },
      istBusinessDate: todayStr
    }).select('outcome householdId');

    const inspectedHouseholdsToday = householdInspectionsToday.length;
    const segregatedHouseholdsToday = householdInspectionsToday.filter(i => i.outcome === 'SEGREGATED').length;
    const mixedHouseholdsToday = householdInspectionsToday.filter(i => i.outcome === 'MIXED').length;
    const noHandoverHouseholdsToday = householdInspectionsToday.filter(i => i.outcome === 'NO_HANDOVER').length;
    const actualHouseholdHandoversToday = segregatedHouseholdsToday + mixedHouseholdsToday;

    // Household segregation rate: segregated / (segregated + mixed)
    const householdSegregationRate = actualHouseholdHandoversToday > 0
      ? Math.round((segregatedHouseholdsToday / actualHouseholdHandoversToday) * 100)
      : null;

    // 4. Municipal Bulk Pickups Today (BMC Collections in ward)
    const municipalPickupsToday = await BulkCollection.find({
      wardId,
      timestamp: { $gte: todayRange.start, $lte: todayRange.end }
    }).select('outcome weight societyId collectionPointId status');

    const municipalHandoverRecordsToday = municipalPickupsToday.length;
    // Successful municipal handovers MUST explicitly match SEGREGATED or MIXED
    const successfulMunicipalPickups = municipalPickupsToday.filter(
      p => p.outcome === 'SEGREGATED' || p.outcome === 'MIXED'
    );
    const successfulMunicipalHandoversToday = successfulMunicipalPickups.length;
    const segregatedMunicipalPickupsToday = municipalPickupsToday.filter(p => p.outcome === 'SEGREGATED').length;
    const mixedMunicipalPickupsToday = municipalPickupsToday.filter(p => p.outcome === 'MIXED').length;
    const noHandoverMunicipalAttemptsToday = municipalPickupsToday.filter(p => p.outcome === 'NO_HANDOVER').length;
    const legacyUnclassifiedMunicipalPickupsToday = municipalPickupsToday.filter(
      p => !['SEGREGATED', 'MIXED', 'NO_HANDOVER'].includes(p.outcome)
    ).length;

    // Manual entries (missing societyId) must NOT count as a distinct assigned society covered
    const distinctSocietiesMunicipalToday = new Set(
      successfulMunicipalPickups
        .map(p => (p.societyId ? p.societyId.toString() : null))
        .filter(Boolean)
    ).size;

    const municipalCollectedWeightToday = Math.round(
      successfulMunicipalPickups.reduce((sum, p) => sum + (p.weight || 0), 0) * 100
    ) / 100;
    const unlinkedMunicipalPickupsToday = municipalPickupsToday.filter(p => !p.societyId).length;
    const pendingReviewPickupsCount = await BulkCollection.countDocuments({ wardId, status: 'pending' });

    // 5. Society Rewards in ward
    const [earnedEventsToday, redeemedEventsToday, vouchersAwaitingFulfilment, vouchersFulfilled] = await Promise.all([
      SocietyPointEvent.find({
        societyId: { $in: wardSocietyIds },
        istBusinessDate: todayStr,
        pointsAwarded: { $gt: 0 }
      }).select('pointsAwarded'),
      SocietyPointEvent.find({
        societyId: { $in: wardSocietyIds },
        istBusinessDate: todayStr,
        pointsDeducted: { $gt: 0 }
      }).select('pointsDeducted'),
      SocietyVoucher.countDocuments({
        wardId,
        status: 'ISSUED',
        expiresAt: { $gt: new Date() }
      }),
      SocietyVoucher.countDocuments({
        wardId,
        status: 'FULFILLED'
      })
    ]);

    const societyPointsEarnedToday = earnedEventsToday.reduce((sum, e) => sum + (e.pointsAwarded || 0), 0);
    const societyPointsRedeemedToday = redeemedEventsToday.reduce((sum, e) => sum + (e.pointsDeducted || 0), 0);
    const outstandingSocietyPointsBalance = wardSocieties.reduce((sum, s) => sum + (s.pointsBalance || 0), 0);

    // 6. Ward-scoped Citizens & Violations
    const wardCitizens = await User.find({ role: 'citizen', wardId, isActive: true }).select('_id');
    const wardCitizenIds = wardCitizens.map(u => u._id);

    const [activeViolationsCount, violationBreakdown, topCitizens] = await Promise.all([
      Violation.countDocuments({ citizenId: { $in: wardCitizenIds }, status: { $in: ['PENDING', 'FINE_ISSUED'] } }),
      Violation.aggregate([
        { $match: { citizenId: { $in: wardCitizenIds } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $project: { _id: 1, count: 1 } }
      ]),
      User.find({ role: 'citizen', wardId, isActive: true })
        .sort({ pointsBalance: -1 })
        .limit(5)
        .select('name phone pointsBalance')
    ]);

    // 7. 7-Day Trend (Daily inspections, pickups, weight)
    const pastDays = getPastIstDays(7);
    const dailyTrend = await Promise.all(
      pastDays.map(async (dayStr) => {
        const range = getIstDayRange(dayStr);
        const [dayInspections, dayCollections] = await Promise.all([
          HouseholdInspection.countDocuments({
            societyId: { $in: wardSocietyIds },
            istBusinessDate: dayStr
          }),
          BulkCollection.find({
            wardId,
            timestamp: { $gte: range.start, $lte: range.end },
            outcome: { $in: ['SEGREGATED', 'MIXED'] }
          }).select('weight')
        ]);
        const dayWeight = dayCollections.reduce((sum, c) => sum + (c.weight || 0), 0);
        return {
          date: dayStr,
          count: dayInspections,
          householdInspections: dayInspections,
          municipalPickups: dayCollections.length,
          collectedWeight: Math.round(dayWeight * 10) / 10
        };
      })
    );

    res.json({
      success: true,
      data: {
        wardId,
        istBusinessDate: todayStr,
        // Society Metrics
        approvedSocieties: approvedSocietiesCount,
        pendingSocieties: pendingSocietiesCount,
        approvedHouseholds: approvedHouseholdsCount,
        totalCitizens: wardCitizens.length,
        // Household Inspection Metrics
        inspectedHouseholdsToday,
        segregatedHouseholdsToday,
        mixedHouseholdsToday,
        noHandoverHouseholdsToday,
        actualHouseholdHandoversToday,
        householdSegregationRate,
        // Municipal Pickup Metrics
        municipalHandoverRecordsToday,
        successfulMunicipalHandoversToday,
        segregatedMunicipalPickupsToday,
        mixedMunicipalPickupsToday,
        noHandoverMunicipalAttemptsToday,
        distinctSocietiesMunicipalToday,
        municipalCollectedWeightToday,
        unlinkedMunicipalPickupsToday,
        pendingReviewPickups: pendingReviewPickupsCount,
        // Society Rewards Metrics
        societyPointsEarnedToday,
        societyPointsRedeemedToday,
        outstandingSocietyPointsBalance,
        vouchersAwaitingFulfilment,
        vouchersFulfilled,
        // Historical/Compatibility keys
        scansToday: inspectedHouseholdsToday,
        compliancePercent: householdSegregationRate !== null ? householdSegregationRate : 0,
        activeViolations: activeViolationsCount,
        redemptionsThisMonth: societyPointsRedeemedToday,
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

// ----------------------------------------------------------------------
// GET /api/dashboard/collector-audit
// Accurate internal and municipal collector monitoring for Ward Officer
// ----------------------------------------------------------------------
router.get('/collector-audit', auth, requireRole('officer'), async (req, res) => {
  try {
    const officerWard = req.user.wardId;
    const todayStr = getIstBusinessDate();
    const todayRange = getIstDayRange(todayStr);

    // 1. Internal Society Collectors in this ward
    const internalCollectors = await User.find({
      role: 'collector',
      wardId: officerWard,
      isActive: true
    }).select('name phone collectorId assignedSocietyId createdAt').sort({ name: 1 });

    const internalCollectorData = await Promise.all(
      internalCollectors.map(async (collector) => {
        let society = null;
        if (collector.assignedSocietyId) {
          society = await Society.findById(collector.assignedSocietyId).select('name address registrationStatus pointsBalance');
        } else {
          society = await Society.findOne({ internalCollectorId: collector._id }).select('name address registrationStatus pointsBalance');
        }

        let assignedHouseholdsCount = 0;
        if (society) {
          const societyMemberships = await SocietyMembership.find({
            societyId: society._id,
            status: 'APPROVED'
          })
            .populate('householdId', 'isActive')
            .populate('citizenId', 'isActive');

          const validIds = new Set();
          for (const m of societyMemberships) {
            if (
              m.householdId &&
              m.householdId.isActive !== false &&
              m.citizenId &&
              m.citizenId.isActive !== false
            ) {
              validIds.add(m.householdId._id ? m.householdId._id.toString() : m.householdId.toString());
            }
          }
          assignedHouseholdsCount = validIds.size;
        }

        // Today's inspections by this collector
        const inspectionsToday = await HouseholdInspection.find({
          collectorId: collector._id,
          istBusinessDate: todayStr
        }).sort({ inspectedAt: -1 });

        const inspectedToday = inspectionsToday.length;
        const segregatedToday = inspectionsToday.filter(i => i.outcome === 'SEGREGATED').length;
        const mixedToday = inspectionsToday.filter(i => i.outcome === 'MIXED').length;
        const noHandoverToday = inspectionsToday.filter(i => i.outcome === 'NO_HANDOVER').length;
        const successfulHandoversToday = segregatedToday + mixedToday;
        const remainingToday = Math.max(0, assignedHouseholdsCount - inspectedToday);
        const lastInspectionAt = inspectionsToday.length > 0 ? inspectionsToday[0].inspectedAt : null;

        return {
          id: collector._id,
          name: collector.name,
          phone: collector.phone,
          collectorId: collector.collectorId,
          assignedSociety: society ? {
            id: society._id,
            name: society.name,
            address: society.address,
            status: society.registrationStatus
          } : null,
          assignedHouseholds: assignedHouseholdsCount,
          inspectedToday,
          segregatedToday,
          mixedToday,
          noHandoverToday,
          successfulHandoversToday,
          remainingToday,
          lastInspectionAt,
          activityStatus: inspectedToday === 0 ? 'Not Started Today' : remainingToday === 0 ? 'Round Completed' : 'In Progress'
        };
      })
    );

    // 2. Municipal BMC Collectors in this ward
    const bmcCollectors = await User.find({
      role: 'bmc_collector',
      wardId: officerWard,
      isActive: true
    }).select('name phone collectorId createdAt').sort({ name: 1 });

    const bmcCollectorData = await Promise.all(
      bmcCollectors.map(async (collector) => {
        const assignedPoints = await CollectionPoint.find({
          assignedCollectorId: collector._id,
          isActive: true
        }).populate('societyId', 'name address');

        const collectionsToday = await BulkCollection.find({
          bmcCollectorId: collector._id,
          timestamp: { $gte: todayRange.start, $lte: todayRange.end }
        }).sort({ timestamp: -1 });

        // Successful handovers must explicitly match SEGREGATED or MIXED
        const successfulCollections = collectionsToday.filter(
          c => c.outcome === 'SEGREGATED' || c.outcome === 'MIXED'
        );
        const totalWeightToday = successfulCollections.reduce((sum, c) => sum + (c.weight || 0), 0);
        const handoversLoggedToday = collectionsToday.length;
        // Manual entries without collectionPointId must NOT count as distinct assigned points
        const pointsCoveredToday = new Set(
          successfulCollections
            .map(c => (c.collectionPointId ? c.collectionPointId.toString() : null))
            .filter(Boolean)
        ).size;
        const lastCollectionAt = collectionsToday.length > 0 ? collectionsToday[0].timestamp : null;

        return {
          id: collector._id,
          name: collector.name,
          phone: collector.phone,
          collectorId: collector.collectorId,
          assignedPointsCount: assignedPoints.length,
          assignedPoints: assignedPoints.map(p => ({
            id: p._id,
            name: p.name,
            societyName: p.societyId?.name || null
          })),
          handoversLoggedToday,
          successfulHandoversToday: successfulCollections.length,
          totalWeightToday: Math.round(totalWeightToday * 100) / 100,
          pointsCoveredToday,
          lastCollectionAt
        };
      })
    );

    res.json({
      success: true,
      data: {
        wardId: officerWard,
        istBusinessDate: todayStr,
        internalCollectors: internalCollectorData,
        bmcCollectors: bmcCollectorData,
        summary: {
          totalInternalCollectors: internalCollectorData.length,
          activeInternalCollectorsToday: internalCollectorData.filter(c => c.inspectedToday > 0).length,
          totalBmcCollectors: bmcCollectorData.length,
          activeBmcCollectorsToday: bmcCollectorData.filter(c => c.handoversLoggedToday > 0).length
        }
      },
      message: 'Collector audit data fetched successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch collector audit: ' + error.message });
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

router.get('/users', auth, requireRole('officer'), async (req, res) => {
  try {
    const { role, search } = req.query;
    const filter = { wardId: req.user.wardId };
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(filter).select('-passwordHash').sort({ name: 1 });
    res.json({ success: true, data: users, message: 'Users fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
  }
});

router.get('/recent-violations', auth, requireRole('officer'), async (req, res) => {
  try {
    const wardCitizens = await User.find({ role: 'citizen', wardId: req.user.wardId }).select('_id');
    const wardCitizenIds = wardCitizens.map(u => u._id);

    const violations = await Violation.find({ citizenId: { $in: wardCitizenIds } })
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
