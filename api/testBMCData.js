require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const BulkCollection = require('./src/models/BulkCollection');
const CollectionPoint = require('./src/models/CollectionPoint');

const testBMCEndpoints = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find Shri (BMC Collector)
    const shri = await User.findOne({ phone: '9867512811' });
    console.log(`\n👤 Testing with BMC Collector: ${shri.name}`);
    console.log(`   User ID: ${shri._id}`);

    // Test 1: Get assigned collection points
    console.log('\n📍 Test 1: Assigned Collection Points');
    const points = await CollectionPoint.find({ 
      assignedCollectorId: shri._id,
      isActive: true 
    });
    console.log(`   ✅ Found ${points.length} collection points`);
    points.forEach((p, i) => {
      console.log(`      ${i+1}. ${p.name} (${p.type})`);
    });

    // Test 2: Get today's collections
    console.log('\n📊 Test 2: Today\'s Collections');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCollections = await BulkCollection.find({
      bmcCollectorId: shri._id,
      timestamp: { $gte: today }
    }).populate('collectionPointId', 'name');
    console.log(`   ✅ Found ${todayCollections.length} collections today`);
    const todayWeight = todayCollections.reduce((sum, c) => sum + c.weight, 0);
    console.log(`   ✅ Total weight: ${todayWeight} kg`);
    const todayPoints = new Set(todayCollections.map(c => c.collectionPointId._id.toString())).size;
    console.log(`   ✅ Points covered: ${todayPoints}`);

    // Test 3: Get all collections (last 7 days)
    console.log('\n📋 Test 3: Collection History (Last 7 Days)');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const allCollections = await BulkCollection.find({
      bmcCollectorId: shri._id,
      timestamp: { $gte: sevenDaysAgo }
    }).populate('collectionPointId', 'name').sort({ timestamp: -1 });
    
    console.log(`   ✅ Found ${allCollections.length} collections in last 7 days`);
    
    // Group by date
    const groupedByDate = {};
    allCollections.forEach(c => {
      const date = new Date(c.timestamp).toDateString();
      if (!groupedByDate[date]) groupedByDate[date] = [];
      groupedByDate[date].push(c);
    });
    
    Object.entries(groupedByDate).forEach(([date, collections]) => {
      const weight = collections.reduce((sum, c) => sum + c.weight, 0);
      console.log(`      📅 ${date}: ${collections.length} collections, ${weight} kg`);
    });

    // Test 4: Verify collection point status
    console.log('\n✔️ Test 4: Collection Point Status (Today)');
    const pointStatus = await Promise.all(
      points.map(async (point) => {
        const todayCollection = await BulkCollection.findOne({
          collectionPointId: point._id,
          bmcCollectorId: shri._id,
          timestamp: { $gte: today }
        });
        return {
          name: point.name,
          status: todayCollection ? 'completed' : 'pending'
        };
      })
    );
    
    let completed = 0, pending = 0;
    pointStatus.forEach(p => {
      const icon = p.status === 'completed' ? '✅' : '⏳';
      console.log(`      ${icon} ${p.name}: ${p.status}`);
      if (p.status === 'completed') completed++;
      else pending++;
    });
    console.log(`      Summary: ${completed} completed, ${pending} pending`);

    // Test 5: Waste type breakdown
    console.log('\n🗑️ Test 5: Waste Type Breakdown');
    const wasteBreakdown = {};
    allCollections.forEach(c => {
      wasteBreakdown[c.wasteType] = (wasteBreakdown[c.wasteType] || 0) + 1;
    });
    Object.entries(wasteBreakdown).forEach(([type, count]) => {
      console.log(`      ${type.toUpperCase()}: ${count} collections`);
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📱 The BMC collector dashboard should now display:');
    console.log(`   • ${points.length} collection points`);
    console.log(`   • ${allCollections.length} historical collections`);
    console.log(`   • ${todayCollections.length} collections today`);
    console.log(`   • ${todayWeight} kg collected today`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }
};

testBMCEndpoints();
