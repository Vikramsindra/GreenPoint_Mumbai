require('dotenv').config();
const axios = require('axios');
const User = require('./src/models/User');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const testEndpoint = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Get the BMC collector
    const user = await User.findOne({ phone: '9867512811' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    console.log('✅ Found user:', user.name);

    // Create a token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
    console.log('✅ Created token:', token.substring(0, 30) + '...');

    // Test the endpoint
    const apiURL = 'http://10.147.22.121:5000/api/bmc-collections/points/assigned';
    console.log('\n📍 Testing endpoint:', apiURL);
    
    const response = await axios.get(apiURL, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ API Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.data?.data) {
      console.log('\n📍 Collection Points Found:', response.data.data.length);
      response.data.data.forEach((point, idx) => {
        console.log(`  ${idx + 1}. ${point.name} (${point.type})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
};

testEndpoint();
