// filepath: api/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }

  try {
    const user = await User.findById(decoded.id || decoded._id);
    if (!user || user.isActive === false) {
      return res.status(401).json({ success: false, message: 'Account not found or has been deactivated.' });
    }

    // Populate req.user with current DB role, ward and properties
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      phone: user.phone,
      role: user.role,
      wardId: user.wardId,
      assignedSocietyId: user.assignedSocietyId,
      householdId: user.householdId,
      name: user.name,
      collectorId: user.collectorId
    };
    next();
  } catch (dbErr) {
    return res.status(500).json({ success: false, message: 'Authentication verification failed: ' + dbErr.message });
  }
};

module.exports = auth;
