// filepath: api/src/models/Violation.js
const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['NON_SEGREGATION', 'LITTERING', 'BURNING', 'BULK_VIOLATION'],
    required: true
  },
  tier: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  offenceCountInWindow: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPEALED', 'RESOLVED', 'FINE_ISSUED'],
    default: 'PENDING'
  },
  fineAmount: {
    type: Number,
    default: 0
  },
  pointsDeducted: {
    type: Number,
    default: 0
  },
  location: {
    type: {
      lat: Number,
      lng: Number
    },
    default: { lat: 19.0728, lng: 72.8826 }
  },
  appealText: {
    type: String,
    default: ''
  },
  appealPhotoUrl: {
    type: String,
    default: ''
  },
  appealSubmittedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  resolutionOutcome: {
    type: String,
    enum: ['UPHELD', 'DISMISSED']
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

violationSchema.index({ citizenId: 1, createdAt: -1 });
violationSchema.index({ status: 1 });
violationSchema.index({ citizenId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Violation', violationSchema);
