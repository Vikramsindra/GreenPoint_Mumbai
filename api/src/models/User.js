// filepath: api/src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Phone must be 10 digits']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    default: ''
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['citizen', 'collector', 'officer'],
    default: 'citizen'
  },
  collectorId: {
    type: String,
    required: function () { return this.role === 'collector'; },
    trim: true,
    default: null,
    sparse: true
  },
  wardId: {
    type: String,
    default: 'N-WARD',
    trim: true
  },
  societyId: {
    type: String,
    default: '',
    trim: true
  },
  pointsBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  violationCount30d: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ wardId: 1, role: 1 });

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
