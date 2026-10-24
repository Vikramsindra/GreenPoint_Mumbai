// filepath: api/src/models/Society.js
const mongoose = require('mongoose');

const societySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120
  },
  address: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 300
  },
  wardId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  representativeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  registrationStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    required: true
  },
  location: {
    lat: {
      type: Number,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  registrationNumber: {
    type: String,
    trim: true,
    default: '',
    maxlength: 50
  },
  collectionPointId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollectionPoint',
    default: null
  },
  qrCode: {
    type: String,
    default: null,
    trim: true
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
  },
  joinCode: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },
  internalCollectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Enforce strictly one society application per representative via unique index
societySchema.index({ representativeId: 1 }, { unique: true });

// Partial unique index for non-null qrCode values
societySchema.index(
  { qrCode: 1 },
  { unique: true, partialFilterExpression: { qrCode: { $type: 'string' } } }
);

// Partial unique index for non-null joinCode values
societySchema.index(
  { joinCode: 1 },
  { unique: true, partialFilterExpression: { joinCode: { $type: 'string' } } }
);

// Partial unique index for non-null internalCollectorId values (1 collector per society, 1 society per collector)
societySchema.index(
  { internalCollectorId: 1 },
  { unique: true, partialFilterExpression: { internalCollectorId: { $type: 'objectId' } } }
);

// Query optimization indexes
societySchema.index({ wardId: 1, registrationStatus: 1 });
societySchema.index(
  { collectionPointId: 1 },
  { unique: true, partialFilterExpression: { collectionPointId: { $type: 'objectId' } } }
);

module.exports = mongoose.model('Society', societySchema);
