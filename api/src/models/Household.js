// filepath: api/src/models/Household.js
const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  wardId: {
    type: String,
    required: true,
    default: 'N-WARD'
  },
  societyId: {
    type: String,
    default: ''
  },
  qrCode: {
    type: String,
    unique: true,
    required: true
  },
  qrImageUrl: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastScannedAt: {
    type: Date
  },
  lastScannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  totalScans: {
    type: Number,
    default: 0
  },
  streakDays: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

householdSchema.index({ citizenId: 1 });
householdSchema.index({ wardId: 1 });

module.exports = mongoose.model('Household', householdSchema);
