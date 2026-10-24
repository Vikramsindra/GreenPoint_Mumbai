// filepath: api/src/models/SocietyMembership.js
const mongoose = require('mongoose');

const societyMembershipSchema = new mongoose.Schema({
  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Society',
    required: true
  },
  address: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 300
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    required: true
  },
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Household',
    default: null
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNote: {
    type: String,
    trim: true,
    default: '',
    maxlength: 500
  }
}, {
  timestamps: true
});

// A citizen can only have one active/pending membership at a time
societyMembershipSchema.index({ citizenId: 1, status: 1 });
societyMembershipSchema.index({ societyId: 1, status: 1 });
societyMembershipSchema.index({ citizenId: 1, societyId: 1 });

module.exports = mongoose.model('SocietyMembership', societyMembershipSchema);
