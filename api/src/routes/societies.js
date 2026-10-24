// filepath: api/src/routes/societies.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Joi = require('joi');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const Society = require('../models/Society');
const CollectionPoint = require('../models/CollectionPoint');
const User = require('../models/User');
const { isValidWard, VALID_WARDS } = require('../constants/wards');
const {
  generateSocietyQRCodeString,
  generateQRCodeImage,
  generateQRCodeBuffer
} = require('../utils/qrGenerator');

// -------------------------------------------------------------
// Helper: Check if string is a valid MongoDB ObjectId
// -------------------------------------------------------------
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id;
}

// -------------------------------------------------------------
// POST /api/societies - Representative submits application
// -------------------------------------------------------------
const createSocietySchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  address: Joi.string().trim().min(5).max(300).required(),
  wardId: Joi.string().trim().required().custom((value, helpers) => {
    if (!isValidWard(value)) {
      return helpers.message(`Ward '${value}' is invalid. Supported wards include: ${VALID_WARDS.slice(0, 10).join(', ')}...`);
    }
    return value.toUpperCase();
  }),
  registrationNumber: Joi.string().trim().max(50).allow('', null).default(''),
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }).optional()
});

router.post('/', auth, requireRole('society_representative'), validate(createSocietySchema), async (req, res) => {
  try {
    const representativeId = req.user.id;
    const { name, address, wardId, registrationNumber, location } = req.body;

    // Check if representative already has an existing society application
    const existing = await Society.findOne({ representativeId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A society application has already been submitted for this representative account'
      });
    }

    const societyData = {
      name,
      address,
      wardId,
      representativeId,
      registrationStatus: 'PENDING',
      registrationNumber: registrationNumber || '',
      submittedAt: new Date()
    };

    if (location && location.lat != null && location.lng != null) {
      societyData.location = location;
    }

    const society = new Society(societyData);
    await society.save();

    res.status(201).json({
      success: true,
      data: society,
      message: 'Society application submitted successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A society application has already been submitted for this representative account'
      });
    }
    res.status(500).json({ success: false, message: 'Failed to submit society application: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/societies/my - Representative fetches their society
// -------------------------------------------------------------
router.get('/my', auth, requireRole('society_representative'), async (req, res) => {
  try {
    const society = await Society.findOne({ representativeId: req.user.id })
      .populate('collectionPointId', 'name type address wardId location isActive')
      .populate('reviewedBy', 'name phone email');

    if (!society) {
      return res.status(404).json({
        success: false,
        message: 'No society application found for this representative'
      });
    }

    res.json({
      success: true,
      data: society,
      message: 'Society retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch society: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/societies - Officer lists societies in their ward
// -------------------------------------------------------------
router.get('/', auth, requireRole('officer'), async (req, res) => {
  try {
    // Strictly enforce the authenticated officer's ward boundary.
    // Client-supplied ward queries or parameters are ignored.
    const officerWard = req.user.wardId;
    if (!officerWard) {
      return res.status(403).json({ success: false, message: 'Officer profile is missing ward assignment' });
    }

    const { status } = req.query;
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100; // bounded pagination

    const filter = { wardId: officerWard };
    if (status) {
      const normalizedStatus = status.toString().trim().toUpperCase();
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status filter. Allowed: PENDING, APPROVED, REJECTED'
        });
      }
      filter.registrationStatus = normalizedStatus;
    }

    const total = await Society.countDocuments(filter);
    const societies = await Society.find(filter)
      .populate('representativeId', 'name phone email')
      .populate('reviewedBy', 'name')
      .populate('collectionPointId', 'name type address location isActive')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: societies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      },
      message: 'Societies retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch societies: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/societies/:id - Details view
// -------------------------------------------------------------
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid society ID format' });
    }

    const society = await Society.findById(id)
      .populate('representativeId', 'name phone email')
      .populate('reviewedBy', 'name phone email')
      .populate('collectionPointId', 'name type address wardId location isActive');

    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    // Role-based access control:
    // Society Representative can only view their own society.
    // Officer can only view societies in their own ward.
    if (req.user.role === 'society_representative') {
      const repId = society.representativeId?._id ? society.representativeId._id.toString() : society.representativeId?.toString();
      if (repId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only view your own society.' });
      }
    } else if (req.user.role === 'officer') {
      if (society.wardId.toUpperCase() !== req.user.wardId.toUpperCase()) {
        return res.status(403).json({ success: false, message: 'Access denied. Officer can only view societies in their assigned ward.' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({
      success: true,
      data: society,
      message: 'Society details retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch society: ' + error.message });
  }
});

// -------------------------------------------------------------
// PATCH /api/societies/:id/review - Officer reviews application
// -------------------------------------------------------------
const reviewSchema = Joi.object({
  decision: Joi.string().valid('APPROVED', 'REJECTED').required(),
  reviewNote: Joi.string().trim().max(500).allow('', null).when('decision', {
    is: 'REJECTED',
    then: Joi.string().trim().min(5).max(500).required().messages({
      'any.required': 'A meaningful rejection reason is required (at least 5 characters)',
      'string.empty': 'A meaningful rejection reason is required (at least 5 characters)',
      'string.min': 'A meaningful rejection reason must be at least 5 characters'
    }),
    otherwise: Joi.string().trim().max(500).allow('', null).default('')
  }),
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }).optional()
});

router.patch('/:id/review', auth, requireRole('officer'), validate(reviewSchema), async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid society ID format' });
  }

  const { decision, reviewNote = '', location } = req.body;

  try {
    const society = await Society.findById(id);
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society application not found' });
    }

    // Enforce officer's assigned ward boundary
    if (society.wardId.toUpperCase() !== req.user.wardId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only review societies in your assigned ward (${req.user.wardId})`
      });
    }

    // Verify application is currently pending
    if (society.registrationStatus !== 'PENDING') {
      return res.status(409).json({
        success: false,
        message: `Application has already been reviewed with decision: ${society.registrationStatus}`
      });
    }

    // Process Rejection
    if (decision === 'REJECTED') {
      const updated = await Society.findOneAndUpdate(
        { _id: id, registrationStatus: 'PENDING' },
        {
          $set: {
            registrationStatus: 'REJECTED',
            reviewedBy: req.user.id,
            reviewedAt: new Date(),
            reviewNote: reviewNote || 'Application rejected by ward officer'
          }
        },
        { new: true }
      ).populate('representativeId', 'name phone email').populate('reviewedBy', 'name');

      if (!updated) {
        return res.status(409).json({
          success: false,
          message: 'Conflicting review: Application is no longer in PENDING status'
        });
      }

      return res.json({
        success: true,
        data: updated,
        message: 'Society application rejected with recorded decision'
      });
    }

    // Process Approval
    // Try using a mongoose transaction if supported by MongoDB topology (Atlas replica set)
    let session = null;
    let isTransactionActive = false;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      isTransactionActive = true;
    } catch (sessionErr) {
      // Standalone single-instance Mongo fallback
      session = null;
      isTransactionActive = false;
    }

    try {
      // Re-verify atomically with query condition
      const current = await Society.findOne(
        { _id: id, registrationStatus: 'PENDING' },
        null,
        session ? { session } : {}
      );

      if (!current) {
        if (isTransactionActive) await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: 'Conflicting review: Application is no longer in PENDING status'
        });
      }

      // Check if representative exists to record contact info
      const representative = await User.findById(current.representativeId);

      // Determine valid location: officer-provided location takes precedence, then society registration location
      let pointLocation = undefined;
      if (location && location.lat != null && location.lng != null) {
        pointLocation = location;
      } else if (current.location && current.location.lat != null && current.location.lng != null) {
        pointLocation = current.location;
      }

      // Check if a linked collection point already exists for this society
      let collectionPoint = await CollectionPoint.findOne(
        { societyId: current._id },
        null,
        session ? { session } : {}
      );

      if (!collectionPoint) {
        // Create exactly one CollectionPoint of type 'society'
        const pointData = {
          name: current.name,
          type: 'society',
          wardId: current.wardId,
          address: current.address,
          societyId: current._id,
          contactPerson: representative ? representative.name : '',
          contactPhone: representative ? representative.phone : '',
          isActive: true
        };

        if (pointLocation) {
          pointData.location = pointLocation;
        }

        const newPoint = new CollectionPoint(pointData);
        collectionPoint = session ? await newPoint.save({ session }) : await newPoint.save();
      }

      // Generate stable opaque society QR code distinct from household format
      const qrCode = generateSocietyQRCodeString();

      // Conditionally update society status to APPROVED
      const updatedSociety = await Society.findOneAndUpdate(
        { _id: id, registrationStatus: 'PENDING' },
        {
          $set: {
            registrationStatus: 'APPROVED',
            collectionPointId: collectionPoint._id,
            qrCode,
            reviewedBy: req.user.id,
            reviewedAt: new Date(),
            reviewNote: reviewNote || '',
            ...(pointLocation ? { location: pointLocation } : {})
          }
        },
        { new: true, ...(session ? { session } : {}) }
      ).populate('representativeId', 'name phone email').populate('reviewedBy', 'name');

      if (!updatedSociety) {
        if (isTransactionActive) await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: 'Conflicting review: Application is no longer in PENDING status'
        });
      }

      if (isTransactionActive) {
        await session.commitTransaction();
      }

      return res.json({
        success: true,
        data: {
          society: updatedSociety,
          collectionPoint
        },
        message: 'Society application approved successfully with collection point and QR identity generated'
      });
    } catch (approvalErr) {
      if (isTransactionActive) {
        await session.abortTransaction();
      }
      throw approvalErr;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Review processing failed: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/societies/:id/qr-image - Approved Society QR Image
// -------------------------------------------------------------
router.get('/:id/qr-image', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid society ID format' });
    }

    const society = await Society.findById(id);
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    // Role-based access:
    // Only owning representative or same-ward officer
    if (req.user.role === 'society_representative') {
      if (society.representativeId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (req.user.role === 'officer') {
      if (society.wardId.toUpperCase() !== req.user.wardId.toUpperCase()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Only approved societies have an active QR code
    if (society.registrationStatus !== 'APPROVED' || !society.qrCode) {
      return res.status(403).json({
        success: false,
        message: 'QR code identity is only available for approved societies'
      });
    }

    // If data URL JSON requested
    if (req.query.format === 'dataUrl' || req.query.format === 'json') {
      const dataUrl = await generateQRCodeImage(society.qrCode);
      return res.json({
        success: true,
        qrCode: society.qrCode,
        qrImageUrl: dataUrl
      });
    }

    // Default: Return raw PNG image buffer
    const buffer = await generateQRCodeBuffer(society.qrCode);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="society-${society._id}-qr.png"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate QR image: ' + error.message });
  }
});

module.exports = router;
