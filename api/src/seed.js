// filepath: api/src/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Campaign = require('./models/Campaign');
const PointEvent = require('./models/PointEvent');
const Violation = require('./models/Violation');
const QuizResult = require('./models/QuizResult');
const Household = require('./models/Household');
const CollectionPoint = require('./models/CollectionPoint');
const BulkCollection = require('./models/BulkCollection');
const connectDB = require('./config/db');
const { generateQRCodeString, generateQRCodeImage } = require('./utils/qrGenerator');

// Helper: date N days ago
const daysAgo = (n, hours = 8) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hours, Math.floor(Math.random() * 60), 0, 0);
  return d;
};

// Helper: today at specific hour
const todayAt = (hours) => {
  const d = new Date();
  d.setHours(hours, Math.floor(Math.random() * 60), 0, 0);
  return d;
};

const SEED = async () => {
  await connectDB();

  try {
    console.log('🗑️  Clearing existing data...');
    await QuizResult.deleteMany({});
    await Violation.deleteMany({});
    await PointEvent.deleteMany({});
    await Campaign.deleteMany({});
    await BulkCollection.deleteMany({});
    await CollectionPoint.deleteMany({});
    await Household.deleteMany({});
    await User.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const officer = await User.create({ name: 'Rajesh Patil', phone: '9876543210', passwordHash, role: 'officer', wardId: 'N-WARD' });
    const collector1 = await User.create({ name: 'Ramesh Yadav', phone: '9876543211', passwordHash, role: 'collector', wardId: 'N-WARD', collectorId: 'COL1001' });
    const collector2 = await User.create({ name: 'Suresh Kamble', phone: '9876543212', passwordHash, role: 'collector', wardId: 'N-WARD', collectorId: 'COL1002' });

    const citizenData = [
      // SUNRISE APARTMENTS (10 flats)
      { name: 'Priya Sharma', phone: '9876543220', societyId: 'SUNRISE-APT', flat: 'Flat 1A, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Aarav Mehta', phone: '9876543221', societyId: 'SUNRISE-APT', flat: 'Flat 2B, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Anjali Nair', phone: '9876543222', societyId: 'SUNRISE-APT', flat: 'Flat 3A, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Riya Singh', phone: '9876543223', societyId: 'SUNRISE-APT', flat: 'Flat 4B, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Neha Kapoor', phone: '9876543224', societyId: 'SUNRISE-APT', flat: 'Flat 5C, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Amit Verma', phone: '9876543225', societyId: 'SUNRISE-APT', flat: 'Flat 6A, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Deepa Iyer', phone: '9876543226', societyId: 'SUNRISE-APT', flat: 'Flat 7B, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Sanjay Tiwari', phone: '9876543227', societyId: 'SUNRISE-APT', flat: 'Flat 8C, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Kavita Rane', phone: '9876543228', societyId: 'SUNRISE-APT', flat: 'Flat 9A, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Rahul Deshpande', phone: '9876543229', societyId: 'SUNRISE-APT', flat: 'Flat 10B, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      // GREEN VALLEY CHS (10 flats)
      { name: 'Sneha Desai', phone: '9876543230', societyId: 'GREEN-VALLEY', flat: 'Flat 101, Green Valley CHS, Vikhroli West' },
      { name: 'Rohit Kulkarni', phone: '9876543231', societyId: 'GREEN-VALLEY', flat: 'Flat 102, Green Valley CHS, Vikhroli West' },
      { name: 'Manish Gupta', phone: '9876543232', societyId: 'GREEN-VALLEY', flat: 'Flat 103, Green Valley CHS, Vikhroli West' },
      { name: 'Sunita Pawar', phone: '9876543233', societyId: 'GREEN-VALLEY', flat: 'Flat 201, Green Valley CHS, Vikhroli West' },
      { name: 'Nitin Jog', phone: '9876543234', societyId: 'GREEN-VALLEY', flat: 'Flat 202, Green Valley CHS, Vikhroli West' },
      { name: 'Meera Bhatt', phone: '9876543235', societyId: 'GREEN-VALLEY', flat: 'Flat 203, Green Valley CHS, Vikhroli West' },
      { name: 'Anil Sawant', phone: '9876543236', societyId: 'GREEN-VALLEY', flat: 'Flat 301, Green Valley CHS, Vikhroli West' },
      { name: 'Rekha Shetty', phone: '9876543237', societyId: 'GREEN-VALLEY', flat: 'Flat 302, Green Valley CHS, Vikhroli West' },
      { name: 'Vikas Dhuri', phone: '9876543238', societyId: 'GREEN-VALLEY', flat: 'Flat 303, Green Valley CHS, Vikhroli West' },
      { name: 'Pallavi More', phone: '9876543239', societyId: 'GREEN-VALLEY', flat: 'Flat 401, Green Valley CHS, Vikhroli West' },
      // SHIVAJI NAGAR (10 flats)
      { name: 'Vikram Joshi', phone: '9876543240', societyId: 'SHIVAJI-NAGAR', flat: 'Flat A1, Shivaji Nagar CHS, Govandi' },
      { name: 'Pooja Patel', phone: '9876543241', societyId: 'SHIVAJI-NAGAR', flat: 'Flat A2, Shivaji Nagar CHS, Govandi' },
      { name: 'Karan Thakur', phone: '9876543242', societyId: 'SHIVAJI-NAGAR', flat: 'Flat B1, Shivaji Nagar CHS, Govandi' },
      { name: 'Swati Naik', phone: '9876543243', societyId: 'SHIVAJI-NAGAR', flat: 'Flat B2, Shivaji Nagar CHS, Govandi' },
      { name: 'Ganesh Mhatre', phone: '9876543244', societyId: 'SHIVAJI-NAGAR', flat: 'Flat C1, Shivaji Nagar CHS, Govandi' },
      { name: 'Lata Shirke', phone: '9876543245', societyId: 'SHIVAJI-NAGAR', flat: 'Flat C2, Shivaji Nagar CHS, Govandi' },
      { name: 'Tushar Gaikwad', phone: '9876543246', societyId: 'SHIVAJI-NAGAR', flat: 'Flat D1, Shivaji Nagar CHS, Govandi' },
      { name: 'Bhavna Shah', phone: '9876543247', societyId: 'SHIVAJI-NAGAR', flat: 'Flat D2, Shivaji Nagar CHS, Govandi' },
      { name: 'Sachin Jadhav', phone: '9876543248', societyId: 'SHIVAJI-NAGAR', flat: 'Flat E1, Shivaji Nagar CHS, Govandi' },
      { name: 'Nisha Pandey', phone: '9876543249', societyId: 'SHIVAJI-NAGAR', flat: 'Flat E2, Shivaji Nagar CHS, Govandi' },
    ];

    const citizens = await User.insertMany(
      citizenData.map(c => ({
        name: c.name, phone: c.phone, passwordHash,
        role: 'citizen', wardId: 'N-WARD', societyId: c.societyId,
        pointsBalance: 0, violationCount30d: 0
      }))
    );

    console.log(`✅ Created ${citizens.length} citizens + 2 collectors + 1 officer`);

    // ═══════════════════════════════════════════════════════════
    // 2. HOUSEHOLDS with QR codes
    // ═══════════════════════════════════════════════════════════
    console.log('🏠 Creating households...');
    const households = [];
    for (let i = 0; i < citizens.length; i++) {
      const qrCode = generateQRCodeString();
      const qrImageUrl = await generateQRCodeImage(qrCode);
      const hh = await Household.create({
        citizenId: citizens[i]._id,
        address: citizenData[i].flat,
        wardId: 'N-WARD',
        societyId: citizenData[i].societyId,
        qrCode, qrImageUrl,
        isActive: true,
        totalScans: 0,
      });
      households.push(hh);
      await User.findByIdAndUpdate(citizens[i]._id, { householdId: hh._id });
    }
    console.log(`✅ Created ${households.length} households with QR codes`);
    // Log QR codes for testing
    households.forEach((h, i) => {
      console.log(`   Household ${i + 1}: ${h.qrCode} — ${h.address.split(',')[0]}`);
    });

    // ═══════════════════════════════════════════════════════════
    // 3. CAMPAIGNS & QUIZZES
    // ═══════════════════════════════════════════════════════════
    console.log('📢 Creating campaigns...');
    const now = new Date();
    const startDate = new Date(now); startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(now); endDate.setDate(endDate.getDate() + 23);

    const c1 = await Campaign.create({
      title: 'Know Your Waste', description: 'Learn the basics of waste segregation in Mumbai.',
      wardId: 'N-WARD', type: 'QUIZ', bonusPoints: 25, startDate, endDate, createdBy: officer._id,
      quizQuestions: [
        { question: 'Which bin should vegetable peels go in?', options: ['Blue (Dry)', 'Green (Wet)', 'Red (Hazardous)', 'Black (E-waste)'], correctIndex: 1 },
        { question: 'Where should expired medicines be disposed?', options: ['Wet bin', 'Dry bin', 'Hazardous waste bin', 'Flush down drain'], correctIndex: 2 },
        { question: 'Which is NOT recyclable in the dry bin?', options: ['Plastic bottles', 'Newspaper', 'Pizza box with stains', 'Glass jar'], correctIndex: 2 },
        { question: 'Old phones should go to?', options: ['Dry bin', 'Kabadiwala', 'E-waste centre', 'Wet bin'], correctIndex: 2 },
        { question: 'Sanitary waste should be?', options: ['Wet bin', 'Mixed dry', 'Wrapped & handed to BMC', 'Flushed'], correctIndex: 2 },
      ]
    });

    const c2 = await Campaign.create({
      title: 'Plastic-Free Week Challenge', description: 'Test your knowledge on plastic recycling.',
      wardId: 'N-WARD', type: 'QUIZ', bonusPoints: 50, startDate, endDate, createdBy: officer._id,
      quizQuestions: [
        { question: 'Most recyclable plastic type?', options: ['PET (type 1)', 'Plastic bags', 'Styrofoam', 'Multi-layer'], correctIndex: 0 },
        { question: 'Mumbai daily solid waste?', options: ['1,000 MT', '3,500 MT', '7,000 MT', '12,000 MT'], correctIndex: 2 },
        { question: 'SWM Rules 2016 first step?', options: ['Call BMC', 'Segregate at source', 'Hire private', 'Use plastic bags'], correctIndex: 1 },
        { question: 'Deonar landfill capacity?', options: ['50%', '100%', '200%', '300%'], correctIndex: 3 },
        { question: 'Composting reduces landfill by?', options: ['5-10%', '30-40%', '60-70%', '90%+'], correctIndex: 1 },
      ]
    });

    console.log('Creating points, violations and quiz results...');

    // Priya Sharma
    await PointEvent.create({ userId: citizens[0]._id, type: 'EARN', action: 'SEGREGATION', points: 10, description: 'Daily segregation at pickup' });
    await PointEvent.create({ userId: citizens[0]._id, type: 'EARN', action: 'COMPOSTING', points: 20, description: 'Weekly home composting' });
    await PointEvent.create({ userId: citizens[0]._id, type: 'EARN', action: 'QUIZ_PASS', points: 25, description: `Quiz passed: ${c1.title}`, metadata: { campaignId: c1._id } });
    await QuizResult.create({ userId: citizens[0]._id, campaignId: c1._id, score: 100, passed: true, pointsAwarded: 25, answers: [1, 2, 2, 2, 2] });
    await Violation.create({ citizenId: citizens[0]._id, collectorId: collector1._id, type: 'NON_SEGREGATION', tier: 1, offenceCountInWindow: 1, status: 'PENDING', pointsDeducted: 20, createdAt: new Date(Date.now() - 3 * 86400000) });
    await PointEvent.create({ userId: citizens[0]._id, type: 'DEDUCT', action: 'VIOLATION_PENALTY', points: 20, description: 'Violation: NON_SEGREGATION' });
    await User.findByIdAndUpdate(citizens[0]._id, { pointsBalance: 35, violationCount30d: 1 });

    // Aarav Mehta
    await PointEvent.create({ userId: citizens[1]._id, type: 'EARN', action: 'SEGREGATION', points: 10, description: 'Daily segregation at pickup' });
    await PointEvent.create({ userId: citizens[1]._id, type: 'EARN', action: 'RECYCLABLE_DROP', points: 5, description: 'Recyclable drop at kiosk' });
    await PointEvent.create({ userId: citizens[1]._id, type: 'EARN', action: 'QUIZ_PASS', points: 25, description: `Quiz passed: ${c1.title}`, metadata: { campaignId: c1._id } });
    await QuizResult.create({ userId: citizens[1]._id, campaignId: c1._id, score: 80, passed: true, pointsAwarded: 25, answers: [1, 2, 2, 2, 0] });
    await User.findByIdAndUpdate(citizens[1]._id, { pointsBalance: 40 });

    // Rohit Kulkarni
    await PointEvent.create({ userId: citizens[3]._id, type: 'EARN', action: 'SEGREGATION', points: 10, description: 'Daily segregation at pickup' });
    await Violation.create({ citizenId: citizens[3]._id, collectorId: collector2._id, type: 'LITTERING', tier: 2, offenceCountInWindow: 1, status: 'FINE_ISSUED', fineAmount: 500, pointsDeducted: 100, createdAt: new Date(Date.now() - 5 * 86400000) });
    await PointEvent.create({ userId: citizens[3]._id, type: 'DEDUCT', action: 'VIOLATION_PENALTY', points: 10, description: 'Violation: LITTERING' });
    await User.findByIdAndUpdate(citizens[3]._id, { pointsBalance: 0, violationCount30d: 1 });

    // Karan Thakur
    await Violation.create({ citizenId: citizens[9]._id, collectorId: collector1._id, type: 'NON_SEGREGATION', tier: 1, offenceCountInWindow: 1, status: 'APPEALED', pointsDeducted: 20, appealText: 'I did segregate — the collector made a mistake. I have witnesses.', appealSubmittedAt: new Date(Date.now() - 2 * 86400000), createdAt: new Date(Date.now() - 4 * 86400000) });
    await PointEvent.create({ userId: citizens[9]._id, type: 'DEDUCT', action: 'VIOLATION_PENALTY', points: 0, description: 'Violation: NON_SEGREGATION' });
    await User.findByIdAndUpdate(citizens[9]._id, { violationCount30d: 1 });

    // Manish Gupta
    await Violation.create({ citizenId: citizens[7]._id, collectorId: collector2._id, type: 'BURNING', tier: 3, offenceCountInWindow: 1, status: 'FINE_ISSUED', fineAmount: 1000, pointsDeducted: 150, createdAt: new Date(Date.now() - 7 * 86400000) });
    await PointEvent.create({ userId: citizens[7]._id, type: 'DEDUCT', action: 'VIOLATION_PENALTY', points: 0, description: 'Violation: BURNING' });
    await User.findByIdAndUpdate(citizens[7]._id, { violationCount30d: 1 });

    // Vikram Joshi
    await PointEvent.create({ userId: citizens[5]._id, type: 'EARN', action: 'SEGREGATION', points: 10, description: 'Daily segregation at pickup' });
    await Violation.create({ citizenId: citizens[5]._id, collectorId: collector1._id, type: 'NON_SEGREGATION', tier: 1, offenceCountInWindow: 1, status: 'RESOLVED', pointsDeducted: 20, resolutionOutcome: 'DISMISSED', resolvedBy: officer._id, resolvedAt: new Date(Date.now() - 86400000), createdAt: new Date(Date.now() - 6 * 86400000) });
    // Penalty deducted and then reverted
    await PointEvent.create({ userId: citizens[5]._id, type: 'DEDUCT', action: 'VIOLATION_PENALTY', points: 10, description: 'Violation: NON_SEGREGATION' });
    await PointEvent.create({ userId: citizens[5]._id, type: 'EARN', action: 'REVERSAL', points: 10, description: 'Appeal upheld — points restored' });
    await User.findByIdAndUpdate(citizens[5]._id, { pointsBalance: 10, violationCount30d: 0 });

    const totalUsers = await User.countDocuments();
    const totalCampaigns = await Campaign.countDocuments();
    const totalPointEvents = await PointEvent.countDocuments();
    const totalViolations = await Violation.countDocuments();
    const totalQuizResults = await QuizResult.countDocuments();
    const totalHouseholds = await Household.countDocuments();

    console.log(`\n✅ Seed completed successfully!`);
    console.log(`- Users: ${totalUsers}`);
    console.log(`- Households: ${totalHouseholds}`);
    console.log(`- Campaigns: ${totalCampaigns}`);
    console.log(`- PointEvents: ${totalPointEvents}`);
    console.log(`- Violations: ${totalViolations}`);
    console.log(`- QuizResults: ${totalQuizResults}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

SEED();
