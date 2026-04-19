// models/QuizResult.js

const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'campaignId is required'],
    },
    score: {
      type: Number,
      required: [true, 'score is required'],
      min: [0, 'Score must be between 0 and 100'],
      max: [100, 'Score must be between 0 and 100'],
    },
    passed: {
      type: Boolean,
      required: [true, 'passed flag is required'],
    },
    pointsAwarded: {
      type: Number,
      default: 0,
      min: [0, 'Points awarded cannot be negative'],
    },
    attemptedAt: {
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
quizResultSchema.index({ userId: 1, campaignId: 1 });    // fast lookup per user per quiz
quizResultSchema.index({ campaignId: 1, passed: 1 });    // leaderboard / pass-rate queries
quizResultSchema.index({ attemptedAt: -1 });

module.exports = mongoose.model('QuizResult', quizResultSchema);
