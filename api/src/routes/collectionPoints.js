const express = require('express');
const router = express.Router();
const Joi = require('joi');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const CollectionPoint = require('../models/CollectionPoint');
const User = require('../models/User');

// Validation schemas
const createPointSchema = Joi.object({
  name: Joi.string().min(2).required(),
  type: Joi.string().valid('society', 'public_bin', 'transfer_station').required(),
  location: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required()
  }).required(),
  address: Joi.string().required(),
  wardId: Joi.string().required(),
  contactPerson: Joi.string().allow(''),
  contactPhone: Joi.string().allow('')
});

// Create a new collection point (officer only)
router.post('/', auth, requireRole('officer'), validate(createPointSchema), async (req, res) => {
  try {
    const { name, type, location, address, wardId, contactPerson, contactPhone } = req.body;

    const collectionPoint = new CollectionPoint({
      name,
      type,
      location,
      address,
      wardId,
      contactPerson,
      contactPhone
    });

    await collectionPoint.save();

    res.status(201).json({
      success: true,
      data: collectionPoint,
      message: 'Collection point created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create collection point: ' + error.message });
  }
});

// Get all collection points for a ward (officer/bmc_collector)
router.get('/ward/:wardId', auth, async (req, res) => {
  try {
    const { wardId } = req.params;
    const user = await User.findById(req.user.id);

    // BMC collectors can only see their assigned points
    if (user.role === 'bmc_collector') {
      const points = await CollectionPoint.find({
        assignedCollectorId: user._id,
        isActive: true
      });
      return res.json({
        success: true,
        data: points,
        message: 'Collection points retrieved'
      });
    }

    // Officers can see all points in their ward
    if (user.role === 'officer') {
      const points = await CollectionPoint.find({
        wardId,
        isActive: true
      }).populate('assignedCollectorId', 'name collectorId');

      return res.json({
        success: true,
        data: points,
        message: 'Collection points retrieved'
      });
    }

    res.status(403).json({ success: false, message: 'Unauthorized' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch collection points: ' + error.message });
  }
});

// Assign collection point to BMC collector (officer only)
router.put('/:pointId/assign', auth, requireRole('officer'), async (req, res) => {
  try {
    const { pointId } = req.params;
    const { bmcCollectorId } = req.body;

    // Verify BMC collector exists and has correct role
    const collector = await User.findById(bmcCollectorId);
    if (!collector || collector.role !== 'bmc_collector') {
      return res.status(404).json({ success: false, message: 'BMC Collector not found' });
    }

    const collectionPoint = await CollectionPoint.findByIdAndUpdate(
      pointId,
      { assignedCollectorId: bmcCollectorId },
      { new: true }
    );

    if (!collectionPoint) {
      return res.status(404).json({ success: false, message: 'Collection point not found' });
    }

    res.json({
      success: true,
      data: collectionPoint,
      message: 'Collection point assigned successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign collection point: ' + error.message });
  }
});

// Update collection point (officer only)
router.put('/:pointId', auth, requireRole('officer'), async (req, res) => {
  try {
    const { pointId } = req.params;
    const updates = req.body;

    // Don't allow direct role changes via this endpoint
    delete updates._id;

    const collectionPoint = await CollectionPoint.findByIdAndUpdate(
      pointId,
      updates,
      { new: true, runValidators: true }
    );

    if (!collectionPoint) {
      return res.status(404).json({ success: false, message: 'Collection point not found' });
    }

    res.json({
      success: true,
      data: collectionPoint,
      message: 'Collection point updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update collection point: ' + error.message });
  }
});

// Get collection point by ID
router.get('/:pointId', auth, async (req, res) => {
  try {
    const { pointId } = req.params;

    const collectionPoint = await CollectionPoint.findById(pointId)
      .populate('assignedCollectorId', 'name phone collectorId');

    if (!collectionPoint) {
      return res.status(404).json({ success: false, message: 'Collection point not found' });
    }

    res.json({
      success: true,
      data: collectionPoint,
      message: 'Collection point retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch collection point: ' + error.message });
  }
});

module.exports = router;
