const express = require('express');
const router = express.Router();
const Joi = require('joi');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const BulkCollection = require('../models/BulkCollection');
const CollectionPoint = require('../models/CollectionPoint');
const Society = require('../models/Society');
const User = require('../models/User');

// Validation schemas
const createCollectionSchema = Joi.object({
  collectionPointId: Joi.string().allow(null, ''),
  wasteType: Joi.string().valid('wet', 'dry', 'mixed', 'bulk').required(),
  weight: Joi.number().min(0).required(),
  photoUrl: Joi.string().allow(''),
  notes: Joi.string().allow(''),
  manualPointName: Joi.string().allow(''),
  location: Joi.object({
    lat: Joi.number(),
    lng: Joi.number()
  }).allow(null)
});

// Create/log a new collection (BMC collector only)
router.post('/', auth, requireRole('bmc_collector'), validate(createCollectionSchema), async (req, res) => {
  try {
    const { collectionPointId, wasteType, weight, photoUrl, notes, location, manualPointName } = req.body;
    const bmcCollectorId = req.user.id;

    const user = await User.findById(bmcCollectorId);
    if (!user || user.role !== 'bmc_collector' || !user.isActive) {
      return res.status(403).json({ success: false, message: 'Only active BMC collectors can log collections' });
    }

    if (!collectionPointId || collectionPointId === '') {
      // Manual operational record
      if (!manualPointName) {
        return res.status(400).json({ success: false, message: 'Please provide collection point name for manual entry' });
      }
    } else {
      // Verify collection point exists, is active, is explicitly assigned to this BMC collector
      const collectionPoint = await CollectionPoint.findById(collectionPointId);
      if (!collectionPoint || !collectionPoint.isActive) {
        return res.status(404).json({ success: false, message: 'Active collection point not found' });
      }

      // Reject unassigned points or points assigned to another collector
      if (!collectionPoint.assignedCollectorId || collectionPoint.assignedCollectorId.toString() !== bmcCollectorId) {
        return res.status(403).json({ success: false, message: 'This collection point is not assigned to you' });
      }

      // Require matching ward
      if (collectionPoint.wardId !== user.wardId) {
        return res.status(403).json({ success: false, message: 'Collection point belongs to a different administrative ward' });
      }

      // If linked to a Society, require APPROVED society status
      if (collectionPoint.societyId) {
        const linkedSociety = await Society.findById(collectionPoint.societyId);
        if (!linkedSociety || linkedSociety.registrationStatus !== 'APPROVED') {
          return res.status(403).json({ success: false, message: 'Linked society is not active or approved' });
        }
      }
    }

    // Create the bulk collection record
    const bulkCollection = new BulkCollection({
      bmcCollectorId,
      collectionPointId: collectionPointId || null,
      wasteType,
      weight,
      photoUrl: photoUrl || null,
      wardId: user.wardId,
      notes: manualPointName ? `[Unverified Manual: ${manualPointName}] ${notes || ''}`.trim() : (notes || ''),
      location: location || null,
      timestamp: new Date()
    });

    await bulkCollection.save();

    // Update collection point's lastCollectionAt if not manual entry
    if (collectionPointId && collectionPointId !== '') {
      await CollectionPoint.findByIdAndUpdate(collectionPointId, {
        lastCollectionAt: new Date()
      });
    }

    res.status(201).json({
      success: true,
      data: bulkCollection,
      message: 'Collection logged successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to log collection: ' + error.message });
  }
});

// Get collections for BMC collector (today/all)
router.get('/', auth, requireRole('bmc_collector'), async (req, res) => {
  try {
    const bmcCollectorId = req.user.id;
    const { filter = 'all' } = req.query; // 'all' or 'today'

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
      .sort({ timestamp: -1 });

    // Calculate today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCollections = await BulkCollection.find({
      bmcCollectorId,
      timestamp: { $gte: today }
    });

    const todayStats = {
      totalWeight: todayCollections.reduce((sum, c) => sum + c.weight, 0),
      // Safe handling of null collectionPointId to prevent crash
      pointsCovered: new Set(todayCollections.map(c => c.collectionPointId ? c.collectionPointId.toString() : 'manual')).size,
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

// Get assigned collection points for BMC collector
router.get('/points/assigned', auth, requireRole('bmc_collector'), async (req, res) => {
  try {
    const bmcCollectorId = req.user.id;

    const collectionPoints = await CollectionPoint.find({
      assignedCollectorId: bmcCollectorId,
      isActive: true
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pointsWithStatus = await Promise.all(
      collectionPoints.map(async (point) => {
        const todayCollection = await BulkCollection.findOne({
          collectionPointId: point._id,
          bmcCollectorId,
          timestamp: { $gte: today }
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

// Get collection history with filters (BMC collector only)
router.get('/history', auth, requireRole('bmc_collector'), async (req, res) => {
  try {
    const bmcCollectorId = req.user.id;
    const { startDate, endDate, wasteType } = req.query;

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

    const collections = await BulkCollection.find(query)
      .populate('collectionPointId', 'name type address')
      .sort({ timestamp: -1 });

    const groupedByDate = {};
    collections.forEach(collection => {
      const date = new Date(collection.timestamp).toDateString();
      if (!groupedByDate[date]) groupedByDate[date] = [];
      groupedByDate[date].push(collection);
    });

    res.json({
      success: true,
      data: {
        grouped: groupedByDate,
        total: collections.length,
        totalWeight: collections.reduce((sum, c) => sum + c.weight, 0)
      },
      message: 'History retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch history: ' + error.message });
  }
});

module.exports = router;
