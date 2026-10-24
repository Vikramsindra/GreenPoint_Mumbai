// filepath: api/src/routes/bmcCollections.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const BulkCollection = require('../models/BulkCollection');
const CollectionPoint = require('../models/CollectionPoint');
const Society = require('../models/Society');
const SocietyPointEvent = require('../models/SocietyPointEvent');
const User = require('../models/User');
const { getIstBusinessDate } = require('../utils/dateHelper');

// -------------------------------------------------------------
// Validation Schemas
// -------------------------------------------------------------
const resolveQrSchema = Joi.object({
  qrCode: Joi.string().trim().required()
});

const createCollectionSchema = Joi.object({
  collectionPointId: Joi.string().allow(null, '').optional(),
  societyId: Joi.string().allow(null, '').optional(),
  outcome: Joi.string().valid('SEGREGATED', 'MIXED', 'NO_HANDOVER').default('SEGREGATED'),
  wasteType: Joi.string().valid('wet', 'dry', 'mixed', 'bulk').when('outcome', {
    is: 'NO_HANDOVER',
    then: Joi.string().allow(null, '').optional(),
    otherwise: Joi.string().required()
  }),
  weight: Joi.number().min(0).when('outcome', {
    is: 'NO_HANDOVER',
    then: Joi.number().min(0).allow(null).default(0),
    otherwise: Joi.number().greater(0).required()
  }),
  weightBasis: Joi.string().valid('ESTIMATED', 'MEASURED').default('ESTIMATED'),
  notes: Joi.when('outcome', {
    is: 'NO_HANDOVER',
    then: Joi.string().trim().min(3).required().messages({
      'any.required': 'An explanatory note is required when recording NO_HANDOVER (at least 3 characters)',
      'string.empty': 'An explanatory note is required when recording NO_HANDOVER (at least 3 characters)'
    }),
    otherwise: Joi.string().allow('').default('')
  }),
  photoUrl: Joi.string().allow('', null).optional(),
  manualPointName: Joi.string().allow('').optional(),
  requestId: Joi.string().trim().allow(null, '').optional(),
  location: Joi.object({
    lat: Joi.number().allow(null),
    lng: Joi.number().allow(null)
  }).allow(null).optional(),
  deviceLocation: Joi.object({
    lat: Joi.number().allow(null),
    lng: Joi.number().allow(null),
    isAvailable: Joi.boolean().default(false)
  }).allow(null).optional()
});

// -------------------------------------------------------------
// POST /api/bmc-collections/resolve-society-qr
// Resolve and verify scanned GP-SOC-... identifier
// -------------------------------------------------------------
router.post('/resolve-society-qr', auth, requireRole('bmc_collector'), validate(resolveQrSchema), async (req, res) => {
  try {
    const { qrCode } = req.body;
    const cleanQr = qrCode.trim();
    const bmcCollectorId = req.user.id;

    // Check user is active BMC collector
    const collector = await User.findById(bmcCollectorId);
    if (!collector || collector.role !== 'bmc_collector' || !collector.isActive) {
      return res.status(403).json({ success: false, message: 'Only active BMC collectors can verify society QR codes' });
    }

    // Reject household QR codes with explicit guidance
    if (cleanQr.startsWith('GP-HH-')) {
      return res.status(400).json({
        success: false,
        message: 'Scan the society collection QR. Individual household QR codes cannot be collected by municipal bulk collectors.'
      });
    }

    if (!cleanQr.startsWith('GP-SOC-')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format. Please scan a valid GreenPoint society collection QR.'
      });
    }

    // Find society by QR code
    const society = await Society.findOne({ qrCode: cleanQr });
    if (!society || society.registrationStatus !== 'APPROVED') {
      return res.status(404).json({
        success: false,
        message: 'Society not found or not approved for municipal collection.'
      });
    }

    // Verify linked collection point
    let collectionPoint = null;
    if (society.collectionPointId) {
      collectionPoint = await CollectionPoint.findById(society.collectionPointId);
    }
    if (!collectionPoint) {
      collectionPoint = await CollectionPoint.findOne({ societyId: society._id });
    }

    if (!collectionPoint || !collectionPoint.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Active municipal collection point not found for this society.'
      });
    }

    // Verify links agree
    if (collectionPoint.societyId && collectionPoint.societyId.toString() !== society._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Society and collection point identity links disagree.'
      });
    }

    // Verify point is explicitly assigned to this BMC collector
    if (!collectionPoint.assignedCollectorId || collectionPoint.assignedCollectorId.toString() !== bmcCollectorId) {
      return res.status(403).json({
        success: false,
        message: 'This society collection point is not assigned to you.'
      });
    }

    // Verify ward agreement
    if (society.wardId !== collector.wardId || collectionPoint.wardId !== collector.wardId) {
      return res.status(403).json({
        success: false,
        message: `Society belongs to Ward ${society.wardId}, which differs from your assigned Ward ${collector.wardId}.`
      });
    }

    // Check if society has already received its segregation award today in IST
    const istToday = getIstBusinessDate(new Date());
    const existingAward = await SocietyPointEvent.findOne({
      societyId: society._id,
      istBusinessDate: istToday,
      pointsAwarded: { $gt: 0 }
    });

    res.json({
      success: true,
      data: {
        societyId: society._id,
        societyName: society.name,
        address: society.address,
        wardId: society.wardId,
        collectionPointId: collectionPoint._id,
        pointsBalance: society.pointsBalance || 0,
        alreadyAwardedToday: !!existingAward,
        lastCollectionAt: collectionPoint.lastCollectionAt
      },
      message: 'Society collection QR verified successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify society QR: ' + error.message });
  }
});

