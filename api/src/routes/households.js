// filepath: api/src/routes/households.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Household = require('../models/Household');
const User = require('../models/User');
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

    const existingHousehold = await Household.findOne({ citizenId });
    if (existingHousehold) {
      return res.status(409).json({ success: false, message: 'Citizen already has a registered household' });
    }

    const qrCode = generateQRCodeString();
    const qrImageUrl = await generateQRCodeImage(qrCode);

    const household = await Household.create({
      citizenId,
      address,
      wardId: req.user.wardId,
      societyId: societyId || '',
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

// Get own household (citizen only)
router.get('/my', auth, requireRole('citizen'), async (req, res) => {
  try {
    const household = await Household.findOne({ citizenId: req.user.id }).populate('citizenId', 'name phone');
    if (!household) {
      return res.status(404).json({ success: false, message: 'No household registered yet. Contact your BMC ward office.' });
    }
    res.json({ success: true, data: { household }, message: 'Household fetched' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + err.message });
  }
});

// Get QR image buffer (officer or the owning citizen)
router.get('/qr-image/:id', auth, requireRole('officer', 'citizen'), async (req, res) => {
  try {
    const household = await Household.findById(req.params.id);
    if (!household) {
      return res.status(404).json({ success: false, message: 'Household not found' });
    }

    if (req.user.role === 'citizen' && household.citizenId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this QR code' });
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
router.get('/ward', auth, requireRole('officer', 'collector'), async (req, res) => {
  try {
    const households = await Household.find({ wardId: req.user.wardId, isActive: true })
      .populate('citizenId', 'name phone pointsBalance')
      .sort({ address: 1 });
    
    res.json({ success: true, data: { households }, message: 'Ward households fetched' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + err.message });
  }
});

// Get all households paginated (officer)
router.get('/all', auth, requireRole('officer'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const { wardId, search } = req.query;

    const query = {};
    if (wardId) query.wardId = wardId;

    if (search) {
      // Need to find citizens matching search first to filter by citizenId
      const matchingCitizens = await User.find({
        role: 'citizen',
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

// Deactivate household (officer)
router.patch('/:id/deactivate', auth, requireRole('officer'), async (req, res) => {
  try {
    const household = await Household.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!household) {
      return res.status(404).json({ success: false, message: 'Household not found' });
    }
    res.json({ success: true, data: { household }, message: 'Household deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Deactivation failed: ' + err.message });
  }
});

module.exports = router;
