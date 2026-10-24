// filepath: api/src/routes/collectionPoints.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const CollectionPoint = require('../models/CollectionPoint');
const Society = require('../models/Society');
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
  contactPerson: Joi.string().allow(''),
  contactPhone: Joi.string().allow(''),
  wardId: Joi.string().optional()
});

const updatePointSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  type: Joi.string().valid('society', 'public_bin', 'transfer_station').optional(),
  location: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required()
  }).optional(),
  address: Joi.string().optional(),
  contactPerson: Joi.string().allow('').optional(),
  contactPhone: Joi.string().allow('').optional(),
  isActive: Joi.boolean().optional(),
  societyId: Joi.forbidden().messages({ 'any.unknown': 'societyId cannot be modified via generic update' }),
  wardId: Joi.forbidden().messages({ 'any.unknown': 'wardId cannot be modified via generic update' }),
  ward: Joi.forbidden().messages({ 'any.unknown': 'ward cannot be modified via generic update' }),
  assignedCollectorId: Joi.forbidden().messages({ 'any.unknown': 'assignedCollectorId must be changed via dedicated assign endpoint' }),
  internalCollectorId: Joi.forbidden().messages({ 'any.unknown': 'internalCollectorId cannot be modified via collection point routes' })
});

// Create a new collection point (officer only, strictly in their own ward)
router.post('/', auth, requireRole('officer'), validate(createPointSchema), async (req, res) => {
  try {
    const { name, type, location, address, contactPerson, contactPhone } = req.body;

    const collectionPoint = new CollectionPoint({
      name,
      type,
      location,
      address,
      wardId: req.user.wardId, // Force officer's administrative ward
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

// Get collection points for a ward
// - Officers can see points strictly in their own ward
// - BMC collectors can see only their assigned active points
// - Citizens/Representatives denied
router.get('/ward/:wardId', auth, async (req, res) => {
  try {
    const { wardId } = req.params;

    // BMC collectors can only see their assigned points
    if (req.user.role === 'bmc_collector') {
      const points = await CollectionPoint.find({
        assignedCollectorId: req.user.id,
        isActive: true
      });
      return res.json({
        success: true,
        data: points,
        message: 'Assigned collection points retrieved'
      });
    }

    // Officers can see all points strictly within their own ward
    if (req.user.role === 'officer') {
      if (wardId !== req.user.wardId) {
        return res.status(403).json({ success: false, message: 'Not authorized: cannot inspect collection points of another ward' });
      }

      const points = await CollectionPoint.find({
        wardId: req.user.wardId,
        isActive: true
      }).populate('assignedCollectorId', 'name phone collectorId');

      return res.json({
        success: true,
        data: points,
        message: 'Collection points retrieved'
      });
    }

    res.status(403).json({ success: false, message: 'Unauthorized role for collection points view' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch collection points: ' + error.message });
  }
});

// Assign collection point to BMC collector (officer only, within same ward)
router.put('/:pointId/assign', auth, requireRole('officer'), async (req, res) => {
  try {
    const { pointId } = req.params;
    const { bmcCollectorId } = req.body;

    const collectionPoint = await CollectionPoint.findById(pointId);
    if (!collectionPoint) {
      return res.status(404).json({ success: false, message: 'Collection point not found' });
    }

    if (collectionPoint.wardId !== req.user.wardId) {
      return res.status(403).json({ success: false, message: 'Not authorized: collection point is in a different administrative ward' });
    }

    // Verify BMC collector exists, has role 'bmc_collector', is active, and is in the same ward
    const collector = await User.findById(bmcCollectorId);
    if (!collector || collector.role !== 'bmc_collector' || !collector.isActive) {
      return res.status(400).json({ success: false, message: 'Valid, active BMC collector required' });
    }

    if (collector.wardId !== req.user.wardId) {
      return res.status(400).json({ success: false, message: 'BMC collector belongs to a different administrative ward' });
    }

    collectionPoint.assignedCollectorId = bmcCollectorId;
    await collectionPoint.save();

    res.json({
      success: true,
      data: collectionPoint,
      message: 'Collection point assigned successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign collection point: ' + error.message });
  }
});

// Update collection point (officer only, strictly within their ward and using allowlist)
router.put('/:pointId', auth, requireRole('officer'), validate(updatePointSchema), async (req, res) => {
  try {
    const { pointId } = req.params;
    const updates = req.body;

    const collectionPoint = await CollectionPoint.findById(pointId);
    if (!collectionPoint) {
      return res.status(404).json({ success: false, message: 'Collection point not found' });
    }

    if (collectionPoint.wardId !== req.user.wardId) {
      return res.status(403).json({ success: false, message: 'Not authorized: collection point is in a different administrative ward' });
    }

    // Apply allowed updates
    const allowedKeys = ['name', 'type', 'location', 'address', 'contactPerson', 'contactPhone', 'isActive'];
    allowedKeys.forEach(k => {
      if (updates[k] !== undefined) collectionPoint[k] = updates[k];
    });

    await collectionPoint.save();

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

    // Role boundary checks
    if (req.user.role === 'officer') {
      if (collectionPoint.wardId !== req.user.wardId) {
        return res.status(403).json({ success: false, message: 'Not authorized: collection point is in another ward' });
      }
    } else if (req.user.role === 'bmc_collector') {
      if (!collectionPoint.assignedCollectorId || collectionPoint.assignedCollectorId._id.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized: this collection point is not assigned to you' });
      }
    } else if (req.user.role === 'society_representative') {
      // Allow only if linked to this representative's own society
      const repSociety = await Society.findOne({ representativeId: req.user.id });
      if (!repSociety || !collectionPoint.societyId || collectionPoint.societyId.toString() !== repSociety._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view other society collection points' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized access to collection point details' });
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
