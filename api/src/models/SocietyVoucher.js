// filepath: api/src/models/SocietyVoucher.js
const mongoose = require('mongoose');

const societyVoucherSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Society',
    required: true,
    index: true
  },
  wardId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  representativeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  rewardId: {
    type: String,
    required: true,
    trim: true
  },
  rewardName: {
    type: String,
    required: true,
    trim: true
  },
  rewardDescription: {
    type: String,
    required: true,
    trim: true
  },
  pointsCost: {
    type: Number,
    required: true,
    min: 1
  },
  voucherCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['ISSUED', 'FULFILLED', 'EXPIRED'],
    default: 'ISSUED',
    required: true,
    index: true
  },
  issuedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  fulfilledAt: {
    type: Date,
    default: null
  },
  fulfilledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  fulfilmentNotes: {
    type: String,
    trim: true,
    default: ''
  },
  requestId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Database constraint for idempotency: one request ID per representative
societyVoucherSchema.index(
  { representativeId: 1, requestId: 1 },
  { unique: true }
);

societyVoucherSchema.index({ societyId: 1, createdAt: -1 });
societyVoucherSchema.index({ wardId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('SocietyVoucher', societyVoucherSchema);
