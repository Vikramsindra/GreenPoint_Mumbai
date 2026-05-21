const express = require('express');
const router = express.Router();
const Joi = require('joi');
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const BulkCollection = require('../models/BulkCollection');
const CollectionPoint = require('../models/CollectionPoint');
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

// Create/log a new collection
router.post('/', auth, validate(createCollectionSchema), async (req, res) => {
  try {
    const { collectionPointId, wasteType, weight, photoUrl, notes, location, manualPointName } = req.body;
    const bmcCollectorId = req.user.id;

    // Verify user is a BMC collector
    const user = await User.findById(bmcCollectorId);
    if (!user || user.role !== 'bmc_collector') {
      return res.status(403).json({ success: false, message: 'Only BMC collectors can log collections' });
    }

    let pointToLog = collectionPointId;

    // If manual entry, validate manual point name is provided
    if (!collectionPointId || collectionPointId === '') {
      if (!manualPointName) {
        return res.status(400).json({ success: false, message: 'Please provide collection point name' });
      }
      // For manual entries, we'll store the name in notes
    } else {
      // Verify collection point exists and is assigned to this collector
      const collectionPoint = await CollectionPoint.findById(collectionPointId);
      if (!collectionPoint) {
        return res.status(404).json({ success: false, message: 'Collection point not found' });
      }

      if (collectionPoint.assignedCollectorId && collectionPoint.assignedCollectorId.toString() !== bmcCollectorId) {
        return res.status(403).json({ success: false, message: 'This collection point is not assigned to you' });
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
      notes: manualPointName ? `[Manual: ${manualPointName}] ${notes}` : notes,
      location: location || null,
      timestamp: new Date()
    });

    await bulkCollection.save();

    // Update collection point's lastCollectionAt if it's not a manual entry
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
router.get('/', auth, async (req, res) => {
  try {
    const bmcCollectorId = req.user.id;
    const { filter = 'all' } = req.query; // 'all' or 'today'

    // Verify user is a BMC collector
    const user = await User.findById(bmcCollectorId);
    if (!user || user.role !== 'bmc_collector') {
      return res.status(403).json({ success: false, message: 'Only BMC collectors can view collections' });
    }

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
      pointsCovered: new Set(todayCollections.map(c => c.collectionPointId.toString())).size,
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
router.get('/points/assigned', auth, async (req, res) => {
  try {
    const bmcCollectorId = req.user.id;

    // Verify user is a BMC collector
    const user = await User.findById(bmcCollectorId);
    if (!user || user.role !== 'bmc_collector') {
      return res.status(403).json({ success: false, message: 'Only BMC collectors can view assigned points' });
    }

    const collectionPoints = await CollectionPoint.find({
      assignedCollectorId: bmcCollectorId,
      isActive: true
    });

    // Get today's collections for each point
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

// Get collection history with filters
router.get('/history', auth, async (req, res) => {
  try {
    const bmcCollectorId = req.user.id;
    const { startDate, endDate, wasteType } = req.query;

    // Verify user is a BMC collector
    const user = await User.findById(bmcCollectorId);
    if (!user || user.role !== 'bmc_collector') {
      return res.status(403).json({ success: false, message: 'Only BMC collectors can view history' });
    }

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

    // Group by date for better UX
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
