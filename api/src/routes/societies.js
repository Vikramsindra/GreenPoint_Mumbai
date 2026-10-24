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
const Household = require('../models/Household');
const SocietyMembership = require('../models/SocietyMembership');
const BulkCollection = require('../models/BulkCollection');
const SocietyPointEvent = require('../models/SocietyPointEvent');
const HouseholdInspection = require('../models/HouseholdInspection');
const { getIstBusinessDate } = require('../utils/dateHelper');
const { isValidWard, VALID_WARDS } = require('../constants/wards');
const {
  generateQRCodeString,
  generateSocietyQRCodeString,
  generateSocietyJoinCode,
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
    let society = await Society.findOne({ representativeId: req.user.id })
      .populate({
        path: 'collectionPointId',
        select: 'name type address wardId location isActive assignedCollectorId',
        populate: { path: 'assignedCollectorId', select: 'name phone collectorId role' }
      })
      .populate('reviewedBy', 'name phone email')
      .populate('internalCollectorId', 'name phone collectorId role');

    if (!society) {
      return res.status(404).json({
        success: false,
        message: 'No society application found for this representative'
      });
    }

    // Lazy generation of joinCode for approved society if missing (e.g. from Task 1)
    if (society.registrationStatus === 'APPROVED' && !society.joinCode) {
      let codeAssigned = false;
      let attempts = 0;
      while (!codeAssigned && attempts < 10) {
        attempts++;
        const candidate = generateSocietyJoinCode();
        const existing = await Society.findOne({ joinCode: candidate });
        if (!existing) {
          society.joinCode = candidate;
          await society.save();
          codeAssigned = true;
        }
      }
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
// GET /api/societies/my/household-inspections - Representative fetches today's participation
// -------------------------------------------------------------
router.get('/my/household-inspections', auth, requireRole('society_representative'), async (req, res) => {
  try {
    const society = await Society.findOne({ representativeId: req.user.id });
    if (!society) {
      return res.status(404).json({
        success: false,
        message: 'No society found for this representative'
      });
    }

    if (society.registrationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'Society is not approved yet'
      });
    }

    const istBusinessDate = getIstBusinessDate(new Date());

    const totalAssigned = await SocietyMembership.countDocuments({
      societyId: society._id,
      status: 'APPROVED'
    });

    const inspections = await HouseholdInspection.find({
      societyId: society._id,
      istBusinessDate
    })
      .populate('householdId', 'address qrCode')
      .populate('citizenId', 'name phone')
      .populate('collectorId', 'name')
      .sort({ inspectedAt: -1 });

    const inspectedToday = inspections.length;
    const segregatedToday = inspections.filter(i => i.outcome === 'SEGREGATED').length;
    const mixedToday = inspections.filter(i => i.outcome === 'MIXED').length;
    const noHandoverToday = inspections.filter(i => i.outcome === 'NO_HANDOVER').length;
    const successfulHandoversToday = segregatedToday + mixedToday;
    const remainingToday = Math.max(0, totalAssigned - inspectedToday);

    res.json({
      success: true,
      data: {
        society: {
          _id: society._id,
          name: society.name
        },
        stats: {
          totalAssigned,
          inspectedToday,
          segregatedToday,
          mixedToday,
          noHandoverToday,
          successfulHandoversToday,
          remainingToday
        },
        inspections: inspections.slice(0, 50),
        istBusinessDate,
        policyNote: 'Household records show participation; BMC-verified society handovers earn society points.'
      },
      message: "Today's household participation fetched"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch household participation: ' + error.message });
  }
});

// -------------------------------------------------------------
// POST /api/societies/join-request - Citizen submits join request
// -------------------------------------------------------------
const joinRequestSchema = Joi.object({
  joinCode: Joi.string().trim().uppercase().required(),
  address: Joi.string().trim().min(2).max(300).required()
});

router.post('/join-request', auth, requireRole('citizen'), validate(joinRequestSchema), async (req, res) => {
  try {
    const { joinCode, address } = req.body;
    const citizenId = req.user.id;

    // Find society by joinCode
    const society = await Society.findOne({ joinCode: joinCode.trim().toUpperCase() });
    if (!society || society.registrationStatus !== 'APPROVED') {
      return res.status(404).json({
        success: false,
        message: 'Invalid society join code or society is not approved'
      });
    }

    // Check if citizen is already an approved member of ANY society
    const approvedMembership = await SocietyMembership.findOne({ citizenId, status: 'APPROVED' }).populate('societyId', 'name');
    if (approvedMembership) {
      return res.status(409).json({
        success: false,
        message: `You are already an approved member of ${approvedMembership.societyId?.name || 'a society'}`
      });
    }

    // Check if citizen already has a pending membership request
    const pendingMembership = await SocietyMembership.findOne({ citizenId, status: 'PENDING' }).populate('societyId', 'name');
    if (pendingMembership) {
      return res.status(409).json({
        success: false,
        message: `You already have a pending membership request for ${pendingMembership.societyId?.name || 'a society'}. Please wait for representative review.`
      });
    }

    // Check if citizen already has a linked household with another society
    const existingHousehold = await Household.findOne({ citizenId });
    if (existingHousehold && existingHousehold.societyRef && existingHousehold.societyRef.toString() !== society._id.toString()) {
      return res.status(409).json({
        success: false,
        message: 'Your existing registered household is already associated with another housing society'
      });
    }

    // If citizen had a REJECTED membership, allow updating/resubmitting
    let membership = await SocietyMembership.findOne({ citizenId, status: 'REJECTED' });
    if (membership) {
      membership.societyId = society._id;
      membership.address = address.trim();
      membership.status = 'PENDING';
      membership.submittedAt = new Date();
      membership.reviewedBy = null;
      membership.reviewedAt = null;
      membership.reviewNote = '';
      await membership.save();
    } else {
      membership = await SocietyMembership.create({
        citizenId,
        societyId: society._id,
        address: address.trim(),
        status: 'PENDING',
        submittedAt: new Date()
      });
    }

    const populated = await SocietyMembership.findById(membership._id).populate('societyId', 'name address wardId');

    res.status(201).json({
      success: true,
      data: populated,
      message: 'Membership request submitted successfully. Pending approval by society representative.'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A membership request for this society is already being processed'
      });
    }
    res.status(500).json({ success: false, message: 'Failed to submit join request: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/societies/my-membership - Citizen retrieves their membership status
// -------------------------------------------------------------
router.get('/my-membership', auth, requireRole('citizen'), async (req, res) => {
  try {
    const membership = await SocietyMembership.findOne({ citizenId: req.user.id })
      .populate('societyId', 'name address wardId registrationStatus joinCode')
      .populate('householdId', 'address qrCode qrImageUrl totalScans')
      .sort({ updatedAt: -1 });

    if (!membership) {
      return res.json({
        success: true,
        data: null,
        message: 'No society membership found'
      });
    }

    res.json({
      success: true,
      data: membership,
      message: 'Membership status retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch membership: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/societies/my/members - Representative lists members & requests
// -------------------------------------------------------------
router.get('/my/members', auth, requireRole('society_representative'), async (req, res) => {
  try {
    const society = await Society.findOne({ representativeId: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'No society found for this representative' });
    }

    if (society.registrationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'Membership management is only available for approved societies'
      });
    }

    const memberships = await SocietyMembership.find({ societyId: society._id })
      .populate('citizenId', 'name phone email pointsBalance')
      .populate('householdId', 'address qrCode qrImageUrl totalScans lastScannedAt')
      .populate('reviewedBy', 'name')
      .sort({ submittedAt: -1 });

    const pending = memberships.filter(m => m.status === 'PENDING');
    const approved = memberships.filter(m => m.status === 'APPROVED');
    const rejected = memberships.filter(m => m.status === 'REJECTED');

    res.json({
      success: true,
      data: {
        society: {
          id: society._id,
          name: society.name,
          joinCode: society.joinCode,
          wardId: society.wardId
        },
        pending,
        approved,
        rejected,
        counts: {
          pending: pending.length,
          approved: approved.length,
          rejected: rejected.length,
          total: memberships.length
        }
      },
      message: 'Society members and requests retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch members: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/societies/my/handovers - Representative views recent municipal handovers & points
// -------------------------------------------------------------
router.get('/my/handovers', auth, requireRole('society_representative'), async (req, res) => {
  try {
    const society = await Society.findOne({ representativeId: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'No society found for this representative' });
    }

    if (society.registrationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'Municipal handover records are only available for approved societies'
      });
    }

    const handovers = await BulkCollection.find({ societyId: society._id })
      .populate('bmcCollectorId', 'name phone collectorId')
      .sort({ timestamp: -1 })
      .limit(30);

    const ledger = await SocietyPointEvent.find({ societyId: society._id })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({
      success: true,
      data: {
        society: {
          id: society._id,
          name: society.name,
          pointsBalance: society.pointsBalance || 0,
          wardId: society.wardId
        },
        pointsBalance: society.pointsBalance || 0,
        handovers,
        ledger
      },
      message: 'Society municipal handovers retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch handovers: ' + error.message });
  }
});

// -------------------------------------------------------------
// PATCH /api/societies/members/:id/review - Representative approves/rejects request
// -------------------------------------------------------------
const reviewMemberSchema = Joi.object({
  decision: Joi.string().valid('APPROVED', 'REJECTED').required(),
  reviewNote: Joi.string().trim().max(500).allow('', null).when('decision', {
    is: 'REJECTED',
    then: Joi.string().trim().min(3).max(500).required().messages({
      'any.required': 'A reason must be provided when rejecting a membership request (at least 3 characters)',
      'string.empty': 'A reason must be provided when rejecting a membership request (at least 3 characters)'
    }),
    otherwise: Joi.string().trim().max(500).allow('', null).default('')
  })
});

router.patch('/members/:id/review', auth, requireRole('society_representative'), validate(reviewMemberSchema), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid membership ID format' });
    }

    const { decision, reviewNote = '' } = req.body;

    // Find the representative's approved society
    const society = await Society.findOne({ representativeId: req.user.id });
    if (!society || society.registrationStatus !== 'APPROVED') {
      return res.status(403).json({ success: false, message: 'Only representatives of approved societies can review memberships' });
    }

    // Find membership
    const membership = await SocietyMembership.findById(id);
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership request not found' });
    }

    // Verify membership belongs to representative's society
    if (membership.societyId.toString() !== society._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only review requests for your own society' });
    }

    // Verify membership is pending
    if (membership.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        message: `Membership request has already been reviewed with status: ${membership.status}`
      });
    }

    if (decision === 'REJECTED') {
      membership.status = 'REJECTED';
      membership.reviewNote = reviewNote;
      membership.reviewedBy = req.user.id;
      membership.reviewedAt = new Date();
      await membership.save();

      return res.json({
        success: true,
        data: membership,
        message: 'Membership request rejected'
      });
    }

    // Decision is APPROVED
    // Check if citizen already has a household
    let household = await Household.findOne({ citizenId: membership.citizenId });

    if (household) {
      // If citizen already has an unlinked legacy household or household linked to this society
      if (household.societyRef && household.societyRef.toString() !== society._id.toString()) {
        return res.status(409).json({
          success: false,
          message: 'Citizen already has a registered household associated with another housing society'
        });
      }

      // Link household to this society, preserving _id, qrCode, qrImageUrl, history
      household.societyRef = society._id;
      household.societyId = society._id.toString();
      household.wardId = society.wardId;
      household.address = membership.address || household.address;
      await household.save();
    } else {
      // Create new Household with stable household format GP-HH-
      const qrCode = generateQRCodeString();
      const qrImageUrl = await generateQRCodeImage(qrCode);

      household = await Household.create({
        citizenId: membership.citizenId,
        address: membership.address,
        wardId: society.wardId,
        societyId: society._id.toString(),
        societyRef: society._id,
        qrCode,
        qrImageUrl
      });
    }

    // Update citizen User record
    await User.findByIdAndUpdate(membership.citizenId, {
      householdId: household._id,
      societyId: society._id.toString(),
      wardId: society.wardId
    });

    // Update membership status
    membership.status = 'APPROVED';
    membership.householdId = household._id;
    membership.reviewedBy = req.user.id;
    membership.reviewedAt = new Date();
    membership.reviewNote = reviewNote || '';
    await membership.save();

    res.json({
      success: true,
      data: {
        membership,
        household
      },
      message: 'Household membership approved successfully. Household QR code ready.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Review failed: ' + error.message });
  }
});

// -------------------------------------------------------------
// GET /api/societies/collector-lookup - Representative looks up collector by exact phone
// -------------------------------------------------------------
router.get('/collector-lookup', auth, requireRole('society_representative'), async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || !/^[0-9]{10}$/.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid 10-digit registered phone number is required'
      });
    }

    const society = await Society.findOne({ representativeId: req.user.id });
    if (!society || society.registrationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'Only representatives of approved societies can assign an internal collector'
      });
    }

    const collectorUser = await User.findOne({ phone: phone.trim() });
    if (!collectorUser) {
      return res.status(404).json({
        success: false,
        message: `No user found with registered phone ${phone.trim()}. Internal collectors must be registered staff.`
      });
    }

    // Reject non-collector roles (citizen, officer, representative, bmc_collector)
    if (collectorUser.role !== 'collector') {
      return res.status(400).json({
        success: false,
        message: `User '${collectorUser.name}' has role '${collectorUser.role}', not 'collector'. Only internal society collectors can be assigned.`
      });
    }

    // Check if collector is already assigned to this society
    const isAlreadyAssignedToThis = society.internalCollectorId && society.internalCollectorId.toString() === collectorUser._id.toString();
    if (isAlreadyAssignedToThis) {
      return res.json({
        success: true,
        data: {
          collector: {
            id: collectorUser._id,
            name: collectorUser.name,
            phone: collectorUser.phone,
            collectorId: collectorUser.collectorId
          },
          alreadyAssigned: true
        },
        message: `${collectorUser.name} is already assigned as the internal collector for your society.`
      });
    }

    // Check if collector is assigned to another society
    if (collectorUser.assignedSocietyId && collectorUser.assignedSocietyId.toString() !== society._id.toString()) {
      return res.status(400).json({
        success: false,
        message: `Collector '${collectorUser.name}' is already assigned to another housing society.`
      });
    }

    res.json({
      success: true,
      data: {
        collector: {
          id: collectorUser._id,
          name: collectorUser.name,
          phone: collectorUser.phone,
          collectorId: collectorUser.collectorId
        },
        alreadyAssigned: false
      },
      message: `Collector '${collectorUser.name}' is eligible for assignment.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Collector lookup failed: ' + error.message });
  }
});

// -------------------------------------------------------------
// POST /api/societies/my/collector - Representative assigns internal collector
// -------------------------------------------------------------
const assignCollectorSchema = Joi.object({
  phone: Joi.string().trim().pattern(/^[0-9]{10}$/).required().messages({
    'string.pattern.base': 'Phone must be a valid 10-digit number'
  })
});

router.post('/my/collector', auth, requireRole('society_representative'), validate(assignCollectorSchema), async (req, res) => {
  try {
    const { phone } = req.body;

    const society = await Society.findOne({ representativeId: req.user.id });
    if (!society || society.registrationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'Only representatives of approved societies can assign an internal collector'
      });
    }

    const collectorUser = await User.findOne({ phone: phone.trim() });
    if (!collectorUser) {
      return res.status(404).json({
        success: false,
        message: `No user found with registered phone ${phone.trim()}`
      });
    }

    // Role check
    if (collectorUser.role !== 'collector') {
      return res.status(400).json({
        success: false,
        message: `User '${collectorUser.name}' has role '${collectorUser.role}', not 'collector'.`
      });
    }

    // Repeating the same assignment should be harmless
    if (society.internalCollectorId && society.internalCollectorId.toString() === collectorUser._id.toString()) {
      return res.json({
        success: true,
        data: { society, collector: collectorUser.toSafeObject() },
        message: `Collector '${collectorUser.name}' is already assigned to this society.`
      });
    }

    // Enforce 1-collector-per-society rule: if society already has another collector assigned
    if (society.internalCollectorId && society.internalCollectorId.toString() !== collectorUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Society already has an assigned internal collector. Collector replacement is not supported for this demo.'
      });
    }

    // Enforce 1-society-per-collector rule: collector cannot be assigned to another society
    if (collectorUser.assignedSocietyId && collectorUser.assignedSocietyId.toString() !== society._id.toString()) {
      return res.status(400).json({
        success: false,
        message: `Collector '${collectorUser.name}' is already assigned to another housing society.`
      });
    }

    // Assign atomically
    society.internalCollectorId = collectorUser._id;
    await society.save();

    collectorUser.assignedSocietyId = society._id;
    await collectorUser.save();

    const populatedSociety = await Society.findById(society._id)
      .populate('collectionPointId')
      .populate('internalCollectorId', 'name phone collectorId role');

    res.json({
      success: true,
      data: {
        society: populatedSociety,
        collector: collectorUser.toSafeObject()
      },
      message: `Collector '${collectorUser.name}' successfully assigned to '${society.name}'`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Collector assignment failed: ' + error.message });
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
      .populate('internalCollectorId', 'name phone collectorId role')
      .populate({
        path: 'collectionPointId',
        select: 'name type address location isActive assignedCollectorId',
        populate: { path: 'assignedCollectorId', select: 'name phone collectorId role' }
      })
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
      .populate('internalCollectorId', 'name phone collectorId role')
      .populate({
        path: 'collectionPointId',
        select: 'name type address wardId location isActive assignedCollectorId',
        populate: { path: 'assignedCollectorId', select: 'name phone collectorId role' }
      });

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
      const joinCode = generateSocietyJoinCode();

      // Conditionally update society status to APPROVED
      const updatedSociety = await Society.findOneAndUpdate(
        { _id: id, registrationStatus: 'PENDING' },
        {
          $set: {
            registrationStatus: 'APPROVED',
            collectionPointId: collectionPoint._id,
            qrCode,
            joinCode,
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
