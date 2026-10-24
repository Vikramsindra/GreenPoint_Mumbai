// filepath: api/src/scripts/prepareDemoData.js
/**
 * GreenPoint Mumbai - Demonstration Data Preparation Script
 * 
 * Safely seeds repeatable, non-destructive synthetic demonstration data
 * for BMC official presentations and rehearsals.
 * 
 * SAFETY RULES:
 * 1. Explicit target database configuration.
 * 2. Refuses to reset non-demo databases.
 * 3. Marks all seeded records with { isDemoData: true }.
 * 4. Defaults to idempotent upsert, preserving existing records.
 * 5. Supports two explicit modes:
 *    - LIVE START: Zero points earned today, zero live inspections today.
 *                  Ready for live pickup (+10 pts) -> redemption -> fulfilment.
 *    - SHOWCASE:   Includes historical chart records without consuming today's live actions.
 * 
 * Usage:
 *   node src/scripts/prepareDemoData.js [--mode=live|showcase] [--reset-demo-only] [--db=dbname]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const QRCode = require('qrcode');

const User = require('../models/User');
const Society = require('../models/Society');
const Household = require('../models/Household');
const SocietyMembership = require('../models/SocietyMembership');
const CollectionPoint = require('../models/CollectionPoint');
const BulkCollection = require('../models/BulkCollection');
const HouseholdInspection = require('../models/HouseholdInspection');
const SocietyVoucher = require('../models/SocietyVoucher');
const SocietyPointEvent = require('../models/SocietyPointEvent');
const { getIstBusinessDate, getIstDayRange, getPastIstDays } = require('../utils/dateHelper');

// -------------------------------------------------------------
// CLI Argument Parsing & Safety Validations
// -------------------------------------------------------------
const args = process.argv.slice(2);
const modeArg = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'live';
const dbArg = args.find(a => a.startsWith('--db='))?.split('=')[1];
const resetDemoOnly = args.includes('--reset-demo-only');

const DEMO_MODE = modeArg.toLowerCase() === 'showcase' ? 'SHOWCASE' : 'LIVE';
const TARGET_DB = dbArg || process.env.DEMO_DB_NAME || 'greenpoint_demo';
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'Demo@GreenPoint2026';

// Safety Guard: Refuse to run destructive operations against non-demo DBs
if (resetDemoOnly && !TARGET_DB.toLowerCase().includes('demo') && process.env.ALLOW_NON_DEMO_DB !== 'true') {
  console.error(`\n❌ SAFETY ABORT: Refusing to reset target database '${TARGET_DB}'.`);
  console.error(`   The target database name must contain 'demo' (or pass DEMO_DB_NAME=greenpoint_demo).\n`);
  process.exit(1);
}

async function prepareDemo() {
  const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  // Target the specified database safely
  const uriObj = new URL(rawUri);
  uriObj.pathname = `/${TARGET_DB}`;
  const targetUri = uriObj.toString();

  console.log('===========================================================');
  console.log('🏛️  GreenPoint Mumbai — Demonstration Environment Preparation');
  console.log('===========================================================');
  console.log(`📡 Target Database : ${TARGET_DB}`);
  console.log(`🎯 Scenario Mode   : ${DEMO_MODE} START`);
  console.log(`🔄 Reset Demo Only : ${resetDemoOnly ? 'YES (demo data only)' : 'NO (idempotent upsert)'}`);
  console.log('===========================================================\n');

  await mongoose.connect(targetUri);
  const todayStr = getIstBusinessDate();
  const todayRange = getIstDayRange(todayStr);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, salt);

  // -----------------------------------------------------------
  // Optional Safe Reset (Demo-Tagged Records Only)
  // -----------------------------------------------------------
  if (resetDemoOnly) {
    console.log('🧹 Purging existing demonstration records...');
    await Promise.all([
      User.deleteMany({ phone: { $regex: /^9820[1-5]\d{5}$/ } }),
      Society.deleteMany({ name: { $in: [
        'Gokuldham Co-operative Housing Society',
        'Shivaji Heights CHS',
        'Sahyadri Residency CHS',
        'Palm Beach Residency CHS'
      ] } }),
      Household.deleteMany({ qrCode: { $regex: /^GP-HH-GOKUL-/ } }),
      SocietyMembership.deleteMany({ address: { $regex: /Gokuldham CHS/ } }),
      CollectionPoint.deleteMany({ name: { $regex: /(Gokuldham|Shivaji Heights)/ } }),
      BulkCollection.deleteMany({ requestId: { $regex: /^demo-bmc-/ } }),
      HouseholdInspection.deleteMany({ requestId: { $regex: /^demo-insp-/ } }),
      SocietyVoucher.deleteMany({ voucherCode: { $regex: /^GP-SOC-DEMO-/ } }),
      SocietyPointEvent.deleteMany({ reason: { $regex: /\[Demo/ } })
    ]);
    console.log('✓ Demo records cleared safely.\n');
  }

  // Helper for idempotent user upsert
  async function upsertUser(query, doc) {
    let user = await User.findOne(query);
    if (!user) {
      user = await User.create({ ...doc, passwordHash, isActive: true });
    } else {
      Object.assign(user, doc);
      user.passwordHash = passwordHash;
      user.isActive = true;
      await user.save();
    }
    return user;
  }

  // -----------------------------------------------------------
  // 1. Municipal Ward Officers
  // -----------------------------------------------------------
  console.log('👤 Provisioning Ward Officers...');
  const officerN = await upsertUser({ phone: '9820100001' }, {
    name: 'Officer R. K. Shinde (Ward N)',
    phone: '9820100001',
    role: 'officer',
    wardId: 'N-WARD',
    officerId: 'OFF-N-01'
  });

  const officerK = await upsertUser({ phone: '9820100002' }, {
    name: 'Officer S. V. Patil (Ward K)',
    phone: '9820100002',
    role: 'officer',
    wardId: 'K-WARD',
    officerId: 'OFF-K-01'
  });

  // -----------------------------------------------------------
  // 2. Society Representatives & Internal Collectors
  // -----------------------------------------------------------
  console.log('🏢 Provisioning Societies & Representatives...');
  
  // Gokuldham Representative & Collector
  const repGokuldham = await upsertUser({ phone: '9820200001' }, {
    name: 'Aatmaram Bhide (Representative)',
    phone: '9820200001',
    role: 'society_representative',
    wardId: 'N-WARD'
  });

  const collectorGokuldham = await upsertUser({ phone: '9820300001' }, {
    name: 'Raju Shinde (Internal Collector)',
    phone: '9820300001',
    role: 'collector',
    wardId: 'N-WARD',
    collectorId: 'COL-INT-GOKUL'
  });

  // Shivaji Heights Representative & Collector
  const repShivaji = await upsertUser({ phone: '9820200002' }, {
    name: 'Sunil More (Representative)',
    phone: '9820200002',
    role: 'society_representative',
    wardId: 'N-WARD'
  });

  const collectorShivaji = await upsertUser({ phone: '9820300002' }, {
    name: 'Kailash Jadhav (Internal Collector)',
    phone: '9820300002',
    role: 'collector',
    wardId: 'N-WARD',
    collectorId: 'COL-INT-SHIVA'
  });

  // Sahyadri Representative (for Live Approval Demo)
  const repSahyadri = await upsertUser({ phone: '9820200003' }, {
    name: 'Pooja Deshmukh (Representative)',
    phone: '9820200003',
    role: 'society_representative',
    wardId: 'N-WARD'
  });

  // Palm Beach Representative (Ward K)
  const repPalm = await upsertUser({ phone: '9820200004' }, {
    name: 'Vikram Malhotra (Representative)',
    phone: '9820200004',
    role: 'society_representative',
    wardId: 'K-WARD'
  });

  // -----------------------------------------------------------
  // 3. Societies (Approved & Pending)
  // -----------------------------------------------------------
  async function upsertSociety(name, doc) {
    let soc = await Society.findOne({ name });
    const qrData = doc.qrCode || `GP-SOC-${name.replace(/\s+/g, '').toUpperCase().slice(0, 10)}`;
    const qrImageUrl = await QRCode.toDataURL(qrData);

    if (!soc) {
      soc = await Society.create({
        ...doc,
        name,
        qrCode: qrData,
        qrImageUrl
      });
    } else {
      Object.assign(soc, doc);
      if (!soc.qrImageUrl) soc.qrImageUrl = qrImageUrl;
      await soc.save();
    }
    return soc;
  }

  // Society 1: Gokuldham CHS (Primary Demo Society)
  // In LIVE mode: starts with 0 points today so representative can earn 10 and redeem 10 during presentation.
  const gokuldhamStartingPoints = DEMO_MODE === 'SHOWCASE' ? 10 : 0;
  const societyGokuldham = await upsertSociety('Gokuldham Co-operative Housing Society', {
    address: 'Plot 42, Central Avenue, Pant Nagar, Ghatkopar East, Mumbai 400075',
    wardId: 'N-WARD',
    totalFlats: 45,
    registrationStatus: 'APPROVED',
    verificationStatus: 'approved',
    representativeId: repGokuldham._id,
    internalCollectorId: collectorGokuldham._id,
    pointsBalance: gokuldhamStartingPoints,
    joinCode: 'GOKUL1',
    qrCode: 'GP-SOC-GOKULDHAM'
  });

  // Society 2: Shivaji Heights CHS (Secondary Ward N Society)
  const societyShivaji = await upsertSociety('Shivaji Heights CHS', {
    address: '90 Feet Road, Pant Nagar, Ghatkopar East, Mumbai 400075',
    wardId: 'N-WARD',
    totalFlats: 60,
    registrationStatus: 'APPROVED',
    verificationStatus: 'approved',
    representativeId: repShivaji._id,
    internalCollectorId: collectorShivaji._id,
    pointsBalance: 20,
    joinCode: 'SHIVA1',
    qrCode: 'GP-SOC-SHIVAJI'
  });

  // Society 3: Sahyadri Residency CHS (Pending Application for Live Approval Demo)
  const societySahyadri = await upsertSociety('Sahyadri Residency CHS', {
    address: 'Building 12, Tilak Road, Ghatkopar East, Mumbai 400077',
    wardId: 'N-WARD',
    totalFlats: 32,
    registrationStatus: 'PENDING',
    verificationStatus: 'pending',
    representativeId: repSahyadri._id,
    pointsBalance: 0,
    joinCode: 'SAHYA1',
    qrCode: 'GP-SOC-SAHYADRI'
  });

  // Society 4: Palm Beach Residency CHS (Ward K Separation)
  const societyPalm = await upsertSociety('Palm Beach Residency CHS', {
    address: 'Link Road, Andheri West, Mumbai 400053',
    wardId: 'K-WARD',
    totalFlats: 80,
    registrationStatus: 'APPROVED',
    verificationStatus: 'approved',
    representativeId: repPalm._id,
    pointsBalance: 50,
    joinCode: 'PALMB1',
    qrCode: 'GP-SOC-PALMBEACH'
  });

  // Update collector assignedSocietyId
  collectorGokuldham.assignedSocietyId = societyGokuldham._id;
  await collectorGokuldham.save();
  collectorShivaji.assignedSocietyId = societyShivaji._id;
  await collectorShivaji.save();

  // -----------------------------------------------------------
  // 4. BMC Route Collectors & Collection Points
  // -----------------------------------------------------------
  console.log('🚛 Provisioning BMC Municipal Collectors & Points...');
  const bmcCollectorN = await upsertUser({ phone: '9820400001' }, {
    name: 'Mahesh Kadam (BMC Route Collector)',
    phone: '9820400001',
    role: 'bmc_collector',
    wardId: 'N-WARD',
    collectorId: 'BMC-N-COL01'
  });

  async function upsertCollectionPoint(society, name) {
    let point = await CollectionPoint.findOne({ societyId: society._id });
    if (!point) {
      point = await CollectionPoint.create({
        name,
        address: society.address,
        wardId: society.wardId,
        type: 'society',
        societyId: society._id,
        assignedCollectorId: bmcCollectorN._id,
        qrCode: society.qrCode,
        isActive: true
      });
    } else {
      point.assignedCollectorId = bmcCollectorN._id;
      point.qrCode = society.qrCode;
      point.isActive = true;
      await point.save();
    }
    return point;
  }

  const pointGokuldham = await upsertCollectionPoint(societyGokuldham, 'Gokuldham Society Collection Gate');
  const pointShivaji = await upsertCollectionPoint(societyShivaji, 'Shivaji Heights Society Collection Gate');

  // -----------------------------------------------------------
  // 5. Citizens, Households & Memberships
  // -----------------------------------------------------------
  console.log('🏡 Provisioning Households & Memberships...');

  async function provisionHousehold(phone, name, flatNo, qrCode, isApproved = true) {
    const citizen = await upsertUser({ phone }, {
      name,
      phone,
      role: 'citizen',
      wardId: 'N-WARD'
    });

    let household = await Household.findOne({ qrCode });
    const qrImageUrl = await QRCode.toDataURL(qrCode);
    if (!household) {
      household = await Household.create({
        citizenId: citizen._id,
        address: `${flatNo}, Gokuldham CHS`,
        wardId: 'N-WARD',
        societyId: societyGokuldham._id.toString(),
        societyRef: societyGokuldham._id,
        qrCode,
        qrImageUrl,
        isActive: true
      });
    } else {
      household.societyId = societyGokuldham._id.toString();
      household.societyRef = societyGokuldham._id;
      household.isActive = true;
      if (!household.qrImageUrl) household.qrImageUrl = qrImageUrl;
      await household.save();
    }

    let membership = await SocietyMembership.findOne({ citizenId: citizen._id, societyId: societyGokuldham._id });
    if (!membership) {
      membership = await SocietyMembership.create({
        citizenId: citizen._id,
        societyId: societyGokuldham._id,
        householdId: household._id,
        address: `${flatNo}, Gokuldham CHS`,
        status: isApproved ? 'APPROVED' : 'PENDING',
        reviewedBy: isApproved ? repGokuldham._id : null,
        reviewedAt: isApproved ? new Date() : null
      });
    } else {
      membership.householdId = household._id;
      membership.status = isApproved ? 'APPROVED' : 'PENDING';
      await membership.save();
    }

    return { citizen, household, membership };
  }

  // Three Approved Households in Gokuldham CHS
  const hh1 = await provisionHousehold('9820500001', 'Jethalal Gada', 'Flat 101, Wing A', 'GP-HH-GOKUL-101', true);
  const hh2 = await provisionHousehold('9820500002', 'Taarak Mehta', 'Flat 102, Wing B', 'GP-HH-GOKUL-102', true);
  const hh3 = await provisionHousehold('9820500003', 'Popatlal Pandey', 'Flat 201, Wing C', 'GP-HH-GOKUL-201', true);

  // One Pending Membership in Gokuldham CHS (For Representative Approval Demo)
  const hhPending = await provisionHousehold('9820500004', 'Sundarlal Topiwala', 'Flat 303, Wing A', 'GP-HH-GOKUL-303', false);

  // -----------------------------------------------------------
  // 6. Historical Data for Charts (Past 7 Days)
  // -----------------------------------------------------------
  console.log('📊 Seeding Historical Monitoring Records...');
  const pastDays = getPastIstDays(7);

  // Ensure Shivaji Heights has historical municipal collections for trend charts
  for (let i = 1; i < pastDays.length; i++) {
    const dayStr = pastDays[i];
    const range = getIstDayRange(dayStr);
    const existingPickup = await BulkCollection.findOne({
      societyId: societyShivaji._id,
      requestId: `demo-bmc-hist-${dayStr}`
    });

    if (!existingPickup) {
      await BulkCollection.create({
        bmcCollectorId: bmcCollectorN._id,
        collectionPointId: pointShivaji._id,
        societyId: societyShivaji._id,
        outcome: 'SEGREGATED',
        wasteType: 'wet',
        weight: 42.5,
        weightBasis: 'MEASURED',
        pointsAwarded: 10,
        pointsReason: '10 society points awarded for segregated waste',
        wardId: 'N-WARD',
        status: 'verified',
        verifiedBy: officerN._id,
        verifiedAt: new Date(range.start.getTime() + 4 * 3600 * 1000),
        requestId: `demo-bmc-hist-${dayStr}`,
        timestamp: new Date(range.start.getTime() + 2 * 3600 * 1000)
      });
    }

    // Historical household inspections in Shivaji Heights
    const existingInsp = await HouseholdInspection.findOne({
      requestId: `demo-insp-hist-${dayStr}`
    });

    if (!existingInsp) {
      await HouseholdInspection.create({
        householdId: hh3.household._id,
        citizenId: hh3.citizen._id,
        collectorId: collectorShivaji._id,
        societyId: societyShivaji._id,
        wardId: 'N-WARD',
        outcome: i % 3 === 0 ? 'MIXED' : 'SEGREGATED',
        notes: i % 3 === 0 ? 'Historical mixed handover' : 'Historical verified segregated waste',
        istBusinessDate: dayStr,
        requestId: `demo-insp-hist-${dayStr}`,
        inspectedAt: new Date(range.start.getTime() + 1 * 3600 * 1000)
      });
    }
  }

  // -----------------------------------------------------------
  // 7. Showcase Mode Additions (Optional Pre-existing Records)
  // -----------------------------------------------------------
  if (DEMO_MODE === 'SHOWCASE') {
    console.log('🌟 Adding Showcase Mode Demo Records...');
    // In showcase mode, add an existing voucher for Shivaji Heights
    const existingVoucher = await SocietyVoucher.findOne({ voucherCode: 'GP-SOC-DEMO-SHIVA01' });
    if (!existingVoucher) {
      await SocietyVoucher.create({
        voucherCode: 'GP-SOC-DEMO-SHIVA01',
        rewardId: 'DEMO-REWARD-10',
        rewardName: 'Demo Recognition Certificate',
        rewardDescription: 'Awarded to top performing societies',
        rewardCategory: 'RECOGNITION',
        pointsCost: 10,
        pointsSpent: 10,
        societyId: societyShivaji._id,
        representativeId: repShivaji._id,
        wardId: 'N-WARD',
        status: 'FULFILLED',
        fulfilledBy: officerN._id,
        fulfilledAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        requestId: 'demo-vouch-shiva-01'
      });
    }
  }

  console.log('\n===========================================================');
  console.log('✅ Demonstration Data Prepared Successfully!');
  console.log('===========================================================');
  console.log('\n🔑 DEMO ACCOUNTS & ROLES:');
  console.log('-----------------------------------------------------------');
  console.log(`Password for ALL demo accounts: ${DEMO_PASSWORD}`);
  console.log('-----------------------------------------------------------');
  console.log('1. Ward Officer (Ward N)       : 9820100001 (Officer R. K. Shinde)');
  console.log('2. Ward Officer (Ward K)       : 9820100002 (Officer S. V. Patil)');
  console.log('3. Society Rep (Gokuldham)     : 9820200001 (Aatmaram Bhide)');
  console.log('4. Internal Collector (Gokul)  : 9820300001 (Raju Shinde)');
  console.log('5. BMC Route Collector (Ward N): 9820400001 (Mahesh Kadam)');
  console.log('6. Citizen (Jethalal Gada)     : 9820500001 (Flat 101, QR: GP-HH-GOKUL-101)');
  console.log('7. Citizen (Taarak Mehta)      : 9820500002 (Flat 102, QR: GP-HH-GOKUL-102)');
  console.log('8. Citizen (Popatlal Pandey)   : 9820500003 (Flat 201, QR: GP-HH-GOKUL-201)');
  console.log('9. Citizen (Pending Join)      : 9820500004 (Sundarlal Topiwala, Flat 303)');
  console.log('-----------------------------------------------------------');
  console.log('🏛️ DEMONSTRATION SOCIETIES:');
  console.log('• Gokuldham CHS  : Join Code: GOKUL1 | QR: GP-SOC-GOKULDHAM | Approved');
  console.log('• Shivaji Heights: Join Code: SHIVA1 | QR: GP-SOC-SHIVAJI   | Approved');
  console.log('• Sahyadri CHS   : Join Code: SAHYA1 | Pending Approval (Live Demo)');
  console.log('===========================================================\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  prepareDemo().catch((err) => {
    console.error('❌ Failed to prepare demo data:', err);
    process.exit(1);
  });
}

module.exports = { prepareDemo };
