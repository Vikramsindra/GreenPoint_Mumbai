const mongoose = require('mongoose');

const collectionPointSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['society', 'public_bin', 'transfer_station'],
    required: true
  },
  location: {
    lat: {
      type: Number,
      required: false
    },
    lng: {
      type: Number,
      required: false
    }
  },
  address: {
    type: String,
    default: ''
  },
  wardId: {
    type: String,
    required: true,
    trim: true
  },
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Society',
    default: null
  },
  assignedCollectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  contactPerson: {
    type: String,
    default: ''
  },
  contactPhone: {
    type: String,
    default: ''
  },
  lastCollectionAt: {
    type: Date,
    default: null
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

collectionPointSchema.index({ wardId: 1, type: 1 });
collectionPointSchema.index({ assignedCollectorId: 1 });
collectionPointSchema.index({ isActive: 1 });
collectionPointSchema.index(
  { societyId: 1 },
  { unique: true, partialFilterExpression: { societyId: { $type: 'objectId' } } }
);

module.exports = mongoose.model('CollectionPoint', collectionPointSchema);
