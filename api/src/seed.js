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

const SEED = async () => {
  await connectDB();
  
  try {
    console.log('Clearing existing data...');
    await QuizResult.deleteMany({});
    await Violation.deleteMany({});
    await PointEvent.deleteMany({});
    await Campaign.deleteMany({});
    await Household.deleteMany({});
    await User.deleteMany({});

    console.log('Creating users...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const officer = await User.create({ name: 'Rajesh Patil', phone: '9876543210', passwordHash, role: 'officer', wardId: 'N-WARD' });
    const collector1 = await User.create({ name: 'Ramesh Yadav', phone: '9876543211', passwordHash, role: 'collector', wardId: 'N-WARD', collectorId: 'COL1001' });
    const collector2 = await User.create({ name: 'Suresh Kamble', phone: '9876543212', passwordHash, role: 'collector', wardId: 'N-WARD', collectorId: 'COL1002' });

    const citizenParams = [
      { name: 'Priya Sharma', phone: '9876543220', societyId: 'SUNRISE-APT' },
      { name: 'Aarav Mehta', phone: '9876543221', societyId: 'SUNRISE-APT' },
      { name: 'Sneha Desai', phone: '9876543222', societyId: 'GREEN-VALLEY' },
      { name: 'Rohit Kulkarni', phone: '9876543223', societyId: 'GREEN-VALLEY' },
      { name: 'Anjali Nair', phone: '9876543224', societyId: 'SUNRISE-APT' },
      { name: 'Vikram Joshi', phone: '9876543225', societyId: 'SHIVAJI-NAGAR' },
      { name: 'Pooja Patel', phone: '9876543226', societyId: 'SHIVAJI-NAGAR' },
      { name: 'Manish Gupta', phone: '9876543227', societyId: 'GREEN-VALLEY' },
      { name: 'Riya Singh', phone: '9876543228', societyId: 'SUNRISE-APT' },
      { name: 'Karan Thakur', phone: '9876543229', societyId: 'SHIVAJI-NAGAR' }
    ];

    const citizens = await User.insertMany(citizenParams.map(c => ({
      ...c, passwordHash, role: 'citizen', wardId: 'N-WARD', pointsBalance: 0, violationCount30d: 0
    })));

    console.log('Creating households...');
    const householdData = [
      { citizenId: citizens[0]._id, address: 'Flat 4B, Sunrise Apartments, LBS Marg, Ghatkopar East', societyId: 'SUNRISE-APT' },
      { citizenId: citizens[1]._id, address: 'Flat 12A, Sunrise Apartments, LBS Marg, Ghatkopar East', societyId: 'SUNRISE-APT' },
      { citizenId: citizens[2]._id, address: 'Flat 7C, Green Valley CHS, Vikhroli West', societyId: 'GREEN-VALLEY' },
      { citizenId: citizens[3]._id, address: 'Flat 2D, Green Valley CHS, Vikhroli West', societyId: 'GREEN-VALLEY' },
      { citizenId: citizens[4]._id, address: 'Flat 9A, Sunrise Apartments, LBS Marg, Ghatkopar East', societyId: 'SUNRISE-APT' },
      { citizenId: citizens[5]._id, address: 'Flat 3B, Shivaji Nagar Chawl, Govandi', societyId: 'SHIVAJI-NAGAR' },
      { citizenId: citizens[6]._id, address: 'Flat 6C, Shivaji Nagar Chawl, Govandi', societyId: 'SHIVAJI-NAGAR' },
      { citizenId: citizens[7]._id, address: 'Flat 15A, Green Valley CHS, Vikhroli West', societyId: 'GREEN-VALLEY' },
      { citizenId: citizens[8]._id, address: 'Flat 1A, Sunrise Apartments, LBS Marg, Ghatkopar East', societyId: 'SUNRISE-APT' },
      { citizenId: citizens[9]._id, address: 'Flat 8D, Shivaji Nagar Chawl, Govandi', societyId: 'SHIVAJI-NAGAR' },
    ];

    const households = [];
    for (const hData of householdData) {
      const qrCode = generateQRCodeString();
      const qrImageUrl = await generateQRCodeImage(qrCode);
      const household = await Household.create({
        ...hData,
        wardId: 'N-WARD',
        qrCode,
        qrImageUrl,
        isActive: true,
        totalScans: Math.floor(Math.random() * 20),
      });
      households.push(household);
      // Link household back to citizen
      await User.findByIdAndUpdate(hData.citizenId, { householdId: household._id });
    }

    console.log(`✅ Created ${households.length} households with QR codes`);
    // Log QR codes for testing
    households.forEach((h, i) => {
      console.log(`   Household ${i+1}: ${h.qrCode} — ${h.address.split(',')[0]}`);
    });

    console.log('Creating campaigns...');
    const now = new Date();
    const startDate = new Date(now); startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(now); endDate.setDate(endDate.getDate() + 23);

    const c1 = await Campaign.create({
      title: "Know Your Waste",
      description: "Learn the basics of waste segregation in Mumbai to earn bonus GreenPoints.",
      wardId: 'N-WARD',
      type: 'QUIZ',
      bonusPoints: 25,
      startDate,
      endDate,
      createdBy: officer._id,
      quizQuestions: [
        { question: "Which bin should vegetable peels and food waste go in?", options: ["Blue (Dry)", "Green (Wet)", "Red (Hazardous)", "Black (E-waste)"], correctIndex: 1 },
        { question: "Where should expired medicines be disposed?", options: ["Wet bin", "Dry bin", "Hazardous waste bin", "Flush down drain"], correctIndex: 2 },
        { question: "Which of these is NOT recyclable in the dry bin?", options: ["Plastic bottles (clean)", "Newspaper", "Pizza box with food stains", "Glass jar"], correctIndex: 2 },
        { question: "Old mobile phones and chargers should go to?", options: ["Dry bin", "Kabadiwala", "Authorised e-waste centre", "Wet bin"], correctIndex: 2 },
        { question: "Sanitary waste like pads and diapers should be?", options: ["Thrown in wet bin", "Mixed with dry waste", "Wrapped separately and handed to BMC", "Flushed"], correctIndex: 2 }
      ]
    });

    const c2 = await Campaign.create({
      title: "Plastic-Free Week Challenge",
      description: "Test your knowledge on plastic recycling and environmental impact.",
      wardId: 'N-WARD',
      type: 'QUIZ',
      bonusPoints: 50,
      startDate,
      endDate,
      createdBy: officer._id,
      quizQuestions: [
        { question: "Which plastic type is most recyclable?", options: ["PET (type 1) bottles", "Plastic bags", "Styrofoam cups", "Multi-layer packaging"], correctIndex: 0 },
        { question: "Mumbai generates how much solid waste per day approximately?", options: ["1,000 MT", "3,500 MT", "7,000 MT", "12,000 MT"], correctIndex: 2 },
        { question: "What is the first step in SWM Rules 2016 compliance?", options: ["Call BMC helpline", "Segregate waste at source", "Hire private collector", "Use only plastic bags"], correctIndex: 1 },
        { question: "Deonar landfill in Mumbai is operating at approximately what capacity?", options: ["50%", "100%", "200%", "300%"], correctIndex: 3 },
        { question: "Home composting wet waste reduces landfill load by?", options: ["5-10%", "30-40%", "60-70%", "90%+"], correctIndex: 1 }
      ]
    });

    console.log('Creating points, violations and quiz results...');
    
    // Priya Sharma
    await PointEvent.create({ userId: citizens[0]._id, type: 'EARN', action: 'SEGREGATION', points: 10, description: 'Daily segregation at pickup' });
    await PointEvent.create({ userId: citizens[0]._id, type: 'EARN', action: 'COMPOSTING', points: 20, description: 'Weekly home composting' });
    await PointEvent.create({ userId: citizens[0]._id, type: 'EARN', action: 'QUIZ_PASS', points: 25, description: `Quiz passed: ${c1.title}`, metadata: { campaignId: c1._id } });
    await QuizResult.create({ userId: citizens[0]._id, campaignId: c1._id, score: 100, passed: true, pointsAwarded: 25, answers: [1,2,2,2,2] });
    await Violation.create({ citizenId: citizens[0]._id, collectorId: collector1._id, type: 'NON_SEGREGATION', tier: 1, offenceCountInWindow: 1, status: 'PENDING', pointsDeducted: 20, createdAt: new Date(Date.now() - 3*86400000) });
    await PointEvent.create({ userId: citizens[0]._id, type: 'DEDUCT', action: 'VIOLATION_PENALTY', points: 20, description: 'Violation: NON_SEGREGATION' });
    await User.findByIdAndUpdate(citizens[0]._id, { pointsBalance: 35, violationCount30d: 1 });

    // Aarav Mehta
    await PointEvent.create({ userId: citizens[1]._id, type: 'EARN', action: 'SEGREGATION', points: 10, description: 'Daily segregation at pickup' });
    await PointEvent.create({ userId: citizens[1]._id, type: 'EARN', action: 'RECYCLABLE_DROP', points: 5, description: 'Recyclable drop at kiosk' });
    await PointEvent.create({ userId: citizens[1]._id, type: 'EARN', action: 'QUIZ_PASS', points: 25, description: `Quiz passed: ${c1.title}`, metadata: { campaignId: c1._id } });
    await QuizResult.create({ userId: citizens[1]._id, campaignId: c1._id, score: 80, passed: true, pointsAwarded: 25, answers: [1,2,2,2,0] });
    await User.findByIdAndUpdate(citizens[1]._id, { pointsBalance: 40 });

    // Rohit Kulkarni
    await PointEvent.create({ userId: citizens[3]._id, type: 'EARN', action: 'SEGREGATION', points: 10, description: 'Daily segregation at pickup' });
    await Violation.create({ citizenId: citizens[3]._id, collectorId: collector2._id, type: 'LITTERING', tier: 2, offenceCountInWindow: 1, status: 'FINE_ISSUED', fineAmount: 500, pointsDeducted: 100, createdAt: new Date(Date.now() - 5*86400000) });
    await PointEvent.create({ userId: citizens[3]._id, type: 'DEDUCT', action: 'VIOLATION_PENALTY', points: 10, description: 'Violation: LITTERING' });
    await User.findByIdAndUpdate(citizens[3]._id, { pointsBalance: 0, violationCount30d: 1 });

    // Karan Thakur
    await Violation.create({ citizenId: citizens[9]._id, collectorId: collector1._id, type: 'NON_SEGREGATION', tier: 1, offenceCountInWindow: 1, status: 'APPEALED', pointsDeducted: 20, appealText: 'I did segregate — the collector made a mistake. I have witnesses.', appealSubmittedAt: new Date(Date.now() - 2*86400000), createdAt: new Date(Date.now() - 4*86400000) });
    await PointEvent.create({ userId: citizens[9]._id, type: 'DEDUCT', action: 'VIOLATION_PENALTY', points: 0, description: 'Violation: NON_SEGREGATION' });
    await User.findByIdAndUpdate(citizens[9]._id, { violationCount30d: 1 });

    // Manish Gupta
    await Violation.create({ citizenId: citizens[7]._id, collectorId: collector2._id, type: 'BURNING', tier: 3, offenceCountInWindow: 1, status: 'FINE_ISSUED', fineAmount: 1000, pointsDeducted: 150, createdAt: new Date(Date.now() - 7*86400000) });
    await PointEvent.create({ userId: citizens[7]._id, type: 'DEDUCT', action: 'VIOLATION_PENALTY', points: 0, description: 'Violation: BURNING' });
    await User.findByIdAndUpdate(citizens[7]._id, { violationCount30d: 1 });

    // Vikram Joshi
    await PointEvent.create({ userId: citizens[5]._id, type: 'EARN', action: 'SEGREGATION', points: 10, description: 'Daily segregation at pickup' });
    await Violation.create({ citizenId: citizens[5]._id, collectorId: collector1._id, type: 'NON_SEGREGATION', tier: 1, offenceCountInWindow: 1, status: 'RESOLVED', pointsDeducted: 20, resolutionOutcome: 'DISMISSED', resolvedBy: officer._id, resolvedAt: new Date(Date.now() - 86400000), createdAt: new Date(Date.now() - 6*86400000) });
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
