// models/Campaign.js

const mongoose = require('mongoose');

/**
 * Sub-schema for individual quiz questions.
 * Only populated when Campaign.type === 'QUIZ'.
 */
const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    options: {
      type: [String],
      validate: {
        validator: (arr) => arr.length === 4,
        message: 'Each quiz question must have exactly 4 options',
      },
    },
    /** 0-indexed position of the correct option in the options array */
    correctIndex: { type: Number, min: 0, max: 3, required: true },
  },
  { _id: false } // embedded sub-docs don't need their own _id
);

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Campaign title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    wardId: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['AWARENESS', 'CHALLENGE', 'QUIZ'],
        message: 'Campaign type must be AWARENESS, CHALLENGE, or QUIZ',
      },
      required: [true, 'Campaign type is required'],
    },
    bonusPoints: {
      type: Number,
      default: 0,
      min: [0, 'Bonus points cannot be negative'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    /**
     * Embedded quiz questions — required when type === 'QUIZ'.
     * Stored here so the quiz is self-contained within the campaign document.
     * Max 10 questions per campaign (5 is the standard for GreenPoint quizzes).
     */
    quizQuestions: {
      type: [quizQuestionSchema],
      default: [],
      // Max 10 questions per campaign — QUIZ minimum enforced in pre-validate hook below
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'A campaign cannot have more than 10 quiz questions',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'createdBy is required'],
    },
  },
  {
    strict: true,
    versionKey: false,
  }
);

// Ensure endDate > startDate and QUIZ campaigns have at least 1 question.
// Using async pre-validate (no `next` param) — compatible with Mongoose 8/9 insertMany.
campaignSchema.pre('validate', async function () {
  if (this.endDate && this.startDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'endDate must be after startDate');
  }
  if (this.type === 'QUIZ' && (!this.quizQuestions || this.quizQuestions.length === 0)) {
    this.invalidate('quizQuestions', 'QUIZ campaigns must have at least 1 question');
  }
});

// Indexes
campaignSchema.index({ wardId: 1, isActive: 1 });
campaignSchema.index({ type: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
