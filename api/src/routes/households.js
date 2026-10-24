// filepath: api/src/routes/households.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Joi = require('joi');
const Household = require('../models/Household');
const User = require('../models/User');
const Society = require('../models/Society');
const SocietyMembership = require('../models/SocietyMembership');
const HouseholdInspection = require('../models/HouseholdInspection');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { generateQRCodeString, generateQRCodeImage, generateQRCodeBuffer } = require('../utils/qrGenerator');
const { validate } = require('../middleware/validate');

const registerHouseholdSchema = Joi.object({
  citizenId: Joi.string().required(),
  address: Joi.string().min(10).required(),
  societyId: Joi.string().allow('', null).optional()
});

// Register a new household (officer only)
router.post('/register', auth, requireRole('officer'), validate(registerHouseholdSchema), async (req, res) => {
  try {
    const { citizenId, address, societyId } = req.body;

    const citizen = await User.findOne({ _id: citizenId, role: 'citizen' });
    if (!citizen) {
      return res.status(404).json({ success: false, message: 'Citizen not found' });
    }

    // Ward match check for citizen
    if (citizen.wardId && citizen.wardId !== req.user.wardId) {
      return res.status(400).json({ success: false, message: 'Citizen belongs to a different administrative ward' });
    }

    const existingHousehold = await Household.findOne({ citizenId });
    if (existingHousehold) {
      return res.status(409).json({ success: false, message: 'Citizen already has a registered household' });
    }

    // Check existing membership/link conflict
    const existingMembership = await SocietyMembership.findOne({
      citizenId,
      status: { $in: ['PENDING', 'APPROVED'] }
    });
    if (existingMembership) {
      return res.status(409).json({ success: false, message: 'Citizen already has an active or pending society membership request' });
    }

    let societyRef = null;
    let validatedSocietyId = '';
    if (societyId) {
      const society = await Society.findById(societyId);
      if (!society || society.registrationStatus !== 'APPROVED') {
        return res.status(400).json({ success: false, message: 'Invalid or non-approved society specified' });
      }
      if (society.wardId !== req.user.wardId) {
        return res.status(400).json({ success: false, message: 'Society belongs to a different administrative ward' });
      }
      societyRef = society._id;
      validatedSocietyId = society._id.toString();
    }

    const qrCode = generateQRCodeString();
    const qrImageUrl = await generateQRCodeImage(qrCode);

    const household = await Household.create({
      citizenId,
      address,
      wardId: req.user.wardId,
      societyId: validatedSocietyId,
      societyRef,
      qrCode,
      qrImageUrl
    });

    await User.findByIdAndUpdate(citizenId, { householdId: household._id });

    res.status(201).json({
      success: true,
      data: { household },
      message: 'Household registered and QR generated'
    });
  } catch (err) {
    console.error('Household registration error:', err);
    res.status(500).json({ success: false, message: 'Registration failed: ' + err.message });
  }
});

// Helper function to get households for internal collector's assigned society
async function getCollectorSocietyHouseholds(collectorId) {
  const collector = await User.findById(collectorId);
  if (!collector || !collector.isActive || !collector.assignedSocietyId) {
    return {
      success: true,
      data: { households: [], society: null, assigned: false },
      message: 'No society assigned yet'
    };
  }

  const society = await Society.findById(collector.assignedSocietyId);
  if (!society || society.registrationStatus !== 'APPROVED') {
    return {
      success: true,
      data: { households: [], society: null, assigned: false },
      message: 'Assigned society is inactive or not found'
    };
  }

  // Verify collector is the designated internal collector of this society
  if (!society.internalCollectorId || society.internalCollectorId.toString() !== collector._id.toString()) {
    return {
      success: true,
      data: { households: [], society: null, assigned: false },
      message: 'Collector is not assigned as the internal collector for this society'
    };
  }

  // Include only active households with APPROVED membership in that society
  const approvedMemberships = await SocietyMembership.find({
    societyId: society._id,
    status: 'APPROVED'
  }).select('householdId citizenId');

  const approvedHouseholdIds = approvedMemberships.map(m => m.householdId).filter(Boolean);
  const approvedCitizenIds = approvedMemberships.map(m => m.citizenId);

  const households = await Household.find({
    isActive: true,
    $or: [
      { _id: { $in: approvedHouseholdIds } },
      { citizenId: { $in: approvedCitizenIds }, societyRef: society._id }
    ],
    // Canonical societyRef check: must not point to a conflicting society
    $and: [
      { $or: [{ societyRef: null }, { societyRef: { $exists: false } }, { societyRef: society._id }] }
    ]
  })
    .populate('citizenId', 'name phone pointsBalance')
    .sort({ address: 1 });

  return {
    success: true,
    data: {
      households,
      society: {
        id: society._id,
        name: society.name,
        wardId: society.wardId,
        address: society.address
      },
      assigned: true
    },
    message: 'Society households fetched successfully'
  };
}

// Get own household (citizen only)
router.get('/my', auth, requireRole('citizen'), async (req, res) => {
  try {
    const household = await Household.findOne({ citizenId: req.user.id })
      .populate('citizenId', 'name phone')
      .populate('societyRef', 'name address wardId registrationStatus');
    if (!household) {
      return res.status(404).json({ success: false, message: 'No household registered yet. Join an approved housing society to get your Household QR.' });
    }
    res.json({ success: true, data: { household }, message: 'Household fetched' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + err.message });
  }
});

// Get households for collector's assigned society (collector only)
router.get('/society', auth, requireRole('collector'), async (req, res) => {
  try {
    const result = await getCollectorSocietyHouseholds(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + err.message });
  }
});