// -------------------------------------------------------------
// POST /api/bmc-collections
// Create/log a structured handover
// -------------------------------------------------------------
router.post('/', auth, requireRole('bmc_collector'), validate(createCollectionSchema), async (req, res) => {
  try {
    const {
      collectionPointId,
      outcome = 'SEGREGATED',
      wasteType,
      weight = 0,
      weightBasis = 'ESTIMATED',
      photoUrl,
      notes,
      location,
      deviceLocation,
      manualPointName,
      requestId
    } = req.body;
    const bmcCollectorId = req.user.id;

    const user = await User.findById(bmcCollectorId);
    if (!user || user.role !== 'bmc_collector' || !user.isActive) {
      return res.status(403).json({ success: false, message: 'Only active BMC collectors can log collections' });
    }

    // Prevent contradictory inputs: SEGREGATED outcome with mixed wasteType
    if (outcome === 'SEGREGATED' && wasteType === 'mixed') {
      return res.status(400).json({
        success: false,
        message: 'Contradictory handover: Outcome cannot be SEGREGATED when waste type is mixed.'
      });
    }

    // Idempotency: Double taps and retries of the same request return existing result
    if (requestId) {
      const existing = await BulkCollection.findOne({ requestId })
        .populate('collectionPointId', 'name type address')
        .populate('societyId', 'name pointsBalance');

      if (existing) {
        return res.status(200).json({
          success: true,
          data: existing,
          pointsAwarded: existing.pointsAwarded || 0,
          pointsReason: existing.pointsReason || '',
          message: 'Handover record already saved (idempotent submission)',
          isDuplicate: true
        });
      }
    }

    let linkedSociety = null;
    let point = null;

    if (!collectionPointId || collectionPointId === '') {
      // Manual operational record
      if (!manualPointName) {
        return res.status(400).json({ success: false, message: 'Please provide collection point name for manual entry' });
      }
    } else {
      // Verify collection point exists, is active, is explicitly assigned to this BMC collector
      point = await CollectionPoint.findById(collectionPointId);
      if (!point || !point.isActive) {
        return res.status(404).json({ success: false, message: 'Active collection point not found' });
      }

      // Reject unassigned points or points assigned to another collector
      if (!point.assignedCollectorId || point.assignedCollectorId.toString() !== bmcCollectorId) {
        return res.status(403).json({ success: false, message: 'This collection point is not assigned to you' });
      }

      // Require matching ward
      if (point.wardId !== user.wardId) {
        return res.status(403).json({ success: false, message: 'Collection point belongs to a different administrative ward' });
      }

      // If linked to a Society, require APPROVED society status
      if (point.societyId) {
        linkedSociety = await Society.findById(point.societyId);
        if (!linkedSociety || linkedSociety.registrationStatus !== 'APPROVED') {
          return res.status(403).json({ success: false, message: 'Linked society is not active or approved' });
        }
      }
    }

    // Calculate points and reward reason
    let pointsAwarded = 0;
    let pointsReason = '';
    const istBusinessDate = getIstBusinessDate(new Date());

    if (!linkedSociety) {
      // Manual operational entry or unlinked point
      pointsAwarded = 0;
      pointsReason = 'Manual operational entry — no society reward';
    } else if (outcome === 'NO_HANDOVER') {
      pointsAwarded = 0;
      pointsReason = 'No handover recorded: 0 points awarded';
    } else if (outcome === 'MIXED') {
      pointsAwarded = 0;
      pointsReason = 'Mixed handover: no points awarded';
    } else if (outcome === 'SEGREGATED') {
      // Check if this society has already earned its daily segregation reward today in IST
      const existingAward = await SocietyPointEvent.findOne({
        societyId: linkedSociety._id,
        istBusinessDate,
        pointsAwarded: { $gt: 0 }
      });

      if (existingAward) {
        pointsAwarded = 0;
        pointsReason = 'Daily society reward already awarded';
      } else {
        // Award configurable fixed 10 points
        pointsAwarded = 10;
        pointsReason = '10 society points awarded';
      }
    }

    // Prepare BulkCollection document
    const finalWeight = outcome === 'NO_HANDOVER' ? 0 : parseFloat(weight);
    const finalWasteType = outcome === 'NO_HANDOVER' ? (wasteType || 'mixed') : wasteType;

    const bulkCollection = new BulkCollection({
      bmcCollectorId,
      collectionPointId: point ? point._id : null,
      societyId: linkedSociety ? linkedSociety._id : null,
      outcome,
      wasteType: finalWasteType,
      weight: finalWeight,
      weightBasis: outcome === 'NO_HANDOVER' ? 'ESTIMATED' : weightBasis,
      pointsAwarded,
      pointsReason,
      requestId: requestId || null,
      photoUrl: photoUrl || null,
      wardId: user.wardId,
      notes: manualPointName ? `[Unverified Manual: ${manualPointName}] ${notes || ''}`.trim() : (notes || ''),
      location: location || null,
      deviceLocation: deviceLocation || { lat: null, lng: null, isAvailable: false },
      timestamp: new Date()
    });

    await bulkCollection.save();

    // If actual handover was performed for an assigned point, update lastCollectionAt
    if (point && outcome !== 'NO_HANDOVER') {
      await CollectionPoint.findByIdAndUpdate(point._id, {
        lastCollectionAt: new Date()
      });
    }

    // If points are awarded to society, update Society wallet and create SocietyPointEvent ledger
    if (pointsAwarded > 0 && linkedSociety) {
      try {
        const pointEvent = new SocietyPointEvent({
          societyId: linkedSociety._id,
          collectionId: bulkCollection._id,
          pointsAwarded,
          reason: pointsReason,
          collectorId: bmcCollectorId,
          istBusinessDate
        });
        await pointEvent.save();

        await Society.findByIdAndUpdate(linkedSociety._id, {
          $inc: { pointsBalance: pointsAwarded }
        });
      } catch (eventErr) {
        // Handle concurrent duplicate submission race condition
        if (eventErr.code === 11000) {
          // Another concurrent request just claimed the daily reward
          bulkCollection.pointsAwarded = 0;
          bulkCollection.pointsReason = 'Daily society reward already awarded';
          await bulkCollection.save();
          pointsAwarded = 0;
          pointsReason = 'Daily society reward already awarded';
        } else {
          console.error('Failed to create society point event:', eventErr);
        }
      }
    }

    res.status(201).json({
      success: true,
      data: bulkCollection,
      pointsAwarded,
      pointsReason,
      message: 'Handover recorded successfully'
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.requestId) {
      // Duplicate requestId submitted concurrently
      const existing = await BulkCollection.findOne({ requestId: req.body.requestId });
      if (existing) {
        return res.status(200).json({
          success: true,
          data: existing,
          pointsAwarded: existing.pointsAwarded || 0,
          pointsReason: existing.pointsReason || '',
          message: 'Handover record already saved (idempotent submission)',
          isDuplicate: true
        });
      }
    }
    res.status(500).json({ success: false, message: 'Failed to log collection: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/bmc-collections
// Get collections for BMC collector (today/all)
// -------------------------------------------------------------
router.get('/', auth, requireRole('bmc_collector'), async (req, res) => {
  try {
    const bmcCollectorId = req.user.id;
    const { filter = 'all' } = req.query;

    let query = { bmcCollectorId };

    if (filter === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query.timestamp = { $gte: startOfDay, $lte: endOfDay };
    }

    const collections = await BulkCollection.find(query)
      .populate('collectionPointId', 'name type address')
      .populate('societyId', 'name pointsBalance')
      .sort({ timestamp: -1 });

    // Calculate today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCollections = await BulkCollection.find({
      bmcCollectorId,
      timestamp: { $gte: today }
    });

    // Exclude NO_HANDOVER from weight
    const validTodayCollections = todayCollections.filter(c => c.outcome !== 'NO_HANDOVER');

    const todayStats = {
      totalWeight: validTodayCollections.reduce((sum, c) => sum + (c.weight || 0), 0),
      pointsCovered: new Set(
        validTodayCollections
          .map(c => (c.collectionPointId ? c.collectionPointId.toString() : 'manual'))
      ).size,
      collectionsLogged: todayCollections.length
    };

    res.json({
      success: true,
      data: {
        collections,
        todayStats
      },
      message: 'Collections retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch collections: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/bmc-collections/points/assigned
// Get assigned collection points for BMC collector with completion status
// -------------------------------------------------------------
router.get('/points/assigned', auth, requireRole('bmc_collector'), async (req, res) => {
  try {
    const bmcCollectorId = req.user.id;

    const collectionPoints = await CollectionPoint.find({
      assignedCollectorId: bmcCollectorId,
      isActive: true
    }).populate('societyId', 'name pointsBalance qrCode address joinCode');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pointsWithStatus = await Promise.all(
      collectionPoints.map(async (point) => {
        // Only count actual completed handovers, NO_HANDOVER does NOT mark complete
        const todayCollection = await BulkCollection.findOne({
          collectionPointId: point._id,
          bmcCollectorId,
          timestamp: { $gte: today },
          outcome: { $ne: 'NO_HANDOVER' }
        });

        return {
          ...point.toObject(),
          status: todayCollection ? 'completed' : 'pending'
        };
      })
    );

    res.json({
      success: true,
      data: pointsWithStatus,
      message: 'Assigned collection points retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch collection points: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/bmc-collections/history
// Get collection history with filters
// -------------------------------------------------------------
router.get('/history', auth, requireRole('bmc_collector'), async (req, res) => {
  try {
    const bmcCollectorId = req.user.id;
    const { startDate, endDate, wasteType, outcome } = req.query;

    let query = { bmcCollectorId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    if (wasteType) {
      query.wasteType = wasteType;
    }

    if (outcome) {
      query.outcome = outcome;
    }

    const collections = await BulkCollection.find(query)
      .populate('collectionPointId', 'name type address')
      .populate('societyId', 'name pointsBalance')
      .sort({ timestamp: -1 });

    const groupedByDate = {};
    collections.forEach(collection => {
      const date = new Date(collection.timestamp).toDateString();
      if (!groupedByDate[date]) groupedByDate[date] = [];
      groupedByDate[date].push(collection);
    });

    const validCollections = collections.filter(c => c.outcome !== 'NO_HANDOVER');

    res.json({
      success: true,
      data: {
        grouped: groupedByDate,
        total: collections.length,
        totalWeight: validCollections.reduce((sum, c) => sum + (c.weight || 0), 0)
      },
      message: 'History retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch history: ' + error.message });
  }
});

module.exports = router;
