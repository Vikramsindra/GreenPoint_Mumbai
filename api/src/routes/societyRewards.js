// filepath: api/src/routes/societyRewards.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Joi = require('joi');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const Society = require('../models/Society');
const SocietyVoucher = require('../models/SocietyVoucher');
const SocietyPointEvent = require('../models/SocietyPointEvent');
const { SOCIETY_REWARDS_CATALOGUE, getRewardById } = require('../constants/societyRewardsCatalogue');
const { generateSocietyVoucherCode } = require('../utils/qrGenerator');

// Helper to determine effective status
function getEffectiveStatus(voucher) {
  if (voucher.status === 'ISSUED' && voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
    return 'EXPIRED';
  }
  return voucher.status;
}

// Helper to format voucher object for client response
function formatVoucher(voucher) {
  const plain = voucher.toObject ? voucher.toObject() : { ...voucher };
  const effectiveStatus = getEffectiveStatus(plain);
  return {
    ...plain,
    id: plain._id,
    effectiveStatus,
    isExpired: effectiveStatus === 'EXPIRED',
    isFulfillable: effectiveStatus === 'ISSUED'
  };
}

// Helper to get IST business date (YYYY-MM-DD)
function getIstBusinessDate() {
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const y = nowIST.getFullYear();
  const m = String(nowIST.getMonth() + 1).padStart(2, '0');
  const d = String(nowIST.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// =========================================================================
// REPRESENTATIVE ENDPOINTS
// =========================================================================

/**
 * GET /api/society-rewards/catalogue
 * Fetch the pilot rewards catalogue and representative's society points balance
 */
router.get('/catalogue', auth, requireRole('society_representative'), async (req, res) => {
  try {
    const society = await Society.findOne({ representativeId: req.user.id });
    if (!society) {
      return res.status(404).json({
        success: false,
        message: 'No registered society found for this representative'
      });
    }

    res.json({
      success: true,
      data: {
        society: {
          id: society._id,
          name: society.name,
          pointsBalance: society.pointsBalance || 0,
          registrationStatus: society.registrationStatus,
          wardId: society.wardId
        },
        pointsBalance: society.pointsBalance || 0,
        catalogue: SOCIETY_REWARDS_CATALOGUE.filter(r => r.isActive)
      },
      message: 'Pilot rewards catalogue retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch catalogue: ' + error.message });
  }
});

const redeemSchema = Joi.object({
  rewardId: Joi.string().required(),
  requestId: Joi.string().trim().required()
});

/**
 * POST /api/society-rewards/redeem
 * Redeem a pilot reward for the representative's approved society
 */
router.post('/redeem', auth, requireRole('society_representative'), validate(redeemSchema), async (req, res) => {
  const { rewardId, requestId } = req.body;

  try {
    // 1. Verify representative's society
    const society = await Society.findOne({ representativeId: req.user.id });
    if (!society) {
      return res.status(404).json({
        success: false,
        message: 'No registered society found for this representative'
      });
    }

    if (society.registrationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: `Only approved societies can redeem rewards (current status: ${society.registrationStatus})`
      });
    }

    // 2. Verify server-owned catalogue item and active status
    const reward = getRewardById(rewardId);
    if (!reward || !reward.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive reward selected'
      });
    }

    // 3. Idempotency Check
    const existingVoucher = await SocietyVoucher.findOne({ requestId }).populate('societyId', 'name wardId');
    if (existingVoucher) {
      // Check if requested by another representative
      if (existingVoucher.representativeId.toString() !== req.user.id) {
        return res.status(409).json({
          success: false,
          message: 'Request ID was already used by another account'
        });
      }
      // Check if used for a different reward
      if (existingVoucher.rewardId !== rewardId) {
        return res.status(409).json({
          success: false,
          message: 'Request ID was already used for a different reward'
        });
      }

      // Safe retry: return existing voucher without deducting points again
      const currentSociety = await Society.findById(society._id);
      return res.status(200).json({
        success: true,
        isDuplicate: true,
        data: {
          voucher: formatVoucher(existingVoucher),
          pointsSpent: 0,
          remainingBalance: currentSociety.pointsBalance || 0
        },
        message: 'Reward already redeemed for this request ID (idempotent replay)'
      });
    }

    // 4. Initial balance check before starting transaction
    if ((society.pointsBalance || 0) < reward.pointsCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient society points balance (${society.pointsBalance || 0} pts available, ${reward.pointsCost} pts required)`
      });
    }

    // 5. Execute atomic transaction (balance deduction + voucher issuance + ledger creation)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Atomic balance deduction with conditional guard preventing negative balance
      const updatedSociety = await Society.findOneAndUpdate(
        {
          _id: society._id,
          pointsBalance: { $gte: reward.pointsCost }
        },
        {
          $inc: { pointsBalance: -reward.pointsCost }
        },
        { new: true, session }
      );

      if (!updatedSociety) {
        await session.abortTransaction();
        await session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Insufficient society points balance for redemption'
        });
      }

      // Generate opaque voucher code and 30-day expiry
      const voucherCode = generateSocietyVoucherCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const voucher = new SocietyVoucher({
        societyId: society._id,
        wardId: (society.wardId || '').toUpperCase(),
        representativeId: req.user.id,
        rewardId: reward.id,
        rewardName: reward.name,
        rewardDescription: reward.description,
        pointsCost: reward.pointsCost,
        voucherCode,
        status: 'ISSUED',
        issuedAt: new Date(),
        expiresAt,
        requestId
      });
      await voucher.save({ session });

      const istBusinessDate = getIstBusinessDate();
      const ledgerEntry = new SocietyPointEvent({
        societyId: society._id,
        type: 'REDEEM',
        voucherId: voucher._id,
        pointsAwarded: 0,
        pointsDeducted: reward.pointsCost,
        reason: `Pilot Reward Redeemed: ${reward.name}`,
        representativeId: req.user.id,
        istBusinessDate
      });
      await ledgerEntry.save({ session });

      await session.commitTransaction();
      await session.endSession();

      return res.status(201).json({
        success: true,
        data: {
          voucher: formatVoucher(voucher),
          pointsSpent: reward.pointsCost,
          remainingBalance: updatedSociety.pointsBalance
        },
        message: `Successfully redeemed ${reward.name} for ${reward.pointsCost} points`
      });
    } catch (txnError) {
      await session.abortTransaction();
      await session.endSession();
      throw txnError;
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A voucher with this request ID or code already exists'
      });
    }
    if ((error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError')) || error.code === 112) {
      return res.status(400).json({
        success: false,
        message: 'Concurrent redemption conflict. Please retry.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Redemption failed: ' + error.message
    });
  }
});

/**
 * GET /api/society-rewards/my/vouchers
 * Fetch all vouchers issued to the representative's society
 */
router.get('/my/vouchers', auth, requireRole('society_representative'), async (req, res) => {
  try {
    const society = await Society.findOne({ representativeId: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const vouchers = await SocietyVoucher.find({ societyId: society._id })
      .populate('fulfilledBy', 'name officerId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        pointsBalance: society.pointsBalance || 0,
        vouchers: vouchers.map(formatVoucher)
      },
      message: 'Society vouchers retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch society vouchers: ' + error.message });
  }
});

/**
 * GET /api/society-rewards/my/transactions
 * Fetch complete society points ledger (EARN and REDEEM) with signed display values
 */
router.get('/my/transactions', auth, requireRole('society_representative'), async (req, res) => {
  try {
    const society = await Society.findOne({ representativeId: req.user.id });
    if (!society) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const events = await SocietyPointEvent.find({ societyId: society._id })
      .populate('voucherId', 'voucherCode rewardName pointsCost status')
      .populate('collectionId', 'weightKg outcome')
      .sort({ createdAt: -1 })
      .limit(50);

    const transactions = events.map(ev => {
      const isRedeem = ev.type === 'REDEEM' || ev.pointsDeducted > 0;
      const points = isRedeem ? ev.pointsDeducted : ev.pointsAwarded;
      return {
        id: ev._id,
        type: ev.type,
        sign: isRedeem ? '-' : '+',
        points,
        pointsDisplay: isRedeem ? `-${points} pts` : `+${points} pts`,
        reason: ev.reason,
        istBusinessDate: ev.istBusinessDate,
        createdAt: ev.createdAt,
        voucher: ev.voucherId,
        collection: ev.collectionId
      };
    });

    res.json({
      success: true,
      data: {
        pointsBalance: society.pointsBalance || 0,
        transactions
      },
      message: 'Society points ledger retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch society transactions: ' + error.message });
  }
});

// =========================================================================
// WARD OFFICER ENDPOINTS
// =========================================================================

/**
 * GET /api/society-rewards/vouchers
 * List vouchers for societies strictly within the officer's ward
 */
router.get('/vouchers', auth, requireRole('officer'), async (req, res) => {
  try {
    const officerWard = (req.user.wardId || '').toUpperCase();
    if (!officerWard) {
      return res.status(400).json({ success: false, message: 'Ward officer profile missing ward assignment' });
    }

    const { status, search } = req.query;
    const now = new Date();

    const query = { wardId: officerWard };

    if (status && status !== 'ALL') {
      if (status === 'ISSUED') {
        query.status = 'ISSUED';
        query.expiresAt = { $gt: now };
      } else if (status === 'EXPIRED') {
        query.$or = [
          { status: 'EXPIRED' },
          { status: 'ISSUED', expiresAt: { $lte: now } }
        ];
      } else if (status === 'FULFILLED') {
        query.status = 'FULFILLED';
      }
    }

    if (search && search.trim()) {
      query.voucherCode = { $regex: search.trim().toUpperCase(), $options: 'i' };
    }

    const vouchers = await SocietyVoucher.find(query)
      .populate('societyId', 'name registrationNumber wardId')
      .populate('representativeId', 'name phone')
      .populate('fulfilledBy', 'name officerId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        wardId: officerWard,
        vouchers: vouchers.map(formatVoucher)
      },
      message: 'Ward society vouchers retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch ward vouchers: ' + error.message });
  }
});

/**
 * GET /api/society-rewards/vouchers/:id
 * Retrieve a single voucher detail (strictly ward-scoped)
 */
router.get('/vouchers/:id', auth, requireRole('officer'), async (req, res) => {
  try {
    const voucher = await SocietyVoucher.findById(req.params.id)
      .populate('societyId', 'name registrationNumber wardId pointsBalance')
      .populate('representativeId', 'name phone email')
      .populate('fulfilledBy', 'name officerId');

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    if ((voucher.wardId || '').toUpperCase() !== (req.user.wardId || '').toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: `Voucher belongs to Ward ${voucher.wardId}. You are only authorized to view Ward ${req.user.wardId} vouchers.`
      });
    }

    res.json({
      success: true,
      data: formatVoucher(voucher),
      message: 'Voucher details retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch voucher: ' + error.message });
  }
});

const fulfilSchema = Joi.object({
  notes: Joi.string().trim().max(500).allow('', null).optional()
});

/**
 * PATCH /api/society-rewards/vouchers/:id/fulfil
 * Mark an issued, unexpired society voucher as FULFILLED
 */
router.patch('/vouchers/:id/fulfil', auth, requireRole('officer'), validate(fulfilSchema), async (req, res) => {
  try {
    const voucher = await SocietyVoucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    // 1. Strict Ward Boundary Check
    if ((voucher.wardId || '').toUpperCase() !== (req.user.wardId || '').toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: `Voucher belongs to Ward ${voucher.wardId}. You are only authorized to fulfil Ward ${req.user.wardId} vouchers.`
      });
    }

    // 2. Already Fulfilled Check
    if (voucher.status === 'FULFILLED') {
      return res.status(400).json({
        success: false,
        message: 'Voucher has already been fulfilled'
      });
    }

    // 3. Expiry Check
    if (new Date(voucher.expiresAt) < new Date() || voucher.status === 'EXPIRED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot fulfil voucher: Voucher has expired. Points are not refunded in this pilot demonstration.'
      });
    }

    // 4. Conditional Atomic State Transition (guarantees exactly-once fulfilment)
    const updatedVoucher = await SocietyVoucher.findOneAndUpdate(
      {
        _id: voucher._id,
        status: 'ISSUED',
        expiresAt: { $gte: new Date() }
      },
      {
        $set: {
          status: 'FULFILLED',
          fulfilledAt: new Date(),
          fulfilledBy: req.user.id,
          fulfilmentNotes: req.body.notes || ''
        }
      },
      { new: true }
    )
      .populate('societyId', 'name registrationNumber wardId')
      .populate('representativeId', 'name phone')
      .populate('fulfilledBy', 'name officerId');

    if (!updatedVoucher) {
      return res.status(400).json({
        success: false,
        message: 'Voucher could not be fulfilled (it may have been fulfilled concurrently or has expired)'
      });
    }

    res.json({
      success: true,
      data: formatVoucher(updatedVoucher),
      message: `Pilot voucher ${updatedVoucher.voucherCode} marked FULFILLED successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fulfil voucher: ' + error.message });
  }
});

module.exports = router;
