// models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // allows multiple docs with no phone without unique-key collision
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
    },
    role: {
      type: String,
      enum: {
        values: ['citizen', 'collector', 'officer'],
        message: 'Role must be citizen, collector, or officer',
      },
      default: 'citizen',
    },
    wardId: {
      type: String,
      trim: true,
    },
    societyId: {
      type: String,
      trim: true,
    },
    pointsBalance: {
      type: Number,
      default: 0,
      min: [0, 'Points balance cannot be negative'],
    },
    violationCount30d: {
      type: Number,
      default: 0,
      min: [0, 'Violation count cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
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
// Note: phone unique index is created automatically by `unique: true` in the schema definition.
userSchema.index({ email: 1 });
userSchema.index({ wardId: 1, role: 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);
