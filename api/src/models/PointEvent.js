// filepath: api/src/models/PointEvent.js
const mongoose = require('mongoose');

const pointEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['EARN', 'DEDUCT'],
    required: true
  },
  action: {
    type: String,
    enum: ['SEGREGATION', 'COMPOSTING', 'RECYCLABLE_DROP', 'QUIZ_PASS', 'CAMPAIGN_BONUS', 'VIOLATION_PENALTY', 'REDEMPTION', 'REFERRAL', 'REVERSAL'],
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

pointEventSchema.index({ userId: 1, createdAt: -1 });
pointEventSchema.index({ userId: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('PointEvent', pointEventSchema);
