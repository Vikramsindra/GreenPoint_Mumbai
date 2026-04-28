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
    required: true
  },
  wasteType: {
    type: String,
    enum: ['wet', 'dry', 'mixed', 'bulk'],
    required: true
  },
  weight: {
    type: Number,
    required: true,
    min: 0
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
bulkCollectionSchema.index({ wardId: 1, timestamp: -1 });
bulkCollectionSchema.index({ status: 1 });

module.exports = mongoose.model('BulkCollection', bulkCollectionSchema);
