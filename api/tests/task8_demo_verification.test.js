// filepath: api/tests/task8_demo_verification.test.js
process.env.NODE_ENV = 'test';
require('dotenv').config();

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const User = require('../src/models/User');
const Society = require('../src/models/Society');
const Household = require('../src/models/Household');
const SocietyMembership = require('../src/models/SocietyMembership');
const CollectionPoint = require('../src/models/CollectionPoint');
const BulkCollection = require('../src/models/BulkCollection');
const HouseholdInspection = require('../src/models/HouseholdInspection');
const SocietyVoucher = require('../src/models/SocietyVoucher');
const SocietyPointEvent = require('../src/models/SocietyPointEvent');
const { getIstBusinessDate, getIstDayRange } = require('../src/utils/dateHelper');

const TEST_DB_NAME = 'greenpoint_task8_test_db';

let server;
let baseURL;

function makeToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      phone: user.phone,
      role: user.role,
      wardId: user.wardId
    },
    process.env.JWT_SECRET || 'test_jwt_secret',
    { expiresIn: '1h' }
  );
}

async function apiRequest(path, options = {}) {
  const { method = 'GET', token, body } = options;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseURL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

describe('Task 8: End-to-End Demo Verification & Accuracy Gaps Regression', () => {
  let officerN, officerK;
  let officerNToken, officerKToken;
  let repGokul, repGokulToken;
  let collectorGokul, collectorGokulToken;
  let bmcCollectorN, bmcCollectorNToken;
  let citizen1, citizen1Token;
  let citizen2, citizen2Token;
  let citizenInactive;
  let societyGokul, societyK;
  let household1, household2, householdInactive;
  let pointGokul;
  const todayStr = getIstBusinessDate();

  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri, { dbName: TEST_DB_NAME });

    // Clean test db
    await Promise.all([
      User.deleteMany({}),
      Society.deleteMany({}),
      Household.deleteMany({}),
      SocietyMembership.deleteMany({}),
      CollectionPoint.deleteMany({}),
      BulkCollection.deleteMany({}),
      HouseholdInspection.deleteMany({}),
      SocietyVoucher.deleteMany({}),
      SocietyPointEvent.deleteMany({})
    ]);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseURL = `http://127.0.0.1:${server.address().port}`;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Demo@GreenPoint2026', salt);

    // 1. Officers
    officerN = await User.create({
      name: 'Officer N-Ward',
      phone: '9820100081',
      role: 'officer',
      wardId: 'N-WARD',
      passwordHash,
      isActive: true
    });
    officerNToken = makeToken(officerN);

    officerK = await User.create({
      name: 'Officer K-Ward',
      phone: '9820100082',
      role: 'officer',
      wardId: 'K-WARD',
      passwordHash,
      isActive: true
    });
    officerKToken = makeToken(officerK);

    // 2. Representative & Collector
    repGokul = await User.create({
      name: 'Rep Gokuldham',
      phone: '9820200081',
      role: 'society_representative',
      wardId: 'N-WARD',
      passwordHash,
      isActive: true
    });
    repGokulToken = makeToken(repGokul);

    collectorGokul = await User.create({
      name: 'Collector Raju',
      phone: '9820300081',
      role: 'collector',
      wardId: 'N-WARD',
      collectorId: 'COL-INT-801',
      passwordHash,
      isActive: true
    });
    collectorGokulToken = makeToken(collectorGokul);

    // 3. BMC Collector
    bmcCollectorN = await User.create({
      name: 'BMC Collector Mahesh',
      phone: '9820400081',
      role: 'bmc_collector',
      wardId: 'N-WARD',
      collectorId: 'BMC-N-801',
      passwordHash,
      isActive: true
    });
    bmcCollectorNToken = makeToken(bmcCollectorN);

    // 4. Citizens (Active and Inactive)
    citizen1 = await User.create({
      name: 'Citizen Jetha',
      phone: '9820500081',
      role: 'citizen',
      wardId: 'N-WARD',
      passwordHash,
      isActive: true
    });
    citizen1Token = makeToken(citizen1);

    citizen2 = await User.create({
      name: 'Citizen Taarak',
      phone: '9820500082',
      role: 'citizen',
      wardId: 'N-WARD',
      passwordHash,
      isActive: true
    });
    citizen2Token = makeToken(citizen2);

    citizenInactive = await User.create({
      name: 'Citizen Inactive',
      phone: '9820500089',
      role: 'citizen',
      wardId: 'N-WARD',
      passwordHash,
      isActive: false // INACTIVE
    });

    // 5. Societies
    societyGokul = await Society.create({
      name: 'Gokuldham CHS Demo',
      address: 'Pant Nagar, Ghatkopar East',
      wardId: 'N-WARD',
      totalFlats: 30,
      registrationStatus: 'APPROVED',
      verificationStatus: 'approved',
      representativeId: repGokul._id,
      internalCollectorId: collectorGokul._id,
      pointsBalance: 0,
      joinCode: 'GOKUL8',
      qrCode: 'GP-SOC-GOKUL8'
    });

    const repK = await User.create({
      name: 'Rep Palm Beach',
      phone: '9820200082',
      role: 'society_representative',
      wardId: 'K-WARD',
      passwordHash,
      isActive: true
    });

    societyK = await Society.create({
      name: 'Palm Beach CHS Ward K',
      address: 'Andheri West',
      wardId: 'K-WARD',
      totalFlats: 40,
      registrationStatus: 'APPROVED',
      verificationStatus: 'approved',
      representativeId: repK._id,
      pointsBalance: 0,
      joinCode: 'PALMB8',
      qrCode: 'GP-SOC-PALMB8'
    });

    collectorGokul.assignedSocietyId = societyGokul._id;
    await collectorGokul.save();

    // 6. Collection Point
    pointGokul = await CollectionPoint.create({
      name: 'Gokuldham Collection Gate',
      address: 'Pant Nagar, Ghatkopar East',
      wardId: 'N-WARD',
      type: 'society',
      societyId: societyGokul._id,
      assignedCollectorId: bmcCollectorN._id,
      qrCode: societyGokul.qrCode,
      isActive: true
    });

    // 7. Households & Memberships
    household1 = await Household.create({
      citizenId: citizen1._id,
      address: 'Flat 101, Gokuldham CHS',
      wardId: 'N-WARD',
      societyId: societyGokul._id.toString(),
      societyRef: societyGokul._id,
      qrCode: 'GP-HH-GOKUL-101',
      isActive: true
    });

    household2 = await Household.create({
      citizenId: citizen2._id,
      address: 'Flat 102, Gokuldham CHS',
      wardId: 'N-WARD',
      societyId: societyGokul._id.toString(),
      societyRef: societyGokul._id,
      qrCode: 'GP-HH-GOKUL-102',
      isActive: true
    });

    householdInactive = await Household.create({
      citizenId: citizenInactive._id,
      address: 'Flat 999, Gokuldham CHS',
      wardId: 'N-WARD',
      societyId: societyGokul._id.toString(),
      societyRef: societyGokul._id,
      qrCode: 'GP-HH-GOKUL-999',
      isActive: false // INACTIVE
    });

    await SocietyMembership.create([
      {
        citizenId: citizen1._id,
        societyId: societyGokul._id,
        householdId: household1._id,
        address: 'Flat 101, Gokuldham CHS',
        status: 'APPROVED',
        reviewedBy: repGokul._id
      },
      {
        citizenId: citizen2._id,
        societyId: societyGokul._id,
        householdId: household2._id,
        address: 'Flat 102, Gokuldham CHS',
        status: 'APPROVED',
        reviewedBy: repGokul._id
      },
      {
        citizenId: citizenInactive._id,
        societyId: societyGokul._id,
        householdId: householdInactive._id,
        address: 'Flat 999, Gokuldham CHS',
        status: 'APPROVED',
        reviewedBy: repGokul._id
      }
    ]);
  });

  // -----------------------------------------------------------
  // Gap 1: Inactive households/citizens excluded from approved totals
  // -----------------------------------------------------------
  it('1. Gap 1: Approved-household count strictly excludes inactive households and inactive citizens', async () => {
    const res = await apiRequest('/api/dashboard/ward-stats', { token: officerNToken });
    assert.equal(res.status, 200);
    // There are 3 APPROVED membership rows, but householdInactive is isActive: false and citizenInactive is isActive: false.
    // Valid approved households must be exactly 2 (household1 and household2).
    assert.equal(res.data.data.approvedHouseholds, 2);
  });

  // -----------------------------------------------------------
  // Gap 2 & Gap 3: Municipal Handover Outcomes & Manual Entries
  // -----------------------------------------------------------
  it('2. Gaps 2 & 3: Legacy/unclassified records and manual entries are handled accurately', async () => {
    const range = getIstDayRange(todayStr);

    // Seed 1 SEGREGATED, 1 MIXED, 1 NO_HANDOVER, 1 unclassified legacy, 1 manual operational collection
    await BulkCollection.create([
      {
        bmcCollectorId: bmcCollectorN._id,
        collectionPointId: pointGokul._id,
        societyId: societyGokul._id,
        outcome: 'SEGREGATED',
        wasteType: 'wet',
        weight: 40,
        weightBasis: 'MEASURED',
        pointsAwarded: 10,
        wardId: 'N-WARD',
        status: 'pending',
        requestId: 't8-bmc-seg-1',
        timestamp: new Date()
      },
      {
        bmcCollectorId: bmcCollectorN._id,
        collectionPointId: pointGokul._id,
        societyId: societyGokul._id,
        outcome: 'MIXED',
        wasteType: 'mixed',
        weight: 15,
        weightBasis: 'ESTIMATED',
        pointsAwarded: 0,
        notes: 'Mixed waste handover',
        wardId: 'N-WARD',
        status: 'pending',
        requestId: 't8-bmc-mix-1',
        timestamp: new Date()
      },
      {
        bmcCollectorId: bmcCollectorN._id,
        collectionPointId: pointGokul._id,
        societyId: societyGokul._id,
        outcome: 'NO_HANDOVER',
        notes: 'Gate locked, no handover',
        weight: 0,
        wardId: 'N-WARD',
        status: 'pending',
        requestId: 't8-bmc-noh-1',
        timestamp: new Date()
      },
      // Legacy unclassified record without structured outcome
      {
        bmcCollectorId: bmcCollectorN._id,
        collectionPointId: pointGokul._id,
        societyId: societyGokul._id,
        outcome: null, // Legacy unclassified
        wasteType: 'wet',
        weight: 30,
        wardId: 'N-WARD',
        status: 'pending',
        requestId: 't8-bmc-leg-1',
        timestamp: new Date()
      },
      // Manual entry with null societyId
      {
        bmcCollectorId: bmcCollectorN._id,
        collectionPointId: null,
        societyId: null,
        outcome: 'SEGREGATED',
        wasteType: 'bulk',
        weight: 25,
        wardId: 'N-WARD',
        status: 'pending',
        requestId: 't8-bmc-man-1',
        timestamp: new Date()
      }
    ]);

    const res = await apiRequest('/api/dashboard/ward-stats', { token: officerNToken });
    assert.equal(res.status, 200);
    const stats = res.data.data;

    // Total records logged today = 5
    assert.equal(stats.municipalHandoverRecordsToday, 5);

    // Successful handovers must explicitly match SEGREGATED or MIXED:
    // (segregated 40kg + mixed 15kg + manual segregated 25kg = 3 successful handovers).
    // NO_HANDOVER and legacy null outcome are NOT successful structured handovers.
    assert.equal(stats.successfulMunicipalHandoversToday, 3);

    // Distinct societies with successful handovers: only Gokuldham (manual has null societyId) = 1 distinct society!
    assert.equal(stats.distinctSocietiesMunicipalToday, 1);

    // Weight: 40 + 15 + 25 = 80 kg
    assert.equal(stats.municipalCollectedWeightToday, 80);

    // Manual/unlinked pickups: 1
    assert.equal(stats.unlinkedMunicipalPickupsToday, 1);
  });

  // -----------------------------------------------------------
  // Collector Audit Verification
  // -----------------------------------------------------------
  it('3. Collector Audit: Manual entries do NOT count as distinct assigned points covered', async () => {
    const res = await apiRequest('/api/dashboard/collector-audit', { token: officerNToken });
    assert.equal(res.status, 200);
    const bmcAudit = res.data.data.bmcCollectors.find(c => c.id === bmcCollectorN._id.toString());
    assert.ok(bmcAudit);

    // Points covered must be exactly 1 (pointGokul), excluding manual entry without collectionPointId
    assert.equal(bmcAudit.pointsCoveredToday, 1);
    assert.equal(bmcAudit.successfulHandoversToday, 3);
  });

  // -----------------------------------------------------------
  // Complete Role-to-Role E2E Flow
  // -----------------------------------------------------------
  it('4. E2E Workflow: Internal inspection -> BMC pickup -> Points earn -> Voucher redemption -> Officer fulfilment', async () => {
    // A. Internal Collector records household inspection (SEGREGATED)
    const inspRes = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collectorGokulToken,
      body: {
        qrCode: household1.qrCode,
        outcome: 'SEGREGATED',
        requestId: 'e2e-insp-req-1'
      }
    });
    assert.equal(inspRes.status, 200);
    assert.equal(inspRes.data.data.outcome, 'SEGREGATED');

    // B. BMC Collector records municipal pickup for Gokuldham
    // (Gokuldham gets credited +10 society points)
    societyGokul.pointsBalance = 0;
    await societyGokul.save();

    // Delete earlier bulk collections to test clean earning
    await BulkCollection.deleteMany({ societyId: societyGokul._id });

    const pickupRes = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorNToken,
      body: {
        collectionPointId: pointGokul._id.toString(),
        wasteType: 'wet',
        weight: 50,
        weightBasis: 'MEASURED',
        outcome: 'SEGREGATED',
        requestId: 'e2e-bmc-pickup-1'
      }
    });
    assert.equal(pickupRes.status, 201);
    assert.equal(pickupRes.data.pointsAwarded, 10);

    const socAfterPickup = await Society.findById(societyGokul._id);
    assert.equal(socAfterPickup.pointsBalance, 10);

    // C. Subsequent pickup on same day awards 0 extra points
    const secondPickupRes = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorNToken,
      body: {
        collectionPointId: pointGokul._id.toString(),
        wasteType: 'dry',
        weight: 20,
        weightBasis: 'MEASURED',
        outcome: 'SEGREGATED',
        requestId: 'e2e-bmc-pickup-2'
      }
    });
    assert.equal(secondPickupRes.status, 201);
    assert.equal(secondPickupRes.data.pointsAwarded, 0);

    const socAfterSecond = await Society.findById(societyGokul._id);
    assert.equal(socAfterSecond.pointsBalance, 10);

    // D. Society Representative redeems 10-point reward
    const redeemRes = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repGokulToken,
      body: {
        rewardId: 'DEMO-REWARD-10',
        requestId: 'e2e-vouch-req-1'
      }
    });
    assert.equal(redeemRes.status, 201);
    assert.equal(redeemRes.data.data.remainingBalance, 0);

    const issuedVoucher = redeemRes.data.data.voucher;
    assert.equal(issuedVoucher.status, 'ISSUED');

    // E. Ward Officer reviews the pickup (marks verified, points unchanged)
    const reviewRes = await apiRequest(`/api/bmc-collections/${pickupRes.data.data._id}/review`, {
      method: 'PATCH',
      token: officerNToken,
      body: {
        status: 'verified'
      }
    });
    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.data.data.status, 'verified');

    const socAfterReview = await Society.findById(societyGokul._id);
    assert.equal(socAfterReview.pointsBalance, 0); // Still 0 after review (no alteration)

    // F. Cross-ward officer cannot fulfil Gokuldham voucher
    const crossFulfilRes = await apiRequest(`/api/society-rewards/vouchers/${issuedVoucher._id}/fulfil`, {
      method: 'PATCH',
      token: officerKToken
    });
    assert.equal(crossFulfilRes.status, 403);

    // G. Same-ward Officer fulfils voucher
    const fulfilRes = await apiRequest(`/api/society-rewards/vouchers/${issuedVoucher._id}/fulfil`, {
      method: 'PATCH',
      token: officerNToken
    });
    assert.equal(fulfilRes.status, 200);
    assert.equal(fulfilRes.data.data.status, 'FULFILLED');

    // H. Second fulfilment attempt is rejected
    const repeatFulfilRes = await apiRequest(`/api/society-rewards/vouchers/${issuedVoucher._id}/fulfil`, {
      method: 'PATCH',
      token: officerNToken
    });
    assert.equal(repeatFulfilRes.status, 400);

    // I. Ward Overview metrics reflect exact state
    const finalStatsRes = await apiRequest('/api/dashboard/ward-stats', { token: officerNToken });
    assert.equal(finalStatsRes.status, 200);
    const finalStats = finalStatsRes.data.data;

    assert.equal(finalStats.societyPointsEarnedToday, 10);
    assert.equal(finalStats.societyPointsRedeemedToday, 10);
    assert.equal(finalStats.vouchersAwaitingFulfilment, 0);
    assert.equal(finalStats.vouchersFulfilled, 1);
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
});
