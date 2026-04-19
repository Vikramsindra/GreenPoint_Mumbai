// filepath: api/src/models/QuizResult.js
const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  passed: {
    type: Boolean,
    default: false
  },
  pointsAwarded: {
    type: Number,
    default: 0
  },
  answers: {
    type: [Number]
  },
  attemptedAt: {
    type: Date,
    default: Date.now
  }
});

quizResultSchema.index({ userId: 1, campaignId: 1 }, { unique: true });

module.exports = mongoose.model('QuizResult', quizResultSchema);
