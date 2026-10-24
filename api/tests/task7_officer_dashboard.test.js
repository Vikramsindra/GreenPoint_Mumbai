// filepath: api/tests/task7_officer_dashboard.test.js
process.env.NODE_ENV = 'test';
require('dotenv').config();

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// App & Models
const app = require('../src/app');
const User = require('../src/models/User');
const Society = require('../src/models/Society');
const Household = require('../src/models/Household');
const SocietyMembership = require('../src/models/SocietyMembership');
const CollectionPoint = require('../src/models/CollectionPoint');
const BulkCollection = require('../src/models/BulkCollection');
const SocietyPointEvent = require('../src/models/SocietyPointEvent');
const SocietyVoucher = require('../src/models/SocietyVoucher');
const Violation = require('../src/models/Violation');
const PointEvent = require('../src/models/PointEvent');
const HouseholdInspection = require('../src/models/HouseholdInspection');
const { getIstBusinessDate, getIstDayRange } = require('../src/utils/dateHelper');

const TEST_DB_NAME = 'greenpoint_task7_test_db';

let server;
let baseUrl;

function makeToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      phone: user.phone,
      role: user.role,
      wardId: user.wardId
    },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
}

async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  return {
    status: res.status,
    data
  };
}

describe('Task 7: Accurate Officer Dashboard & Connected Monitoring', () => {
  // Test Fixtures
  let officerN, officerNToken;
  let officerK, officerKToken;

  let repN1, repN2, repK1;
  let societyN1, societyN2, societyN3Pending, societyK1;
  let pointN1, pointN2, pointK1;

  let collectorN1, bmcCollectorN;
  let collectorK1, bmcCollectorK;

  let citizenN1, householdN1;
  let citizenN2, householdN2;
  let citizenN3Pending, householdN3Pending;
  let citizenK1, householdK1;

  let pickupN1, pickupN3Mixed, pickupN4NoHandover, pickupN5Manual;
  let voucherIssued, voucherExpired, voucherFulfilled;

  before(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri, { dbName: TEST_DB_NAME });

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Clean DB
    await Promise.all([
      User.deleteMany({}),
      Society.deleteMany({}),
      Household.deleteMany({}),
      SocietyMembership.deleteMany({}),
      CollectionPoint.deleteMany({}),
      BulkCollection.deleteMany({}),
      SocietyPointEvent.deleteMany({}),
      SocietyVoucher.deleteMany({}),
      HouseholdInspection.deleteMany({}),
      Violation.deleteMany({}),
      PointEvent.deleteMany({})
    ]);

    // 1. Officers
    officerN = await User.create({
      name: 'Pooja Officer N',
      phone: '9820077001',
      passwordHash: 'hashed',
      role: 'officer',
      wardId: 'N-WARD',
      officerId: 'OFF-N-001',
      isActive: true
    });
    officerNToken = makeToken(officerN);

    officerK = await User.create({
      name: 'Ketan Officer K',
      phone: '9820077002',
      passwordHash: 'hashed',
      role: 'officer',
      wardId: 'K-WARD',
      officerId: 'OFF-K-001',
      isActive: true
    });
    officerKToken = makeToken(officerK);

    // 2. Representatives
    repN1 = await User.create({
      name: 'Anil Rep Palms',
      phone: '9820077011',
      passwordHash: 'hashed',
      role: 'society_representative',
      wardId: 'N-WARD',
      isActive: true
    });

    repN2 = await User.create({
      name: 'Binod Rep Meadows',
      phone: '9820077012',
      passwordHash: 'hashed',
      role: 'society_representative',
      wardId: 'N-WARD',
      isActive: true
    });

    const repN3 = await User.create({
      name: 'Chandan Rep Sunrise',
      phone: '9820077014',
      passwordHash: 'hashed',
      role: 'society_representative',
      wardId: 'N-WARD',
      isActive: true
    });

    repK1 = await User.create({
      name: 'Kavita Rep Heights',
      phone: '9820077013',
      passwordHash: 'hashed',
      role: 'society_representative',
      wardId: 'K-WARD',
      isActive: true
    });

    // 3. Collectors
    collectorN1 = await User.create({
      name: 'Rajesh Internal N1',
      phone: '9820077021',
      passwordHash: 'hashed',
      role: 'collector',
      collectorId: 'COLL-INT-N1',
      wardId: 'N-WARD',
      isActive: true
    });

    bmcCollectorN = await User.create({
      name: 'Suresh BMC N',
      phone: '9820077022',
      passwordHash: 'hashed',
      role: 'bmc_collector',
      collectorId: 'COLL-BMC-N',
      wardId: 'N-WARD',
      isActive: true
    });

    collectorK1 = await User.create({
      name: 'Karan Internal K1',
      phone: '9820077023',
      passwordHash: 'hashed',
      role: 'collector',
      collectorId: 'COLL-INT-K1',
      wardId: 'K-WARD',
      isActive: true
    });

    bmcCollectorK = await User.create({
      name: 'Kishore BMC K',
      phone: '9820077024',
      passwordHash: 'hashed',
      role: 'bmc_collector',
      collectorId: 'COLL-BMC-K',
      wardId: 'K-WARD',
      isActive: true
    });

    // 4. Societies in Ward N and Ward K
    societyN1 = await Society.create({
      name: 'Gokul Palms CHS',
      address: 'Ghatkopar East, N-Ward',
      wardId: 'N-WARD',
      representativeId: repN1._id,
      registrationStatus: 'APPROVED',
      internalCollectorId: collectorN1._id,
      pointsBalance: 140,
      joinCode: 'PALMS77',
      qrCode: 'GP-SOC-TESTPALMS77'
    });
    collectorN1.assignedSocietyId = societyN1._id;
    await collectorN1.save();

    pointN1 = await CollectionPoint.create({
      name: 'Gokul Palms Gate 1',
      type: 'society',
      address: 'Ghatkopar East, N-Ward',
      wardId: 'N-WARD',
      societyId: societyN1._id,
      assignedCollectorId: bmcCollectorN._id,
      isActive: true
    });
    societyN1.collectionPointId = pointN1._id;
    await societyN1.save();

    societyN2 = await Society.create({
      name: 'Green Meadows CHS',
      address: 'Vikhroli West, N-Ward',
      wardId: 'N-WARD',
      representativeId: repN2._id,
      registrationStatus: 'APPROVED',
      pointsBalance: 80,
      joinCode: 'MEADOWS77',
      qrCode: 'GP-SOC-TESTMEADOWS77'
    });

    pointN2 = await CollectionPoint.create({
      name: 'Green Meadows Rear Gate',
      type: 'society',
      address: 'Vikhroli West, N-Ward',
      wardId: 'N-WARD',
      societyId: societyN2._id,
      assignedCollectorId: bmcCollectorN._id,
      isActive: true
    });
    societyN2.collectionPointId = pointN2._id;
    await societyN2.save();

    societyN3Pending = await Society.create({
      name: 'Sunrise Residency Pending',
      address: 'Pant Nagar, N-Ward',
      wardId: 'N-WARD',
      representativeId: repN3._id,
      registrationStatus: 'PENDING',
      pointsBalance: 0
    });

    // Other Ward Society
    societyK1 = await Society.create({
      name: 'Kandivali Heights CHS',
      address: 'Kandivali East, K-Ward',
      wardId: 'K-WARD',
      representativeId: repK1._id,
      registrationStatus: 'APPROVED',
      internalCollectorId: collectorK1._id,
      pointsBalance: 300,
      joinCode: 'HEIGHTS77',
      qrCode: 'GP-SOC-TESTHEIGHTS77'
    });
    pointK1 = await CollectionPoint.create({
      name: 'Kandivali Heights Gate A',
      type: 'society',
      address: 'Kandivali East, K-Ward',
      wardId: 'K-WARD',
      societyId: societyK1._id,
      assignedCollectorId: bmcCollectorK._id,
      isActive: true
    });
    societyK1.collectionPointId = pointK1._id;
    await societyK1.save();

    // 5. Member Households in Society N1
    citizenN1 = await User.create({
      name: 'Deepak Citizen 101',
      phone: '9820077031',
      passwordHash: 'hashed',
      role: 'citizen',
      wardId: 'N-WARD',
      pointsBalance: 40,
      isActive: true
    });
    householdN1 = await Household.create({
      citizenId: citizenN1._id,
      address: 'Flat 101, Gokul Palms CHS, N-Ward',
      wardId: 'N-WARD',
      societyRef: societyN1._id,
      qrCode: 'GP-HH-TEST701',
      isActive: true
    });
    await SocietyMembership.create({
      societyId: societyN1._id,
      citizenId: citizenN1._id,
      householdId: householdN1._id,
      address: householdN1.address,
      status: 'APPROVED',
      reviewedAt: new Date()
    });

    citizenN2 = await User.create({
      name: 'Geeta Citizen 102',
      phone: '9820077032',
      passwordHash: 'hashed',
      role: 'citizen',
      wardId: 'N-WARD',
      pointsBalance: 20,
      isActive: true
    });
    householdN2 = await Household.create({
      citizenId: citizenN2._id,
      address: 'Flat 102, Gokul Palms CHS, N-Ward',
      wardId: 'N-WARD',
      societyRef: societyN1._id,
      qrCode: 'GP-HH-TEST702',
      isActive: true
    });
    await SocietyMembership.create({
      societyId: societyN1._id,
      citizenId: citizenN2._id,
      householdId: householdN2._id,
      address: householdN2.address,
      status: 'APPROVED',
      reviewedAt: new Date()
    });

    // Pending Membership in Society N1
    citizenN3Pending = await User.create({
      name: 'Harish Pending 103',
      phone: '9820077033',
      passwordHash: 'hashed',
      role: 'citizen',
      wardId: 'N-WARD',
      pointsBalance: 0,
      isActive: true
    });
    householdN3Pending = await Household.create({
      citizenId: citizenN3Pending._id,
      address: 'Flat 103, Gokul Palms CHS, N-Ward',
      wardId: 'N-WARD',
      societyRef: societyN1._id,
      qrCode: 'GP-HH-TEST703PENDING',
      isActive: true
    });
    await SocietyMembership.create({
      societyId: societyN1._id,
      citizenId: citizenN3Pending._id,
      householdId: householdN3Pending._id,
      address: householdN3Pending.address,
      status: 'PENDING'
    });

    // Ward K Member Household
    citizenK1 = await User.create({
      name: 'Kiran Citizen K1',
      phone: '9820077034',
      passwordHash: 'hashed',
      role: 'citizen',
      wardId: 'K-WARD',
      pointsBalance: 50,
      isActive: true
    });
    householdK1 = await Household.create({
      citizenId: citizenK1._id,
      address: 'Flat 901, Kandivali Heights, K-Ward',
      wardId: 'K-WARD',
      societyRef: societyK1._id,
      qrCode: 'GP-HH-TESTK901',
      isActive: true
    });
    await SocietyMembership.create({
      societyId: societyK1._id,
      citizenId: citizenK1._id,
      householdId: householdK1._id,
      address: householdK1.address,
      status: 'APPROVED',
      reviewedAt: new Date()
    });

    // 6. Seed Household Inspections Today
    const todayStr = getIstBusinessDate();
    await HouseholdInspection.create([
      {
        householdId: householdN1._id,
        citizenId: citizenN1._id,
        societyId: societyN1._id,
        collectorId: collectorN1._id,
        outcome: 'SEGREGATED',
        notes: '',
        weightKg: 2.5,
        weightBasis: 'ESTIMATED',
        istBusinessDate: todayStr,
        inspectedAt: new Date(),
        requestId: 'req-insp-701'
      },
      {
        householdId: householdN2._id,
        citizenId: citizenN2._id,
        societyId: societyN1._id,
        collectorId: collectorN1._id,
        outcome: 'MIXED',
        notes: 'Dry and wet waste mixed in blue bin',
        weightKg: 1.8,
        weightBasis: 'ESTIMATED',
        istBusinessDate: todayStr,
        inspectedAt: new Date(),
        requestId: 'req-insp-702'
      },
      // Ward K inspection (must not leak into Ward N)
      {
        householdId: householdK1._id,
        citizenId: citizenK1._id,
        societyId: societyK1._id,
        collectorId: collectorK1._id,
        outcome: 'SEGREGATED',
        notes: '',
        weightKg: 3.0,
        weightBasis: 'MEASURED',
        istBusinessDate: todayStr,
        inspectedAt: new Date(),
        requestId: 'req-insp-k1'
      }
    ]);

    // 7. Seed Municipal Bulk Collections Today in Ward N
    // Pickup 1: Society N1, SEGREGATED, wet, 45 kg
    pickupN1 = await BulkCollection.create({
      bmcCollectorId: bmcCollectorN._id,
      collectionPointId: pointN1._id,
      societyId: societyN1._id,
      outcome: 'SEGREGATED',
      wasteType: 'wet',
      weight: 45,
      weightBasis: 'MEASURED',
      pointsAwarded: 10,
      pointsReason: '10 society points awarded',
      wardId: 'N-WARD',
      status: 'pending',
      requestId: 'req-bmc-701',
      timestamp: new Date()
    });

    // Pickup 2: Society N1 second stream, SEGREGATED, dry, 25 kg (same society, different record)
    await BulkCollection.create({
      bmcCollectorId: bmcCollectorN._id,
      collectionPointId: pointN1._id,
      societyId: societyN1._id,
      outcome: 'SEGREGATED',
      wasteType: 'dry',
      weight: 25,
      weightBasis: 'ESTIMATED',
      pointsAwarded: 0,
      pointsReason: 'Daily society reward already awarded',
      wardId: 'N-WARD',
      status: 'pending',
      requestId: 'req-bmc-702',
      timestamp: new Date()
    });

    // Pickup 3: Society N2, MIXED, mixed, 30 kg
    pickupN3Mixed = await BulkCollection.create({
      bmcCollectorId: bmcCollectorN._id,
      collectionPointId: pointN2._id,
      societyId: societyN2._id,
      outcome: 'MIXED',
      wasteType: 'mixed',
      weight: 30,
      weightBasis: 'ESTIMATED',
      pointsAwarded: 0,
      pointsReason: 'Mixed handover: no points awarded',
      wardId: 'N-WARD',
      status: 'pending',
      requestId: 'req-bmc-703',
      timestamp: new Date()
    });

    // Pickup 4: Society N2, NO_HANDOVER, 0 kg
    pickupN4NoHandover = await BulkCollection.create({
      bmcCollectorId: bmcCollectorN._id,
      collectionPointId: pointN2._id,
      societyId: societyN2._id,
      outcome: 'NO_HANDOVER',
      wasteType: 'mixed',
      weight: 0,
      weightBasis: 'ESTIMATED',
      pointsAwarded: 0,
      pointsReason: 'No handover recorded: 0 points awarded',
      notes: 'Society gate locked; contact unavailable',
      wardId: 'N-WARD',
      status: 'pending',
      requestId: 'req-bmc-704',
      timestamp: new Date()
    });

    // Pickup 5: Manual operational collection (unlinked society)
    pickupN5Manual = await BulkCollection.create({
      bmcCollectorId: bmcCollectorN._id,
      collectionPointId: null,
      societyId: null,
      outcome: 'SEGREGATED',
      wasteType: 'bulk',
      weight: 50,
      weightBasis: 'ESTIMATED',
      pointsAwarded: 0,
      notes: '[Unverified Manual: Pant Nagar Commercial Area] Garden pruning bulk waste',
      wardId: 'N-WARD',
      status: 'pending',
      requestId: 'req-bmc-705',
      timestamp: new Date()
    });

    // Ward K Collection (500 kg, must not leak into Ward N)
    const pickupK = await BulkCollection.create({
      bmcCollectorId: bmcCollectorK._id,
      collectionPointId: pointK1._id,
      societyId: societyK1._id,
      outcome: 'SEGREGATED',
      wasteType: 'wet',
      weight: 500,
      weightBasis: 'MEASURED',
      pointsAwarded: 10,
      wardId: 'K-WARD',
      status: 'pending',
      requestId: 'req-bmc-k1',
      timestamp: new Date()
    });

    // 8. Seed Society Vouchers in Ward N
    voucherIssued = await SocietyVoucher.create({
      voucherCode: 'GP-SOC-VOUCH-701',
      rewardId: 'composting-starter-kit',
      rewardName: 'Demo Composting Starter Kit',
      rewardDescription: 'Composting starter kit demo voucher',
      rewardCategory: 'INFRASTRUCTURE',
      pointsCost: 20,
      pointsSpent: 20,
      societyId: societyN1._id,
      representativeId: repN1._id,
      wardId: 'N-WARD',
      status: 'ISSUED',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Active 7 days
      requestId: 'vouch-req-701'
    });

    voucherExpired = await SocietyVoucher.create({
      voucherCode: 'GP-SOC-VOUCH-702-EXP',
      rewardId: 'aerobin-composter',
      rewardName: 'Demo Aerobin Composter',
      rewardDescription: 'Aerobin composter demo voucher',
      rewardCategory: 'INFRASTRUCTURE',
      pointsCost: 50,
      pointsSpent: 50,
      societyId: societyN2._id,
      representativeId: repN2._id,
      wardId: 'N-WARD',
      status: 'ISSUED',
      expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Expired 2 days ago
      requestId: 'vouch-req-702'
    });

    voucherFulfilled = await SocietyVoucher.create({
      voucherCode: 'GP-SOC-VOUCH-703-FUL',
      rewardId: 'recognition-certificate',
      rewardName: 'Demo Recognition Certificate',
      rewardDescription: 'Recognition certificate demo voucher',
      rewardCategory: 'RECOGNITION',
      pointsCost: 10,
      pointsSpent: 10,
      societyId: societyN1._id,
      representativeId: repN1._id,
      wardId: 'N-WARD',
      status: 'FULFILLED',
      fulfilledBy: officerN._id,
      fulfilledAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      requestId: 'vouch-req-703'
    });

    // 9. Seed Society Reward Events
    await SocietyPointEvent.create([
      {
        societyId: societyN1._id,
        collectionId: pickupN1._id,
        type: 'EARN',
        pointsAwarded: 10,
        pointsDeducted: 0,
        reason: '10 society points awarded',
        collectorId: bmcCollectorN._id,
        istBusinessDate: todayStr
      },
      {
        societyId: societyN1._id,
        voucherId: voucherIssued._id,
        representativeId: repN1._id,
        pointsAwarded: 0,
        pointsDeducted: 20,
        type: 'REDEEM',
        reason: 'Redeemed pilot composting-kit voucher',
        istBusinessDate: todayStr
      },
      // Ward K reward event
      {
        societyId: societyK1._id,
        collectionId: pickupK._id,
        type: 'EARN',
        pointsAwarded: 100,
        pointsDeducted: 0,
        reason: '100 points in Ward K',
        collectorId: bmcCollectorK._id,
        istBusinessDate: todayStr
      }
    ]);
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // -------------------------------------------------------------
  // Test 1: Strict Ward Scoping for Overview Metrics
  // -------------------------------------------------------------
  it('1. Officer GET /api/dashboard/ward-stats returns metrics strictly scoped to own ward', async () => {
    const res = await apiRequest('/api/dashboard/ward-stats', { token: officerNToken });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);

    const stats = res.data.data;
    assert.equal(stats.wardId, 'N-WARD');
    assert.equal(stats.approvedSocieties, 2); // Gokul Palms + Green Meadows (excludes Sunrise Residency Pending and Ward K)
    assert.equal(stats.pendingSocieties, 1);   // Sunrise Residency Pending

    // Society K1 (300 pts) in K-Ward must NOT be counted in Ward N wallet balance
    // Ward N balance = Gokul Palms (140) + Green Meadows (80) = 220
    assert.equal(stats.outstandingSocietyPointsBalance, 220);
  });

  // -------------------------------------------------------------
  // Test 2: Approved member households vs pending membership
  // -------------------------------------------------------------
  it('2. Approved households count includes approved members only (excludes pending requests)', async () => {
    const res = await apiRequest('/api/dashboard/ward-stats', { token: officerNToken });
    assert.equal(res.status, 200);

    const stats = res.data.data;
    // citizenN1 & citizenN2 are APPROVED; citizenN3 is PENDING in Society N1; citizenK1 is in K-Ward
    assert.equal(stats.approvedHouseholds, 2);
  });

  // -------------------------------------------------------------
  // Test 3: Household inspection counts come from real HouseholdInspection
  // -------------------------------------------------------------
  it('3. Household inspection metrics reflect real HouseholdInspection records and calculate segregation rate accurately', async () => {
    const res = await apiRequest('/api/dashboard/ward-stats', { token: officerNToken });
    assert.equal(res.status, 200);

    const stats = res.data.data;
    // 2 inspections in Ward N today (1 SEGREGATED, 1 MIXED, 0 NO_HANDOVER)
    assert.equal(stats.inspectedHouseholdsToday, 2);
    assert.equal(stats.segregatedHouseholdsToday, 1);
    assert.equal(stats.mixedHouseholdsToday, 1);
    assert.equal(stats.noHandoverHouseholdsToday, 0);
    assert.equal(stats.actualHouseholdHandoversToday, 2);

    // Segregation rate: 1 / (1 + 1) = 50%
    assert.equal(stats.householdSegregationRate, 50);
  });

  // -------------------------------------------------------------
  // Test 4: Municipal pickup counts distinguish distinct societies from total handover records
  // -------------------------------------------------------------
  it('4. Municipal pickups distinguish distinct societies from total handover records', async () => {
    const res = await apiRequest('/api/dashboard/ward-stats', { token: officerNToken });
    assert.equal(res.status, 200);

    const stats = res.data.data;
    // Pickups in Ward N:
    // N1 wet (45kg), N1 dry (25kg), N2 mixed (30kg), N2 no-handover (0kg), Manual bulk (50kg)
    // Total records = 5
    assert.equal(stats.municipalHandoverRecordsToday, 5);

    // Successful handovers (outcome !== 'NO_HANDOVER'): N1 wet, N1 dry, N2 mixed, Manual = 4
    assert.equal(stats.successfulMunicipalHandoversToday, 4);

    // Distinct societies with successful handovers: Society N1, Society N2 = 2 distinct societies
    assert.equal(stats.distinctSocietiesMunicipalToday, 2);

    // Unlinked/manual entry count: 1
    assert.equal(stats.unlinkedMunicipalPickupsToday, 1);
  });

  // -------------------------------------------------------------
  // Test 5: NO_HANDOVER contributes zero collected weight
  // -------------------------------------------------------------
  it('5. NO_HANDOVER contributes 0 kg collected weight to municipal total', async () => {
    const res = await apiRequest('/api/dashboard/ward-stats', { token: officerNToken });
    assert.equal(res.status, 200);

    const stats = res.data.data;
    // Collected weight = 45 (N1 wet) + 25 (N1 dry) + 30 (N2 mixed) + 0 (N2 no-handover) + 50 (Manual) = 150 kg
    // (Ward K's 500 kg is excluded)
    assert.equal(stats.municipalCollectedWeightToday, 150);
  });

  // -------------------------------------------------------------
  // Test 6: Society rewards earned, redeemed, and voucher fulfilment counts
  // -------------------------------------------------------------
  it('6. Society reward metrics track earned, redeemed, and unexpired awaiting-fulfilment vouchers', async () => {
    const res = await apiRequest('/api/dashboard/ward-stats', { token: officerNToken });
    assert.equal(res.status, 200);

    const stats = res.data.data;
    assert.equal(stats.societyPointsEarnedToday, 10);
    assert.equal(stats.societyPointsRedeemedToday, 20);

    // Vouchers in Ward N:
    // voucherIssued (ISSUED, unexpired) -> counts as awaiting fulfilment (1)
    // voucherExpired (ISSUED, expired 2 days ago) -> MUST NOT be counted as awaiting fulfilment
    // voucherFulfilled (FULFILLED) -> counts as fulfilled (1)
    assert.equal(stats.vouchersAwaitingFulfilment, 1);
    assert.equal(stats.vouchersFulfilled, 1);
  });

  // -------------------------------------------------------------
  // Test 7: Officer list of BMC collections with date, outcome, status filters
  // -------------------------------------------------------------
  it('7. Officer GET /api/bmc-collections/officer/list returns scoped records with filters', async () => {
    // 1. All today in Ward N
    const resAll = await apiRequest('/api/bmc-collections/officer/list?date=today', { token: officerNToken });
    assert.equal(resAll.status, 200);
    assert.equal(resAll.data.success, true);
    assert.equal(resAll.data.data.collections.length, 5);
    assert.equal(resAll.data.data.summary.totalWeight, 150);
    assert.equal(resAll.data.data.summary.successfulHandovers, 4);

    // 2. Filter by outcome = MIXED
    const resMixed = await apiRequest('/api/bmc-collections/officer/list?outcome=MIXED', { token: officerNToken });
    assert.equal(resMixed.status, 200);
    assert.equal(resMixed.data.data.collections.length, 1);
    assert.equal(resMixed.data.data.collections[0].outcome, 'MIXED');

    // 3. Filter by outcome = NO_HANDOVER
    const resNoHandover = await apiRequest('/api/bmc-collections/officer/list?outcome=NO_HANDOVER', { token: officerNToken });
    assert.equal(resNoHandover.status, 200);
    assert.equal(resNoHandover.data.data.collections.length, 1);
    assert.equal(resNoHandover.data.data.collections[0].outcome, 'NO_HANDOVER');
  });

  // -------------------------------------------------------------
  // Test 8: Same-ward officer can mark a pending pickup verified
  // -------------------------------------------------------------
  it('8. Same-ward officer can mark a pending pickup verified without altering points or weight', async () => {
    const originalPoints = pickupN1.pointsAwarded;
    const originalWeight = pickupN1.weight;

    const res = await apiRequest(`/api/bmc-collections/${pickupN1._id}/review`, {
      method: 'PATCH',
      token: officerNToken,
      body: {
        status: 'verified',
        notes: 'Verified against municipal manifest'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.status, 'verified');
    assert.equal(res.data.data.verifiedBy, officerN._id.toString());
    assert.equal(res.data.data.pointsAwarded, originalPoints);
    assert.equal(res.data.data.weight, originalWeight);
    assert.match(res.data.message, /Review records an operational decision/i);

    // Verify DB update
    const updated = await BulkCollection.findById(pickupN1._id);
    assert.equal(updated.status, 'verified');
    assert.equal(updated.verificationNotes, 'Verified against municipal manifest');
    assert.ok(updated.verifiedAt instanceof Date);
  });

  // -------------------------------------------------------------
  // Test 9: Rejection requires explanatory note
  // -------------------------------------------------------------
  it('9. Rejecting a pickup requires explanatory notes (at least 3 characters)', async () => {
    // Missing notes
    const resNoNote = await apiRequest(`/api/bmc-collections/${pickupN3Mixed._id}/review`, {
      method: 'PATCH',
      token: officerNToken,
      body: {
        status: 'rejected',
        notes: ''
      }
    });
    assert.equal(resNoNote.status, 400);

    // Short notes (< 3 chars)
    const resShortNote = await apiRequest(`/api/bmc-collections/${pickupN3Mixed._id}/review`, {
      method: 'PATCH',
      token: officerNToken,
      body: {
        status: 'rejected',
        notes: 'no'
      }
    });
    assert.equal(resShortNote.status, 400);

    // Valid rejection note
    const resValid = await apiRequest(`/api/bmc-collections/${pickupN3Mixed._id}/review`, {
      method: 'PATCH',
      token: officerNToken,
      body: {
        status: 'rejected',
        notes: 'Discrepancy with weighed receipt at transfer station'
      }
    });
    assert.equal(resValid.status, 200);
    assert.equal(resValid.data.data.status, 'rejected');
  });

  // -------------------------------------------------------------
  // Test 10: Pickup review does not adjust society wallet balance
  // -------------------------------------------------------------
  it('10. Officer pickup rejection does not revoke or modify Society.pointsBalance', async () => {
    const societyBefore = await Society.findById(societyN2._id);
    const balanceBefore = societyBefore.pointsBalance;

    // Reject pickupN4NoHandover
    const res = await apiRequest(`/api/bmc-collections/${pickupN4NoHandover._id}/review`, {
      method: 'PATCH',
      token: officerNToken,
      body: {
        status: 'rejected',
        notes: 'Rejection of no-handover attempt entry'
      }
    });
    assert.equal(res.status, 200);

    const societyAfter = await Society.findById(societyN2._id);
    assert.equal(societyAfter.pointsBalance, balanceBefore);
  });

  // -------------------------------------------------------------
  // Test 11: Second review on already-reviewed pickup is rejected (400)
  // -------------------------------------------------------------
  it('11. Second review cannot overwrite an already-completed decision', async () => {
    // pickupN1 is already 'verified' from Test 8
    const res = await apiRequest(`/api/bmc-collections/${pickupN1._id}/review`, {
      method: 'PATCH',
      token: officerNToken,
      body: {
        status: 'rejected',
        notes: 'Trying to change verification to rejection'
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.data.message, /Pickup has already been reviewed/i);
  });

  // -------------------------------------------------------------
  // Test 12: Cross-ward officer pickup review is forbidden (403)
  // -------------------------------------------------------------
  it('12. Officer from another ward cannot review a cross-ward pickup', async () => {
    // Officer K attempts to review Ward N pickup
    const res = await apiRequest(`/api/bmc-collections/${pickupN5Manual._id}/review`, {
      method: 'PATCH',
      token: officerKToken,
      body: {
        status: 'verified',
        notes: 'Cross-ward review attempt'
      }
    });

    assert.equal(res.status, 403);
    assert.match(res.data.message, /You are only authorized to review Ward K-WARD pickups/i);
  });

  // -------------------------------------------------------------
  // Test 13: Collector Audit endpoint separates internal and BMC collectors
  // -------------------------------------------------------------
  it('13. GET /api/dashboard/collector-audit accurately reports internal vs municipal activity', async () => {
    const res = await apiRequest('/api/dashboard/collector-audit', { token: officerNToken });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);

    const { internalCollectors, bmcCollectors, summary } = res.data.data;

    // Internal Collectors
    assert.equal(internalCollectors.length, 1);
    const intCol = internalCollectors[0];
    assert.equal(intCol.name, 'Rajesh Internal N1');
    assert.equal(intCol.assignedSociety?.name, 'Gokul Palms CHS');
    assert.equal(intCol.assignedHouseholds, 2); // Approved member households
    assert.equal(intCol.inspectedToday, 2);
    assert.equal(intCol.segregatedToday, 1);
    assert.equal(intCol.mixedToday, 1);
    assert.equal(intCol.noHandoverToday, 0);
    assert.equal(intCol.remainingToday, 0);

    // BMC Collectors
    assert.equal(bmcCollectors.length, 1);
    const bmcCol = bmcCollectors[0];
    assert.equal(bmcCol.name, 'Suresh BMC N');
    assert.equal(bmcCol.assignedPointsCount, 2); // Gokul Palms Gate 1 + Green Meadows Rear Gate
    assert.equal(bmcCol.handoversLoggedToday, 5); // 5 handovers logged by this collector
    assert.equal(bmcCol.successfulHandoversToday, 4);

    // Summary
    assert.equal(summary.totalInternalCollectors, 1);
    assert.equal(summary.activeInternalCollectorsToday, 1);
    assert.equal(summary.totalBmcCollectors, 1);
    assert.equal(summary.activeBmcCollectorsToday, 1);
  });

  // -------------------------------------------------------------
  // Test 14: Recent violations are strictly scoped to officer's ward
  // -------------------------------------------------------------
  it('14. GET /api/dashboard/recent-violations returns only citizens belonging to officer ward', async () => {
    // Seed a violation for Ward K citizen and Ward N citizen
    await Violation.create([
      {
        citizenId: citizenN1._id,
        collectorId: collectorN1._id,
        type: 'NON_SEGREGATION',
        tier: 1,
        offenceCountInWindow: 1,
        status: 'PENDING',
        fineAmount: 0
      },
      {
        citizenId: citizenK1._id,
        collectorId: collectorK1._id,
        type: 'BURNING',
        tier: 2,
        offenceCountInWindow: 2,
        status: 'FINE_ISSUED',
        fineAmount: 500
      }
    ]);

    const res = await apiRequest('/api/dashboard/recent-violations', { token: officerNToken });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);

    const violations = res.data.data;
    assert.equal(violations.length, 1);
    assert.equal(violations[0].citizenId._id, citizenN1._id.toString());
  });
});
