// filepath: api/src/config/db.js
const mongoose = require('mongoose');

const connectDB = async (options = {}) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  try {
    const dbName = options.dbName || process.env.MONGO_DB_NAME;
    await mongoose.connect(process.env.MONGO_URI, {
      ...(dbName ? { dbName } : {})
    });
    console.log(`✅ MongoDB connected${dbName ? ` (database: ${dbName})` : ''}`);
    return mongoose.connection;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw err;
  }
};

module.exports = connectDB;
