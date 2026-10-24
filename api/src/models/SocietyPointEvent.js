// filepath: api/src/models/SocietyPointEvent.js
const mongoose = require('mongoose');

const societyPointEventSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Society',
    required: true,
    index: true
  },
  collectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BulkCollection',
    required: true
  },
  pointsAwarded: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
