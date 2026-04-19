// models/PointEvent.js

const mongoose = require('mongoose');

const pointEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },
    type: {
      type: String,
      enum: {
        values: ['EARN', 'DEDUCT'],
        message: 'Type must be EARN or DEDUCT',
      },
      required: [true, 'type is required'],
    },
    action: {
      type: String,
      enum: {
        values: [
          'SEGREGATION',
          'COMPOSTING',
          'RECYCLABLE_DROP',
          'QUIZ_PASS',
          'CAMPAIGN_BONUS',
          'VIOLATION_PENALTY',
          'REDEMPTION',
          'REFERRAL',
        ],
        message: 'Invalid action value',
      },
      required: [true, 'action is required'],
    },
    points: {
      type: Number,
      required: [true, 'points is required'],
    },
    /**
     * metadata — flexible Mixed field to store contextual data.
     * Expected keys (non-exhaustive):
     *   collectorId  {ObjectId}  — who verified the action
     *   qrCode       {String}    — scanned bin/drop-off QR
     *   photoUrl     {String}    — proof-of-action photo
     *   violationId  {ObjectId}  — linked violation (for penalties)
     *   campaignId   {ObjectId}  — linked campaign (for bonuses)
     *   referredUserId {ObjectId}
     */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
pointEventSchema.index({ userId: 1, createdAt: -1 });   // primary query pattern
pointEventSchema.index({ type: 1 });
pointEventSchema.index({ action: 1 });

module.exports = mongoose.model('PointEvent', pointEventSchema);
