// filepath: api/src/models/SocietyPointEvent.js
const mongoose = require('mongoose');

const societyPointEventSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Society',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['EARN', 'REDEEM'],
    default: 'EARN',
    required: true,
    index: true
  },
  collectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BulkCollection',
    required: function() { return this.type === 'EARN'; },
    default: null
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocietyVoucher',
    required: function() { return this.type === 'REDEEM'; },
    default: null
  },
  pointsAwarded: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  pointsDeducted: {
    type: Number,
    min: 0,
    default: 0
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.type === 'EARN'; },
    default: null
  },
  representativeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.type === 'REDEEM'; },
    default: null
  },
  istBusinessDate: {
    type: String, // 'YYYY-MM-DD' in Asia/Kolkata
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce max 1 positive award per society per IST calendar day at database level
societyPointEventSchema.index(
  { societyId: 1, istBusinessDate: 1 },
  { unique: true, partialFilterExpression: { pointsAwarded: { $gt: 0 } } }
);

societyPointEventSchema.index({ societyId: 1, createdAt: -1 });

module.exports = mongoose.model('SocietyPointEvent', societyPointEventSchema);
