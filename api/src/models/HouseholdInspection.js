// filepath: api/src/models/HouseholdInspection.js
const mongoose = require('mongoose');

const householdInspectionSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
      index: true
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    collectorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    outcome: {
      type: String,
      enum: ['SEGREGATED', 'MIXED', 'NO_HANDOVER'],
      required: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    weightKg: {
      type: Number,
      default: null,
      min: 0
    },
    weightBasis: {
      type: String,
      enum: ['ESTIMATED', 'MEASURED'],
      default: 'ESTIMATED'
    },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    },
    istBusinessDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true
    },
    requestId: {
      type: String,
      required: true,
      trim: true
    },
    inspectedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// One final inspection per household per IST business day
householdInspectionSchema.index(
  { householdId: 1, istBusinessDate: 1 },
  { unique: true }
);

// Retry / idempotency protection scoped to collector and requestId
householdInspectionSchema.index(
  { collectorId: 1, requestId: 1 },
  { unique: true }
);

module.exports = mongoose.model('HouseholdInspection', householdInspectionSchema);
