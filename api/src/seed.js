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
    await Household.deleteMany({});
    await User.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // ═══════════════════════════════════════════════════════════
    // 1. USERS
    // ═══════════════════════════════════════════════════════════
    console.log('👤 Creating users...');

    const officer = await User.create({
      name: 'Rajesh Patil', phone: '9876543210', passwordHash,
      role: 'officer', wardId: 'N-WARD'
    });

    const collector1 = await User.create({
      name: 'Ramesh Yadav', phone: '9876543211', passwordHash,
      role: 'collector', wardId: 'N-WARD', collectorId: 'COL1001'
    });
    const collector2 = await User.create({
      name: 'Suresh Kamble', phone: '9876543212', passwordHash,
      role: 'collector', wardId: 'N-WARD', collectorId: 'COL1002'
    });

    const citizenData = [
      // SUNRISE APARTMENTS (10 flats)
      { name: 'Priya Sharma',    phone: '9876543220', societyId: 'SUNRISE-APT', flat: 'Flat 1A, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Aarav Mehta',     phone: '9876543221', societyId: 'SUNRISE-APT', flat: 'Flat 2B, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Anjali Nair',     phone: '9876543222', societyId: 'SUNRISE-APT', flat: 'Flat 3A, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Riya Singh',      phone: '9876543223', societyId: 'SUNRISE-APT', flat: 'Flat 4B, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Neha Kapoor',     phone: '9876543224', societyId: 'SUNRISE-APT', flat: 'Flat 5C, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Amit Verma',      phone: '9876543225', societyId: 'SUNRISE-APT', flat: 'Flat 6A, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Deepa Iyer',      phone: '9876543226', societyId: 'SUNRISE-APT', flat: 'Flat 7B, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Sanjay Tiwari',   phone: '9876543227', societyId: 'SUNRISE-APT', flat: 'Flat 8C, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Kavita Rane',     phone: '9876543228', societyId: 'SUNRISE-APT', flat: 'Flat 9A, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      { name: 'Rahul Deshpande', phone: '9876543229', societyId: 'SUNRISE-APT', flat: 'Flat 10B, Sunrise Apartments, LBS Marg, Ghatkopar East' },
      // GREEN VALLEY CHS (10 flats)
      { name: 'Sneha Desai',     phone: '9876543230', societyId: 'GREEN-VALLEY', flat: 'Flat 101, Green Valley CHS, Vikhroli West' },
      { name: 'Rohit Kulkarni',  phone: '9876543231', societyId: 'GREEN-VALLEY', flat: 'Flat 102, Green Valley CHS, Vikhroli West' },
      { name: 'Manish Gupta',    phone: '9876543232', societyId: 'GREEN-VALLEY', flat: 'Flat 103, Green Valley CHS, Vikhroli West' },
      { name: 'Sunita Pawar',    phone: '9876543233', societyId: 'GREEN-VALLEY', flat: 'Flat 201, Green Valley CHS, Vikhroli West' },
      { name: 'Nitin Jog',       phone: '9876543234', societyId: 'GREEN-VALLEY', flat: 'Flat 202, Green Valley CHS, Vikhroli West' },
      { name: 'Meera Bhatt',     phone: '9876543235', societyId: 'GREEN-VALLEY', flat: 'Flat 203, Green Valley CHS, Vikhroli West' },
      { name: 'Anil Sawant',     phone: '9876543236', societyId: 'GREEN-VALLEY', flat: 'Flat 301, Green Valley CHS, Vikhroli West' },
      { name: 'Rekha Shetty',    phone: '9876543237', societyId: 'GREEN-VALLEY', flat: 'Flat 302, Green Valley CHS, Vikhroli West' },
      { name: 'Vikas Dhuri',     phone: '9876543238', societyId: 'GREEN-VALLEY', flat: 'Flat 303, Green Valley CHS, Vikhroli West' },
      { name: 'Pallavi More',    phone: '9876543239', societyId: 'GREEN-VALLEY', flat: 'Flat 401, Green Valley CHS, Vikhroli West' },
      // SHIVAJI NAGAR (10 flats)
      { name: 'Vikram Joshi',    phone: '9876543240', societyId: 'SHIVAJI-NAGAR', flat: 'Flat A1, Shivaji Nagar CHS, Govandi' },
      { name: 'Pooja Patel',     phone: '9876543241', societyId: 'SHIVAJI-NAGAR', flat: 'Flat A2, Shivaji Nagar CHS, Govandi' },
      { name: 'Karan Thakur',    phone: '9876543242', societyId: 'SHIVAJI-NAGAR', flat: 'Flat B1, Shivaji Nagar CHS, Govandi' },
      { name: 'Swati Naik',      phone: '9876543243', societyId: 'SHIVAJI-NAGAR', flat: 'Flat B2, Shivaji Nagar CHS, Govandi' },
      { name: 'Ganesh Mhatre',   phone: '9876543244', societyId: 'SHIVAJI-NAGAR', flat: 'Flat C1, Shivaji Nagar CHS, Govandi' },
      { name: 'Lata Shirke',     phone: '9876543245', societyId: 'SHIVAJI-NAGAR', flat: 'Flat C2, Shivaji Nagar CHS, Govandi' },
      { name: 'Tushar Gaikwad',  phone: '9876543246', societyId: 'SHIVAJI-NAGAR', flat: 'Flat D1, Shivaji Nagar CHS, Govandi' },
      { name: 'Bhavna Shah',     phone: '9876543247', societyId: 'SHIVAJI-NAGAR', flat: 'Flat D2, Shivaji Nagar CHS, Govandi' },
      { name: 'Sachin Jadhav',   phone: '9876543248', societyId: 'SHIVAJI-NAGAR', flat: 'Flat E1, Shivaji Nagar CHS, Govandi' },
      { name: 'Nisha Pandey',    phone: '9876543249', societyId: 'SHIVAJI-NAGAR', flat: 'Flat E2, Shivaji Nagar CHS, Govandi' },
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

    // ═══════════════════════════════════════════════════════════
    // 4. COLLECTOR SCAN HISTORY (today + past days)
    // ═══════════════════════════════════════════════════════════
    console.log('📊 Creating scan history & points...');

    // Helper to create a scan event (as if collector scanned a household)
    const createScan = async (citizen, household, collector, date) => {
      await PointEvent.create({
        userId: citizen._id,
        type: 'EARN', action: 'SEGREGATION', points: 10,
        description: 'Waste segregation verified by collector',
        metadata: {
          collectorId: collector._id.toString(),
          householdId: household._id.toString(),
          householdQrCode: household.qrCode,
          location: { lat: 19.0728 + Math.random() * 0.01, lng: 72.8826 + Math.random() * 0.01 },
        },
        createdAt: date,
      });
      // Update household scan info
      await Household.findByIdAndUpdate(household._id, {
        lastScannedAt: date,
        lastScannedBy: collector._id,
        $inc: { totalScans: 1 },
      });
    };

    // ── TODAY's scans by collector1 (first 8 flats already done) ──
    for (let i = 0; i < 8; i++) {
      await createScan(citizens[i], households[i], collector1, todayAt(7 + i));
    }
    // ── TODAY's scans by collector2 (flats 10-16 done) ──
    for (let i = 10; i < 17; i++) {
      await createScan(citizens[i], households[i], collector2, todayAt(7 + (i - 10)));
    }

    // ── YESTERDAY scans (most flats done) ──
    for (let i = 0; i < 25; i++) {
      const col = i < 15 ? collector1 : collector2;
      await createScan(citizens[i], households[i], col, daysAgo(1, 7 + (i % 10)));
    }

    // ── 2-6 days ago (varied coverage) ──
    for (let day = 2; day <= 6; day++) {
      const coverage = Math.floor(18 + Math.random() * 10); // 18-27 flats
      for (let i = 0; i < Math.min(coverage, 30); i++) {
        const col = i < 15 ? collector1 : collector2;
        await createScan(citizens[i], households[i], col, daysAgo(day, 7 + (i % 10)));
      }
    }

    // ── 7-25 days ago (sparser, for monthly stats) ──
    for (let day = 7; day <= 25; day += 2) {
      const coverage = Math.floor(10 + Math.random() * 15);
      for (let i = 0; i < Math.min(coverage, 30); i++) {
        const col = i % 2 === 0 ? collector1 : collector2;
        await createScan(citizens[i], households[i], col, daysAgo(day, 7 + (i % 8)));
      }
    }

    // ── Extra point events (composting, recyclable drops, quizzes) ──
    const extraEvents = [
      { idx: 0, action: 'COMPOSTING', points: 20, desc: 'Weekly home composting', date: daysAgo(2) },
      { idx: 0, action: 'QUIZ_PASS', points: 25, desc: `Quiz passed: ${c1.title}`, date: daysAgo(3), meta: { campaignId: c1._id } },
      { idx: 1, action: 'RECYCLABLE_DROP', points: 5, desc: 'Recyclable drop at kiosk', date: daysAgo(1) },
      { idx: 1, action: 'QUIZ_PASS', points: 25, desc: `Quiz passed: ${c1.title}`, date: daysAgo(4), meta: { campaignId: c1._id } },
      { idx: 2, action: 'COMPOSTING', points: 20, desc: 'Weekly home composting', date: daysAgo(5) },
      { idx: 3, action: 'RECYCLABLE_DROP', points: 5, desc: 'Recyclable drop at kiosk', date: daysAgo(2) },
      { idx: 4, action: 'COMPOSTING', points: 20, desc: 'Weekly home composting', date: daysAgo(1) },
      { idx: 5, action: 'QUIZ_PASS', points: 25, desc: `Quiz passed: ${c1.title}`, date: daysAgo(6), meta: { campaignId: c1._id } },
      { idx: 10, action: 'COMPOSTING', points: 20, desc: 'Weekly home composting', date: daysAgo(3) },
      { idx: 10, action: 'QUIZ_PASS', points: 50, desc: `Quiz passed: ${c2.title}`, date: daysAgo(1), meta: { campaignId: c2._id } },
      { idx: 11, action: 'RECYCLABLE_DROP', points: 5, desc: 'Recyclable drop at kiosk', date: daysAgo(4) },
      { idx: 15, action: 'COMPOSTING', points: 20, desc: 'Weekly home composting', date: daysAgo(2) },
      { idx: 20, action: 'COMPOSTING', points: 20, desc: 'Weekly home composting', date: daysAgo(1) },
      { idx: 20, action: 'QUIZ_PASS', points: 25, desc: `Quiz passed: ${c1.title}`, date: daysAgo(5), meta: { campaignId: c1._id } },
      { idx: 25, action: 'RECYCLABLE_DROP', points: 5, desc: 'Recyclable drop at kiosk', date: daysAgo(3) },
    ];

    for (const ev of extraEvents) {
      await PointEvent.create({
        userId: citizens[ev.idx]._id,
        type: 'EARN', action: ev.action, points: ev.points,
        description: ev.desc, metadata: ev.meta || {},
        createdAt: ev.date,
      });
    }

    // ── Quiz results ──
    const quizUsers = [
      { idx: 0, campaign: c1, score: 100, answers: [1,2,2,2,2] },
      { idx: 1, campaign: c1, score: 80,  answers: [1,2,2,2,0] },
      { idx: 5, campaign: c1, score: 60,  answers: [1,2,0,2,0] },
      { idx: 10, campaign: c2, score: 100, answers: [0,2,1,3,1] },
      { idx: 20, campaign: c1, score: 80,  answers: [1,2,2,0,2] },
    ];
    for (const q of quizUsers) {
      await QuizResult.create({
        userId: citizens[q.idx]._id, campaignId: q.campaign._id,
        score: q.score, passed: q.score >= 60, pointsAwarded: q.campaign.bonusPoints,
        answers: q.answers,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // 5. VIOLATIONS
    // ═══════════════════════════════════════════════════════════
    console.log('⚠️  Creating violations...');

    const violations = [
      { citizenIdx: 3, col: collector1, type: 'NON_SEGREGATION', tier: 1, status: 'PENDING', pts: 20, date: daysAgo(3) },
      { citizenIdx: 11, col: collector2, type: 'LITTERING', tier: 2, status: 'FINE_ISSUED', fine: 500, pts: 100, date: daysAgo(5) },
      { citizenIdx: 12, col: collector2, type: 'BURNING', tier: 3, status: 'FINE_ISSUED', fine: 1000, pts: 150, date: daysAgo(7) },
      { citizenIdx: 22, col: collector1, type: 'NON_SEGREGATION', tier: 1, status: 'APPEALED', pts: 20,
        appeal: 'I did segregate — the collector made a mistake.', date: daysAgo(4) },
      { citizenIdx: 20, col: collector1, type: 'NON_SEGREGATION', tier: 1, status: 'RESOLVED', pts: 20,
        outcome: 'DISMISSED', date: daysAgo(6) },
      { citizenIdx: 7, col: collector1, type: 'NON_SEGREGATION', tier: 1, status: 'PENDING', pts: 20, date: daysAgo(1) },
      { citizenIdx: 16, col: collector2, type: 'BULK_VIOLATION', tier: 2, status: 'FINE_ISSUED', fine: 750, pts: 80, date: daysAgo(2) },
      { citizenIdx: 28, col: collector2, type: 'LITTERING', tier: 1, status: 'PENDING', pts: 30, date: daysAgo(0) },
    ];

    for (const v of violations) {
      await Violation.create({
        citizenId: citizens[v.citizenIdx]._id,
        collectorId: v.col._id,
        type: v.type, tier: v.tier, offenceCountInWindow: 1,
        status: v.status, fineAmount: v.fine || 0, pointsDeducted: v.pts,
        appealText: v.appeal || '',
        appealSubmittedAt: v.appeal ? daysAgo(v.date.getDate ? 2 : 2) : undefined,
        resolutionOutcome: v.outcome || undefined,
        resolvedBy: v.outcome ? officer._id : undefined,
        resolvedAt: v.outcome ? daysAgo(1) : undefined,
        createdAt: v.date,
      });

      // Deduct penalty event
      await PointEvent.create({
        userId: citizens[v.citizenIdx]._id,
        type: 'DEDUCT', action: 'VIOLATION_PENALTY', points: v.pts,
        description: `Violation: ${v.type}`,
        createdAt: v.date,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // 6. COMPUTE & SET FINAL BALANCES
    // ═══════════════════════════════════════════════════════════
    console.log('💰 Computing final balances...');

    for (let i = 0; i < citizens.length; i++) {
      const earned = await PointEvent.aggregate([
        { $match: { userId: citizens[i]._id, type: 'EARN' } },
        { $group: { _id: null, total: { $sum: '$points' } } }
      ]);
      const deducted = await PointEvent.aggregate([
        { $match: { userId: citizens[i]._id, type: 'DEDUCT' } },
        { $group: { _id: null, total: { $sum: '$points' } } }
      ]);
      const totalEarned = earned[0]?.total || 0;
      const totalDeducted = deducted[0]?.total || 0;
      const balance = Math.max(totalEarned - totalDeducted, 0);

      // Count violations in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const violCount = await Violation.countDocuments({
        citizenId: citizens[i]._id, createdAt: { $gte: thirtyDaysAgo }
      });

      await User.findByIdAndUpdate(citizens[i]._id, {
        pointsBalance: balance,
        violationCount30d: violCount
      });
    }

    // ═══════════════════════════════════════════════════════════
    // 7. SUMMARY
    // ═══════════════════════════════════════════════════════════
    const counts = {
      users: await User.countDocuments(),
      households: await Household.countDocuments(),
      campaigns: await Campaign.countDocuments(),
      pointEvents: await PointEvent.countDocuments(),
      violations: await Violation.countDocuments(),
      quizResults: await QuizResult.countDocuments(),
    };

    console.log(`\n✅ Seed completed successfully!`);
    console.log(`   Users:       ${counts.users} (1 officer, 2 collectors, ${citizens.length} citizens)`);
    console.log(`   Households:  ${counts.households}`);
    console.log(`   Campaigns:   ${counts.campaigns}`);
    console.log(`   PointEvents: ${counts.pointEvents}`);
    console.log(`   Violations:  ${counts.violations}`);
    console.log(`   QuizResults: ${counts.quizResults}`);

    console.log(`\n📱 Login credentials (all passwords: password123):`);
    console.log(`   Officer:    9876543210`);
    console.log(`   Collector1: 9876543211 (Ramesh Yadav)`);
    console.log(`   Collector2: 9876543212 (Suresh Kamble)`);
    console.log(`   Citizen:    9876543220 (Priya Sharma)`);

    // Print top 5 citizen balances
    const topCitizens = await User.find({ role: 'citizen' }).sort({ pointsBalance: -1 }).limit(5).select('name pointsBalance');
    console.log(`\n🏆 Top citizens by points:`);
    topCitizens.forEach((c, i) => console.log(`   ${i+1}. ${c.name} — ${c.pointsBalance} pts`));

    // Print today's collector stats
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const col1Today = await PointEvent.countDocuments({ 'metadata.collectorId': collector1._id.toString(), action: 'SEGREGATION', createdAt: { $gte: todayStart } });
    const col2Today = await PointEvent.countDocuments({ 'metadata.collectorId': collector2._id.toString(), action: 'SEGREGATION', createdAt: { $gte: todayStart } });
    console.log(`\n🚛 Today's collector scans:`);
    console.log(`   Ramesh Yadav (COL1001): ${col1Today} scans`);
    console.log(`   Suresh Kamble (COL1002): ${col2Today} scans`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

SEED();
