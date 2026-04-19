// models/Violation.js
// Note: Appeal data is embedded directly in this model (no separate Appeal collection needed).

const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema(
  {
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'citizenId is required'],
    },
    collectorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'collectorId is required'],
    },
    type: {
      type: String,
      enum: {
        values: ['NON_SEGREGATION', 'LITTERING', 'BURNING', 'BULK_VIOLATION'],
        message: 'Invalid violation type',
      },
      required: [true, 'Violation type is required'],
    },
    tier: {
      type: Number,
      min: [1, 'Tier must be 1, 2, or 3'],
      max: [3, 'Tier must be 1, 2, or 3'],
      required: [true, 'Tier is required'],
    },
    offenceCountInWindow: {
      type: Number,
      default: 1,
      min: [1, 'Offence count must be at least 1'],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'APPEALED', 'RESOLVED', 'FINE_ISSUED'],
        message: 'Invalid status value',
      },
      default: 'PENDING',
    },
    fineAmount: {
      type: Number,
      default: 0,
      min: [0, 'Fine amount cannot be negative'],
    },
    pointsDeducted: {
      type: Number,
      default: 0,
      min: [0, 'Points deducted cannot be negative'],
    },
    location: {
      lat: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
      },
      lng: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
      },
    },

    // ── Embedded Appeal data ─────────────────────────────────────────────────
    appealText: {
      type: String,
      trim: true,
    },
    appealPhotoUrl: {
      type: String,
      trim: true,
    },

    // ── Resolution metadata ──────────────────────────────────────────────────
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    strict: true,
    versionKey: false,
  }
);

// Indexes
violationSchema.index({ citizenId: 1, createdAt: -1 });   // primary query pattern
violationSchema.index({ collectorId: 1, createdAt: -1 });
violationSchema.index({ status: 1 });
violationSchema.index({ type: 1, tier: 1 });

module.exports = mongoose.model('Violation', violationSchema);
