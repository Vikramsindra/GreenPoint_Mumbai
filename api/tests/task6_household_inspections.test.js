// filepath: api/tests/task6_household_inspections.test.js
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
const { getIstBusinessDate } = require('../src/utils/dateHelper');

const TEST_DB_NAME = 'greenpoint_task6_test_db';

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

describe('Task 6: Correct Household Inspection Outcomes & Accurate Collector Flow', () => {
  let rep1, rep1Token, society1Approved;
  let rep2, rep2Token, society2Approved;
  let collector1, collector1Token; // assigned to Society 1
  let collector2, collector2Token; // assigned to Society 2
  let bmcCollectorN, bmcCollectorNToken;
  let citizen1, citizen1Token, household1; // approved in Society 1
  let citizen2, citizen2Token, household2; // approved in Society 1
  let citizen3, citizen3Token, household3; // approved in Society 1
  let citizenOtherSoc, householdOtherSoc; // approved in Society 2
  let citizenPending, householdPending; // pending in Society 1

  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
    await mongoose.connect(mongoUri, { dbName: TEST_DB_NAME });

    // Clean test database collections
    await Promise.all([
      User.deleteMany({}),
      Society.deleteMany({}),
      Household.deleteMany({}),
      SocietyMembership.deleteMany({}),
      CollectionPoint.deleteMany({}),
      BulkCollection.deleteMany({}),
      SocietyPointEvent.deleteMany({}),
      SocietyVoucher.deleteMany({}),
      Violation.deleteMany({}),
      PointEvent.deleteMany({}),
      HouseholdInspection.deleteMany({})
    ]);

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 1. Seed Society 1 (Approved, 100 points balance)
    rep1 = await User.create({
      name: 'Rep One',
      phone: '9820022221',
      passwordHash: 'hashed',
      role: 'society_representative',
      wardId: 'N-WARD',
      isActive: true
    });
    rep1Token = makeToken(rep1);

    society1Approved = await Society.create({
      name: 'Gokul Palms CHS',
      address: 'Plot 10, N-Ward, Mumbai',
      wardId: 'N-WARD',
      representativeId: rep1._id,
      registrationStatus: 'APPROVED',
      qrCode: 'GP-SOC-PALMS01',
      joinCode: 'PALM01',
      pointsBalance: 100
    });

    // 2. Seed Society 2 (Approved in N-WARD, different society)
    rep2 = await User.create({
      name: 'Rep Two',
      phone: '9820022222',
      passwordHash: 'hashed',
      role: 'society_representative',
      wardId: 'N-WARD',
      isActive: true
    });
    rep2Token = makeToken(rep2);

    society2Approved = await Society.create({
      name: 'Green Meadows CHS',
      address: 'Plot 20, N-Ward, Mumbai',
      wardId: 'N-WARD',
      representativeId: rep2._id,
      registrationStatus: 'APPROVED',
      qrCode: 'GP-SOC-MEADOW02',
      joinCode: 'MEAD02',
      pointsBalance: 50
    });

    // 3. Seed Collectors
    collector1 = await User.create({
      name: 'Ramesh Internal Collector',
      phone: '9820033331',
      collectorId: 'COLL-INT-001',
      passwordHash: 'hashed',
      role: 'collector',
      wardId: 'N-WARD',
      assignedSocietyId: society1Approved._id,
      isActive: true
    });
    collector1Token = makeToken(collector1);
    society1Approved.internalCollectorId = collector1._id;
    await society1Approved.save();

    collector2 = await User.create({
      name: 'Suresh Internal Collector 2',
      phone: '9820033332',
      collectorId: 'COLL-INT-002',
      passwordHash: 'hashed',
      role: 'collector',
      wardId: 'N-WARD',
      assignedSocietyId: society2Approved._id,
      isActive: true
    });
    collector2Token = makeToken(collector2);
    society2Approved.internalCollectorId = collector2._id;
    await society2Approved.save();

    bmcCollectorN = await User.create({
      name: 'BMC Collector Vijay',
      phone: '9820044441',
      collectorId: 'COLL-BMC-001',
      passwordHash: 'hashed',
      role: 'bmc_collector',
      wardId: 'N-WARD',
      isActive: true
    });
    bmcCollectorNToken = makeToken(bmcCollectorN);

    // 4. Seed Approved Households in Society 1 (with preserved initial personal points)
    citizen1 = await User.create({
      name: 'Asha Citizen 101',
      phone: '9820055551',
      passwordHash: 'hashed',
      role: 'citizen',
      wardId: 'N-WARD',
      pointsBalance: 40, // Preserved historical personal points
      isActive: true
    });
    citizen1Token = makeToken(citizen1);

    household1 = await Household.create({
      citizenId: citizen1._id,
      address: 'Flat 101, Gokul Palms CHS, N-Ward',
      wardId: 'N-WARD',
      societyRef: society1Approved._id,
      qrCode: 'GP-HH-TESTPALMS101',
      isActive: true
    });

    await SocietyMembership.create({
      societyId: society1Approved._id,
      citizenId: citizen1._id,
      householdId: household1._id,
      address: household1.address,
      status: 'APPROVED',
      reviewedAt: new Date()
    });

    citizen2 = await User.create({
      name: 'Bhavin Citizen 102',
      phone: '9820055552',
      passwordHash: 'hashed',
      role: 'citizen',
      wardId: 'N-WARD',
      pointsBalance: 20,
      isActive: true
    });
    citizen2Token = makeToken(citizen2);

    household2 = await Household.create({
      citizenId: citizen2._id,
      address: 'Flat 102, Gokul Palms CHS, N-Ward',
      wardId: 'N-WARD',
      societyRef: society1Approved._id,
      qrCode: 'GP-HH-TESTPALMS102',
      isActive: true
    });

    await SocietyMembership.create({
      societyId: society1Approved._id,
      citizenId: citizen2._id,
      householdId: household2._id,
      address: household2.address,
      status: 'APPROVED',
      reviewedAt: new Date()
    });

    citizen3 = await User.create({
      name: 'Chetan Citizen 103',
      phone: '9820055553',
      passwordHash: 'hashed',
      role: 'citizen',
      wardId: 'N-WARD',
      pointsBalance: 0,
      isActive: true
    });
    citizen3Token = makeToken(citizen3);

    household3 = await Household.create({
      citizenId: citizen3._id,
      address: 'Flat 103, Gokul Palms CHS, N-Ward',
      wardId: 'N-WARD',
      societyRef: society1Approved._id,
      qrCode: 'GP-HH-TESTPALMS103',
      isActive: true
    });

    await SocietyMembership.create({
      societyId: society1Approved._id,
      citizenId: citizen3._id,
      householdId: household3._id,
      address: household3.address,
      status: 'APPROVED',
      reviewedAt: new Date()
    });

    // 5. Seed Household in Other Society
    citizenOtherSoc = await User.create({
      name: 'Dinesh Meadows 201',
      phone: '9820055554',
      passwordHash: 'hashed',
      role: 'citizen',
      wardId: 'N-WARD',
      pointsBalance: 10,
      isActive: true
    });

    householdOtherSoc = await Household.create({
      citizenId: citizenOtherSoc._id,
      address: 'Flat 201, Green Meadows CHS, N-Ward',
      wardId: 'N-WARD',
      societyRef: society2Approved._id,
      qrCode: 'GP-HH-TESTMEADOWS201',
      isActive: true
    });

    await SocietyMembership.create({
      societyId: society2Approved._id,
      citizenId: citizenOtherSoc._id,
      householdId: householdOtherSoc._id,
      address: householdOtherSoc.address,
      status: 'APPROVED',
      reviewedAt: new Date()
    });

    // 6. Seed Household with PENDING membership in Society 1
    citizenPending = await User.create({
      name: 'Esha Pending 104',
      phone: '9820055555',
      passwordHash: 'hashed',
      role: 'citizen',
      wardId: 'N-WARD',
      pointsBalance: 0,
      isActive: true
    });

    householdPending = await Household.create({
      citizenId: citizenPending._id,
      address: 'Flat 104, Gokul Palms CHS, N-Ward',
      wardId: 'N-WARD',
      societyRef: society1Approved._id,
      qrCode: 'GP-HH-TESTPALMS104PENDING',
      isActive: true
    });

    await SocietyMembership.create({
      societyId: society1Approved._id,
      citizenId: citizenPending._id,
      householdId: householdPending._id,
      address: householdPending.address,
      status: 'PENDING'
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  // -------------------------------------------------------------
  // Test 1: SEGREGATED inspection persists without awarding points
  // -------------------------------------------------------------
  it('1. SEGREGATED inspection persists structured record and does NOT modify personal or society points', async () => {
    const socBefore = await Society.findById(society1Approved._id);
    const userBefore = await User.findById(citizen1._id);

    const res = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: {
        qrCode: household1.qrCode,
        outcome: 'SEGREGATED',
        notes: 'Dry and wet cleanly separated in colour bins',
        weightKg: 2.5,
        requestId: 'req-h1-seg-001'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.match(res.data.message, /Participation recorded/i);
    assert.equal(res.data.data.pointsEarned, 0);

    // Verify HouseholdInspection persisted in DB
    const saved = await HouseholdInspection.findOne({ householdId: household1._id });
    assert.ok(saved);
    assert.equal(saved.outcome, 'SEGREGATED');
    assert.equal(saved.notes, 'Dry and wet cleanly separated in colour bins');
    assert.equal(saved.weightKg, 2.5);
    assert.equal(saved.collectorId.toString(), collector1._id.toString());
    assert.equal(saved.societyId.toString(), society1Approved._id.toString());
    assert.equal(saved.istBusinessDate, getIstBusinessDate(new Date()));

    // Verify Society.pointsBalance is completely unchanged
    const socAfter = await Society.findById(society1Approved._id);
    assert.equal(socAfter.pointsBalance, socBefore.pointsBalance);

    // Verify User.pointsBalance is completely unchanged
    const userAfter = await User.findById(citizen1._id);
    assert.equal(userAfter.pointsBalance, userBefore.pointsBalance);

    // Verify no new PointEvents were created
    const pointEvents = await PointEvent.find({ userId: citizen1._id });
    assert.equal(pointEvents.length, 0);

    // Verify totalScans incremented on household
    const hhAfter = await Household.findById(household1._id);
    assert.equal(hhAfter.totalScans, 1);
  });

  // -------------------------------------------------------------
  // Test 2: MIXED inspection requires notes and issues NO automatic fines
  // -------------------------------------------------------------
  it('2. MIXED inspection requires explanatory note, persists outcome, and creates no fines/penalties', async () => {
    // 2a. Attempt MIXED without note -> 400 Bad Request
    const resNoNote = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: {
        qrCode: household2.qrCode,
        outcome: 'MIXED',
        notes: '', // Empty note
        requestId: 'req-h2-mix-fail'
      }
    });
    assert.equal(resNoNote.status, 400);
    assert.match(resNoNote.data.message, /explanatory note is required/i);

    // 2b. Submit MIXED with valid note
    const userBefore = await User.findById(citizen2._id);
    const socBefore = await Society.findById(society1Approved._id);

    const res = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: {
        qrCode: household2.qrCode,
        outcome: 'MIXED',
        notes: 'Plastic packaging inside compostable container; advised resident',
        weightKg: 3.0,
        requestId: 'req-h2-mix-002'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.match(res.data.message, /Participation recorded/i);
    assert.equal(res.data.data.pointsEarned, 0);

    // Verify persisted record
    const saved = await HouseholdInspection.findOne({ householdId: household2._id });
    assert.ok(saved);
    assert.equal(saved.outcome, 'MIXED');
    assert.equal(saved.notes, 'Plastic packaging inside compostable container; advised resident');

    // Verify no automatic violation or penalty deduction was created
    const violations = await Violation.find({ citizenId: citizen2._id });
    assert.equal(violations.length, 0);

    const userAfter = await User.findById(citizen2._id);
    assert.equal(userAfter.pointsBalance, userBefore.pointsBalance);

    const socAfter = await Society.findById(society1Approved._id);
    assert.equal(socAfter.pointsBalance, socBefore.pointsBalance);
  });

  // -------------------------------------------------------------
  // Test 3: NO_HANDOVER requires reason and records 0 weight
  // -------------------------------------------------------------
  it('3. NO_HANDOVER requires reason and rejects collected weight > 0', async () => {
    // 3a. NO_HANDOVER without note -> 400
    const resNoNote = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: {
        qrCode: household3.qrCode,
        outcome: 'NO_HANDOVER',
        notes: '   ',
        requestId: 'req-h3-fail'
      }
    });
    assert.equal(resNoNote.status, 400);
    assert.match(resNoNote.data.message, /explanatory note is required/i);

    // 3b. NO_HANDOVER with weight > 0 -> 400
    const resWeightFail = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: {
        qrCode: household3.qrCode,
        outcome: 'NO_HANDOVER',
        notes: 'Resident traveling, locked',
        weightKg: 5.0,
        requestId: 'req-h3-weight-fail'
      }
    });
    assert.equal(resWeightFail.status, 400);
    assert.match(resWeightFail.data.message, /weight cannot be recorded/i);

    // 3c. Valid NO_HANDOVER
    const res = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: {
        qrCode: household3.qrCode,
        outcome: 'NO_HANDOVER',
        notes: 'Door locked, resident out of town for the week',
        weightKg: 0,
        requestId: 'req-h3-valid-003'
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.outcome, 'NO_HANDOVER');

    const saved = await HouseholdInspection.findOne({ householdId: household3._id });
    assert.ok(saved);
    assert.equal(saved.outcome, 'NO_HANDOVER');
    assert.equal(saved.weightKg, 0);
  });

  // -------------------------------------------------------------
  // Test 4: List selection fallback (householdId) uses same authorisation
  // -------------------------------------------------------------
  it('4. List selection fallback via householdId resolves and inspects with identical scope rules', async () => {
    // Collector 1 resolves household 1 via GET /api/households/resolve/:idOrQr
    const resResolve = await apiRequest(`/api/households/resolve/${household1._id}`, {
      token: collector1Token
    });
    assert.equal(resResolve.status, 200);
    assert.equal(resResolve.data.data.household.citizenName, citizen1.name);

    // Collector 1 attempts to resolve a household from another society -> 403
    const resResolveOther = await apiRequest(`/api/households/resolve/${householdOtherSoc._id}`, {
      token: collector1Token
    });
    assert.equal(resResolveOther.status, 403);
    assert.match(resResolveOther.data.message, /does not belong to your assigned/i);
  });

  // -------------------------------------------------------------
  // Test 5: Cross-society household scan denied (403)
  // -------------------------------------------------------------
  it('5. Internal collector cannot inspect household of another society', async () => {
    const res = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: {
        qrCode: householdOtherSoc.qrCode,
        outcome: 'SEGREGATED',
        requestId: 'req-cross-soc'
      }
    });
    assert.equal(res.status, 403);
    assert.match(res.data.message, /does not belong to your assigned housing society/i);
  });

  // -------------------------------------------------------------
  // Test 6: Pending membership household denied (403)
  // -------------------------------------------------------------
  it('6. Internal collector cannot inspect household with pending membership', async () => {
    const res = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: {
        qrCode: householdPending.qrCode,
        outcome: 'SEGREGATED',
        requestId: 'req-pending-soc'
      }
    });
    assert.equal(res.status, 403);
    assert.match(res.data.message, /approved membership/i);
  });

  // -------------------------------------------------------------
  // Test 7: BMC collector is denied household inspection (403)
  // -------------------------------------------------------------
  it('7. BMC collector cannot submit household inspections', async () => {
    const res = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: bmcCollectorNToken,
      body: {
        qrCode: household1.qrCode,
        outcome: 'SEGREGATED',
        requestId: 'req-bmc-denied'
      }
    });
    assert.equal(res.status, 403);
  });

  // -------------------------------------------------------------
  // Test 8: Daily uniqueness — duplicate scan today rejected (409)
  // -------------------------------------------------------------
  it('8. Repeated inspection on same IST business day returns 409 Conflict with saved outcome', async () => {
    // Household 1 was already inspected today in Test 1
    const res = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: {
        qrCode: household1.qrCode,
        outcome: 'SEGREGATED',
        requestId: 'req-new-attempt-today'
      }
    });
    assert.equal(res.status, 409);
    assert.match(res.data.message, /Already inspected today/i);
    assert.equal(res.data.data.savedOutcome, 'SEGREGATED');
  });

  // -------------------------------------------------------------
  // Test 9: Retry with same requestId replays original saved result (200)
  // -------------------------------------------------------------
  it('9. Retry with same requestId and payload returns original inspection idempotently', async () => {
    // Replay the exact request from Test 1 (req-h1-seg-001)
    const res = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: {
        qrCode: household1.qrCode,
        outcome: 'SEGREGATED',
        notes: 'Dry and wet cleanly separated in colour bins',
        requestId: 'req-h1-seg-001'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.isReplay, true);
    assert.equal(res.data.data.outcome, 'SEGREGATED');

    // Confirm database still contains only 1 inspection for household 1
    const count = await HouseholdInspection.countDocuments({ householdId: household1._id });
    assert.equal(count, 1);
  });

  // -------------------------------------------------------------
  // Test 10: Conflicting reuse of requestId returns 409 Conflict
  // -------------------------------------------------------------
  it('10. Conflicting reuse of requestId for different household/outcome returns 409 Conflict', async () => {
    // Attempt to reuse 'req-h1-seg-001' for household 2 with MIXED
    const res = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: {
        qrCode: household2.qrCode,
        outcome: 'MIXED',
        notes: 'Conflicting reuse attempt',
        requestId: 'req-h1-seg-001'
      }
    });
    assert.equal(res.status, 409);
    assert.match(res.data.message, /Conflict: Request ID has already been used/i);
  });

  // -------------------------------------------------------------
  // Test 11: Citizen sees only their own household inspection history
  // -------------------------------------------------------------
  it('11. Citizen retrieves read-only inspection history scoped strictly to own household', async () => {
    // Citizen 1 fetches own inspections
    const res1 = await apiRequest('/api/households/my-inspections', {
      token: citizen1Token
    });
    assert.equal(res1.status, 200);
    assert.equal(res1.data.success, true);
    assert.equal(res1.data.data.inspections.length, 1);
    assert.equal(res1.data.data.inspections[0].outcome, 'SEGREGATED');
    assert.match(res1.data.data.policyNote, /BMC-verified society handovers earn society points/i);

    // Citizen 2 fetches own inspections
    const res2 = await apiRequest('/api/households/my-inspections', {
      token: citizen2Token
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.data.data.inspections.length, 1);
    assert.equal(res2.data.data.inspections[0].outcome, 'MIXED');
    assert.equal(res2.data.data.inspections[0].householdId.toString(), household2._id.toString());
  });

  // -------------------------------------------------------------
  // Test 12: Representative sees today's participation counts for own society
  // -------------------------------------------------------------
  it('12. Representative views today’s participation metrics and recent household outcomes for own society', async () => {
    const res = await apiRequest('/api/societies/my/household-inspections', {
      token: rep1Token
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    const { stats, inspections, policyNote } = res.data.data;

    // Society 1 has 3 approved households (Flat 101, 102, 103)
    assert.equal(stats.totalAssigned, 3);
    assert.equal(stats.inspectedToday, 3);
    assert.equal(stats.segregatedToday, 1);
    assert.equal(stats.mixedToday, 1);
    assert.equal(stats.noHandoverToday, 1);
    assert.equal(stats.remainingToday, 0);
    assert.equal(inspections.length, 3);
    assert.match(policyNote, /Household records show participation/i);

    // Representative 2 sees only their own society (0 inspections today)
    const res2 = await apiRequest('/api/societies/my/household-inspections', {
      token: rep2Token
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.data.data.stats.inspectedToday, 0);
    assert.equal(res2.data.data.stats.totalAssigned, 1); // Only Dinesh Meadows
  });

  // -------------------------------------------------------------
  // Test 13: Collector round and history counts match persisted outcomes
  // -------------------------------------------------------------
  it('13. Collector round stats reflect accurate counts from HouseholdInspection documents', async () => {
    const resStats = await apiRequest('/api/points/collector-stats', {
      token: collector1Token
    });
    assert.equal(resStats.status, 200);
    const s = resStats.data.data;

    assert.equal(s.assignedHouseholds, 3);
    assert.equal(s.inspectedToday, 3);
    assert.equal(s.segregatedToday, 1);
    assert.equal(s.mixedToday, 1);
    assert.equal(s.noHandoverToday, 1);
    assert.equal(s.successfulHandoversToday, 2); // segregated + mixed
    assert.equal(s.remainingToday, 0);
    assert.equal(s.topHouseholdsToday.length, 3);

    // Collector history endpoint
    const resHist = await apiRequest('/api/points/collector-history', {
      token: collector1Token
    });
    assert.equal(resHist.status, 200);
    assert.equal(resHist.data.data.inspections.length, 3);
  });

  // -------------------------------------------------------------
  // Test 14: Direct violation write endpoint is disabled for the pilot
  // -------------------------------------------------------------
  it('14. Direct automated violation penalty write endpoint is disabled during society pilot', async () => {
    const res = await apiRequest('/api/violations/log', {
      method: 'POST',
      token: collector1Token,
      body: {
        citizenId: citizen1._id.toString(),
        type: 'NON_SEGREGATION'
      }
    });

    assert.equal(res.status, 403);
    assert.match(res.data.message, /Automated violation fines and penalty deductions are disabled/i);

    // Confirm no violation document was written
    const vCount = await Violation.countDocuments({ citizenId: citizen1._id });
    assert.equal(vCount, 0);
  });
});
