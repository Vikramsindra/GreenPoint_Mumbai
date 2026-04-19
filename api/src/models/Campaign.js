// filepath: api/src/models/Campaign.js
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  wardId: {
    type: String,
    required: true,
    default: 'N-WARD'
  },
  type: {
    type: String,
    enum: ['AWARENESS', 'CHALLENGE', 'QUIZ'],
    default: 'QUIZ'
  },
  bonusPoints: {
    type: Number,
    default: 25,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  quizQuestions: [{
    question: String,
    options: {
      type: [String],
      validate: [arrayLimit, '{PATH} exceeds the limit of 4']
    },
    correctIndex: {
      type: Number,
      min: 0,
      max: 3
    }
  }],
  participantCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

function arrayLimit(val) {
  return val.length === 4;
}

campaignSchema.virtual('isLive').get(function() {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
});

campaignSchema.set('toJSON', { virtuals: true });
campaignSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Campaign', campaignSchema);
