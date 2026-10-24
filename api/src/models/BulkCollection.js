// filepath: api/src/models/BulkCollection.js
const mongoose = require('mongoose');

const bulkCollectionSchema = new mongoose.Schema({
  bmcCollectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collectionPointId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollectionPoint',
    default: null
  },
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Society',
    default: null
  },
  outcome: {
    type: String,
    enum: ['SEGREGATED', 'MIXED', 'NO_HANDOVER'],
    default: 'SEGREGATED'
  },
  wasteType: {
    type: String,
    enum: ['wet', 'dry', 'mixed', 'bulk'],
    required: function () {
      return this.outcome !== 'NO_HANDOVER';
    },
    default: null
  },
  weight: {
    type: Number,
    required: function () {
      return this.outcome !== 'NO_HANDOVER';
    },
    min: 0,
    default: 0
  },
  weightBasis: {
    type: String,
    enum: ['ESTIMATED', 'MEASURED'],
    default: 'ESTIMATED'
  },
  pointsAwarded: {
    type: Number,
    default: 0
  },
  pointsReason: {
    type: String,
    default: ''
  },
  requestId: {
    type: String,
    trim: true,
    default: null
  },
  photoUrl: {
    type: String,
    default: null
  },
  wardId: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    default: ''
  },
  location: {
    lat: {
      type: Number,
      default: null
    },
    lng: {
      type: Number,
      default: null
    }
  },
  deviceLocation: {
    lat: {
      type: Number,
      default: null
    },
    lng: {
      type: Number,
      default: null
    },
    isAvailable: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verificationNotes: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

bulkCollectionSchema.index({ bmcCollectorId: 1, timestamp: -1 });
bulkCollectionSchema.index({ collectionPointId: 1, timestamp: -1 });
bulkCollectionSchema.index({ societyId: 1, timestamp: -1 });
bulkCollectionSchema.index({ wardId: 1, timestamp: -1 });
bulkCollectionSchema.index({ status: 1 });
bulkCollectionSchema.index(
  { requestId: 1 },
  { unique: true, partialFilterExpression: { requestId: { $type: 'string' } } }
);

module.exports = mongoose.model('BulkCollection', bulkCollectionSchema);