// Get own household inspection history (citizen only)
router.get('/my-inspections', auth, requireRole('citizen'), async (req, res) => {
  try {
    const household = await Household.findOne({ citizenId: req.user.id });
    if (!household) {
      return res.json({
        success: true,
        data: { inspections: [] },
        message: 'No household registered yet.'
      });
    }

    const inspections = await HouseholdInspection.find({ householdId: household._id })
      .populate('collectorId', 'name')
      .populate('societyId', 'name')
      .sort({ inspectedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: {
        inspections,
        householdAddress: household.address,
        householdQrCode: household.qrCode,
        policyNote: 'Household records show participation; BMC-verified society handovers earn society points.'
      },
      message: 'Household inspection history fetched'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch inspections: ' + err.message });
  }
});

// Resolve household by ID or QR code for internal collector
router.get('/resolve/:idOrQr', auth, requireRole('collector'), async (req, res) => {
  try {
    const { idOrQr } = req.params;
    const collector = await User.findById(req.user.id);
    if (!collector || !collector.assignedSocietyId) {
      return res.status(403).json({ success: false, message: 'Collector not assigned to any approved society' });
    }

    let household;
    if (mongoose.Types.ObjectId.isValid(idOrQr)) {
      household = await Household.findOne({ _id: idOrQr, isActive: true })
        .populate('citizenId', 'name phone')
        .populate('societyRef', 'name address wardId');
    }
    if (!household) {
      household = await Household.findOne({ qrCode: idOrQr, isActive: true })
        .populate('citizenId', 'name phone')
        .populate('societyRef', 'name address wardId');
    }

    if (!household) {
      return res.status(404).json({ success: false, message: 'Household not found or inactive' });
    }

    // Verify household belongs to collector's assigned society
    const approvedMembership = await SocietyMembership.findOne({
      societyId: collector.assignedSocietyId,
      status: 'APPROVED',
      $or: [
        { householdId: household._id },
        { citizenId: household.citizenId?._id }
      ]
    });

    if (!approvedMembership) {
      return res.status(403).json({
        success: false,
        message: 'Household does not belong to your assigned housing society'
      });
    }

    const society = await Society.findById(collector.assignedSocietyId).select('name');

    res.json({
      success: true,
      data: {
        household: {
          _id: household._id,
          address: household.address,
          qrCode: household.qrCode,
          citizenName: household.citizenId?.name || 'Unknown',
          citizenPhone: household.citizenId?.phone || '',
          societyName: society?.name || 'Assigned Society',
          societyId: collector.assignedSocietyId
        }
      },
      message: 'Household resolved'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Resolve failed: ' + err.message });
  }
});

// Get QR image buffer (officer in same ward or the owning citizen)
router.get('/qr-image/:id', auth, requireRole('officer', 'citizen'), async (req, res) => {
  try {
    const household = await Household.findById(req.params.id);
    if (!household) {
      return res.status(404).json({ success: false, message: 'Household not found' });
    }

    if (req.user.role === 'citizen' && household.citizenId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this QR code' });
    }

    if (req.user.role === 'officer' && household.wardId !== req.user.wardId) {
      return res.status(403).json({ success: false, message: 'Not authorized: household is in another ward' });
    }

    const buffer = await generateQRCodeBuffer(household.qrCode);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename=greenpoint-qr-${household.qrCode}.png`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: 'QR fetch failed: ' + err.message });
  }
});

// Get households by ward (officer, collector)
// If caller is collector: strictly scoped to assigned society
router.get('/ward', auth, requireRole('officer', 'collector'), async (req, res) => {
  try {
    if (req.user.role === 'collector') {
      const result = await getCollectorSocietyHouseholds(req.user.id);
      return res.json(result);
    }

    // Officer path: strictly scoped to officer's own ward
    const households = await Household.find({ wardId: req.user.wardId, isActive: true })
      .populate('citizenId', 'name phone pointsBalance')
      .populate('societyRef', 'name')
      .sort({ address: 1 });
    
    res.json({ success: true, data: { households }, message: 'Ward households fetched' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + err.message });
  }
});

// Get all households paginated (officer: strictly scoped to officer's ward)
router.get('/all', auth, requireRole('officer'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const { search } = req.query;

    // Always enforce officer's ward, ignoring any query parameter
    const query = { wardId: req.user.wardId };

    if (search) {
      const matchingCitizens = await User.find({
        role: 'citizen',
        wardId: req.user.wardId,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const citizenIds = matchingCitizens.map(c => c._id);
      
      query.$or = [
        { address: { $regex: search, $options: 'i' } },
        { qrCode: { $regex: search, $options: 'i' } },
        { citizenId: { $in: citizenIds } }
      ];
    }

    const [households, totalCount] = await Promise.all([
      Household.find(query)
        .populate('citizenId', 'name phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Household.countDocuments(query)
    ]);

    res.json({ success: true, data: { households, totalCount, page, limit }, message: 'Households fetched' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + err.message });
  }
});

// Deactivate household (officer in same ward)
router.patch('/:id/deactivate', auth, requireRole('officer'), async (req, res) => {
  try {
    const household = await Household.findById(req.params.id);
    if (!household) {
      return res.status(404).json({ success: false, message: 'Household not found' });
    }

    if (household.wardId !== req.user.wardId) {
      return res.status(403).json({ success: false, message: 'Not authorized: household is in a different ward' });
    }

    household.isActive = false;
    await household.save();

    res.json({ success: true, data: { household }, message: 'Household deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Deactivation failed: ' + err.message });
  }
});

module.exports = router;
