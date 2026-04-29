require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const CollectionPoint = require('./src/models/CollectionPoint');
const BulkCollection = require('./src/models/BulkCollection');

const seedBMCData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find the BMC collector "Shri"
    const bmcCollector = await User.findOne({ phone: '9867512811' });
    if (!bmcCollector) {
      console.log('❌ BMC Collector "Shri" not found');
      process.exit(1);
    }
    console.log(`✅ Found BMC Collector: ${bmcCollector.name} (${bmcCollector._id})`);

    // Collection points to create - assigned to this collector
    const collectionPoints = [
      {
        name: 'Shivaji Society Dry Waste Bin',
        type: 'society',
        location: { lat: 19.0844, lng: 72.8846 },
        address: 'Shivaji Park Society, Dadar East, Mumbai',
        wardId: 'N-WARD',
        contactPerson: 'Mr. Patil',
        contactPhone: '9876543210'
      },
      {
        name: 'Dadar West Public Bin',
        type: 'public_bin',
        location: { lat: 19.0176, lng: 72.8194 },
        address: 'Dadar West Circle, Mumbai',
        wardId: 'N-WARD',
        contactPerson: 'BMC Staff',
        contactPhone: '1916'
      },
      {
        name: 'Marine Lines Transfer Station',
        type: 'transfer_station',
        location: { lat: 18.9679, lng: 72.8194 },
        address: 'Near Marine Drive, Mumbai',
        wardId: 'N-WARD',
        contactPerson: 'Suresh Singh',
        contactPhone: '9876543245'
      },
      {
        name: 'Malabar Hill Society Waste Hub',
        type: 'society',
        location: { lat: 18.9586, lng: 72.8195 },
        address: 'Malabar Hill, Mumbai',
        wardId: 'N-WARD',
        contactPerson: 'Ms. Sharma',
        contactPhone: '9876543235'
      },
      {
        name: 'Worli Public Dump',
        type: 'public_bin',
        location: { lat: 19.0176, lng: 72.8254 },
        address: 'Worli Sea Face, Mumbai',
        wardId: 'N-WARD',
        contactPerson: 'BMC Staff',
        contactPhone: '1916'
      }
    ];

    // Delete existing collection points for this collector
    await CollectionPoint.deleteMany({ assignedCollectorId: bmcCollector._id });
    console.log('🗑️  Cleared previous collection points');

    // Create collection points
    const createdPoints = [];
    for (const point of collectionPoints) {
      const cp = new CollectionPoint({
        ...point,
        assignedCollectorId: bmcCollector._id,
        isActive: true
      });
      await cp.save();
      createdPoints.push(cp);
    }
    console.log(`✅ Created ${createdPoints.length} collection points`);

    // Delete existing collections for this collector
    await BulkCollection.deleteMany({ bmcCollectorId: bmcCollector._id });
    console.log('🗑️  Cleared previous collections');

    // Generate collections for past 7 days
    const collections = [];
    const today = new Date();
    const wasteTypes = ['wet', 'dry', 'mixed', 'bulk'];
    
    // Generate 3-5 collections per day
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const collectionDate = new Date(today);
      collectionDate.setDate(collectionDate.getDate() - dayOffset);
      
      // Random number of collections for this day (3-5)
      const collectionsPerDay = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < collectionsPerDay; i++) {
        const pointIndex = Math.floor(Math.random() * createdPoints.length);
        const wasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
        
        // Weight varies by waste type
        let weight;
        if (wasteType === 'wet') weight = Math.floor(Math.random() * 15) + 10; // 10-25kg
        else if (wasteType === 'dry') weight = Math.floor(Math.random() * 12) + 5; // 5-17kg
        else if (wasteType === 'mixed') weight = Math.floor(Math.random() * 20) + 15; // 15-35kg
        else weight = Math.floor(Math.random() * 50) + 30; // 30-80kg for bulk
        
        // Random time during day
        const hour = Math.floor(Math.random() * 8) + 7; // 7 AM to 3 PM
        const minute = Math.floor(Math.random() * 60);
        collectionDate.setHours(hour, minute, 0, 0);
        
        const collection = new BulkCollection({
          bmcCollectorId: bmcCollector._id,
          collectionPointId: createdPoints[pointIndex]._id,
          wasteType,
          weight,
          wardId: 'N-WARD',
          notes: `Regular collection from ${createdPoints[pointIndex].name}`,
          status: Math.random() > 0.15 ? 'verified' : 'pending', // 85% verified
          timestamp: new Date(collectionDate),
          location: {
            lat: createdPoints[pointIndex].location.lat,
            lng: createdPoints[pointIndex].location.lng
          }
        });
        collections.push(collection);
      }
    }

    // Save all collections
    await BulkCollection.insertMany(collections);
    console.log(`✅ Created ${collections.length} collection records`);

    // Update collection points with last collection timestamp
    for (const point of createdPoints) {
      const lastCollection = collections.filter(
        c => c.collectionPointId.toString() === point._id.toString()
      ).sort((a, b) => b.timestamp - a.timestamp)[0];
      
      if (lastCollection) {
        await CollectionPoint.findByIdAndUpdate(point._id, {
          lastCollectionAt: lastCollection.timestamp
        });
      }
    }
    console.log('✅ Updated collection points with last collection timestamps');

    // Display summary
    console.log('\n📊 SEEDING COMPLETE - Summary:');
    console.log(`   BMC Collector: ${bmcCollector.name}`);
    console.log(`   Collection Points: ${createdPoints.length}`);
    console.log(`   Total Collections: ${collections.length}`);
    
    // Calculate stats
    let totalWeight = 0;
    let todayCollections = 0;
    const today_start = new Date();
    today_start.setHours(0, 0, 0, 0);
    
    collections.forEach(c => {
      totalWeight += c.weight;
      if (c.timestamp >= today_start) todayCollections++;
    });
    
    console.log(`   Total Weight: ${totalWeight} kg`);
    console.log(`   Today's Collections: ${todayCollections}`);
    
    // Show waste type breakdown
    const wasteBreakdown = {};
    collections.forEach(c => {
      wasteBreakdown[c.wasteType] = (wasteBreakdown[c.wasteType] || 0) + 1;
    });
    console.log(`   Waste Type Breakdown:`, wasteBreakdown);
    
    console.log('\n✅ Database seeding successful! The BMC collector dashboard is now populated with sample data.');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

seedBMCData();
