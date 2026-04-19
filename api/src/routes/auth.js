// filepath: api/src/routes/auth.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  phone: Joi.string().pattern(/^\d{10}$/).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('citizen', 'collector', 'officer').default('citizen'),
  collectorId: Joi.when('role', {
    is: 'collector',
    then: Joi.string().min(3).required(),
    otherwise: Joi.string().allow('')
  }),
  wardId: Joi.string().default('N-WARD')
});

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { name, phone, password, role, collectorId, wardId } = req.body;
    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Phone number already registered' });
    }

    // Validate collectorId is provided for collector role
    if (role === 'collector' && !collectorId) {
      return res.status(400).json({ success: false, message: 'BMC Collector ID is required for collector registration' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userData = { name, phone, passwordHash, role, wardId };
    if (role === 'collector') {
      userData.collectorId = collectorId;
    }

    const user = new User(userData);
    await user.save();

    const token = jwt.sign(
      { id: user._id, phone: user.phone, role: user.role, wardId: user.wardId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({ success: true, data: { token, user: user.toSafeObject() }, message: 'Registration successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
  }
});

const loginSchema = Joi.object({
  phone: Joi.string().required(),
  password: Joi.string().required()
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, phone: user.phone, role: user.role, wardId: user.wardId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ success: true, data: { token, user: user.toSafeObject() }, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed: ' + error.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -__v');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user, message: 'Profile fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

const updateSchema = Joi.object({
  name: Joi.string().min(2),
  email: Joi.string().email().allow(''),
  societyId: Joi.string().allow('')
});

router.put('/me', auth, validate(updateSchema), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { $set: req.body }, { new: true }).select('-passwordHash -__v');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user, message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

module.exports = router;
