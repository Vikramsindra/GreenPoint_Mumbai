// filepath: api/src/routes/violations.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const User = require('../models/User');
const Violation = require('../models/Violation');
const Society = require('../models/Society');
const SocietyMembership = require('../models/SocietyMembership');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const penaltyEngine = require('../services/penaltyEngine');
const pointsEngine = require('../services/pointsEngine');
const { validate } = require('../middleware/validate');

const logSchema = Joi.object({
  citizenId: Joi.string().required(),
  type: Joi.string().valid('NON_SEGREGATION', 'LITTERING', 'BURNING', 'BULK_VIOLATION').required(),
  location: Joi.object({
    lat: Joi.number(),
    lng: Joi.number()
  }).optional()
});

// Internal collector logs an issue against an approved household in their assigned society
router.post('/log', auth, requireRole('collector'), validate(logSchema), async (req, res) => {
  try {
    const { citizenId, type, location } = req.body;

    const collector = await User.findById(req.user.id);
    if (!collector || !collector.isActive || !collector.assignedSocietyId) {
      return res.status(403).json({
        success: false,
        message: 'You must be assigned to an approved housing society to log violations.'
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

    const citizen = await User.findById(citizenId);
    if (!citizen || citizen.role !== 'citizen') {
      return res.status(404).json({ success: false, message: 'Citizen not found' });
    }

    // Verify citizen has an APPROVED membership in this collector's assigned society
    const membership = await SocietyMembership.findOne({
      citizenId,
      societyId: society._id,
      status: 'APPROVED'
    });
    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Violations can only be logged for approved member households in your assigned society.'
      });
    }

    // Automated monetary fines and point penalties are disabled for the society pilot.
    // Observations must be recorded via structured HouseholdInspection instead.
    return res.status(403).json({
      success: false,
      message: 'Automated violation fines and penalty deductions are disabled during the BMC Society pilot. Please record household observations (Mixed waste / No handover) through the daily household inspection workflow.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to log violation: ' + error.message });
  }
});

// Citizen views their own violations
router.get('/my', auth, requireRole('citizen'), async (req, res) => {
  try {
    const violations = await Violation.find({ citizenId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('collectorId', 'name phone');
      
    res.json({ success: true, data: violations, message: 'Violations fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
  }
});

// Officer views violations within their administrative ward
router.get('/all', auth, requireRole('officer'), async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Find all citizens belonging strictly to officer's ward
    const wardCitizens = await User.find({
      role: 'citizen',
      wardId: req.user.wardId
    }).select('_id');
    const wardCitizenIds = wardCitizens.map(u => u._id);

    let filter = {
      citizenId: { $in: wardCitizenIds }
    };
    if (status) filter.status = status;
    if (type) filter.type = type;
    
    if (search) {
      const users = await User.find({
        _id: { $in: wardCitizenIds },
        phone: { $regex: search, $options: 'i' }
      }).select('_id');
      const userIds = users.map(u => u._id);
      filter.citizenId = { $in: userIds };
    }
    
    const [violations, totalCount] = await Promise.all([
      Violation.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('citizenId', 'name phone wardId')
        .populate('collectorId', 'name'),
      Violation.countDocuments(filter)
    ]);
    
    return res.json({ 
      success: true, 
      data: { violations, totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) }, 
      message: 'Violations fetched' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
  }
});

const appealSchema = Joi.object({
  appealText: Joi.string().min(20).required(),
  appealPhotoUrl: Joi.string().uri().allow('', null)
});

router.post('/:id/appeal', auth, requireRole('citizen'), validate(appealSchema), async (req, res) => {
  try {
    const { appealText, appealPhotoUrl } = req.body;
    const violation = await Violation.findById(req.params.id);
    
    if (!violation) return res.status(404).json({ success: false, message: 'Violation not found' });
    if (violation.citizenId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized access to violation' });
    if (violation.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Violation cannot be appealed at this stage' });
    if (violation.appealSubmittedAt) return res.status(400).json({ success: false, message: 'Appeal already submitted' });
    
    violation.status = 'APPEALED';
    violation.appealText = appealText;
    violation.appealPhotoUrl = appealPhotoUrl;
    violation.appealSubmittedAt = new Date();
    await violation.save();
    
    res.json({ success: true, data: violation, message: 'Appeal submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Appeal failed: ' + error.message });
  }
});

const resolveSchema = Joi.object({
  outcome: Joi.string().valid('UPHELD', 'DISMISSED').required()
});

router.put('/:id/resolve', auth, requireRole('officer'), validate(resolveSchema), async (req, res) => {
  try {
    const { outcome } = req.body;
    const violation = await Violation.findById(req.params.id).populate('citizenId', 'wardId');
    
    if (!violation) return res.status(404).json({ success: false, message: 'Violation not found' });
    
    // Officer ward check
    if (violation.citizenId?.wardId && violation.citizenId.wardId !== req.user.wardId) {
      return res.status(403).json({ success: false, message: 'Not authorized: violation is in a different administrative ward' });
    }

    if (violation.status !== 'APPEALED') return res.status(400).json({ success: false, message: 'Only appealed violations can be resolved' });
    
    if (outcome === 'DISMISSED') {
      if (violation.pointsDeducted > 0) {
        await pointsEngine.reverseDeduction(violation.citizenId._id || violation.citizenId, violation.pointsDeducted, violation._id);
      }
      violation.fineAmount = 0;
      await User.findByIdAndUpdate(violation.citizenId._id || violation.citizenId, { $inc: { violationCount30d: -1 } });
    }
    
    violation.status = 'RESOLVED';
    violation.resolvedBy = req.user.id;
    violation.resolvedAt = new Date();
    violation.resolutionOutcome = outcome;
    await violation.save();
    
    res.json({ success: true, data: violation, message: 'Violation resolved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Resolve failed: ' + error.message });
  }
});

module.exports = router;
