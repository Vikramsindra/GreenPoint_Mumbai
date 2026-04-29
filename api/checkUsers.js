const mongoose = require('mongoose');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/greenpoint');
    console.log('✅ Connected to MongoDB');
    
    const User = require('./src/models/User');
    const users = await User.find({}).select('-passwordHash');
    
    console.log('\n📊 Users found:', users.length);
    
    if (users.length > 0) {
      console.log('\n📋 User List:');
      users.forEach((u, i) => {
        console.log(`  ${i+1}. Phone: ${u.phone}, Name: ${u.name}, Role: ${u.role}`);
      });
    } else {
      console.log('\n❌ No users in database - you need to register first');
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkUsers();
