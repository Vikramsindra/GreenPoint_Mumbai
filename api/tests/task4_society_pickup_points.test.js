// filepath: api/tests/task4_society_pickup_points.test.js
process.env.NODE_ENV = 'test';
require('dotenv').config();

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = require('../src/app');
const User = require('../src/models/User');
const Society = require('../src/models/Society');
const Household = require('../src/models/Household');
const SocietyMembership = require('../src/models/SocietyMembership');
const CollectionPoint = require('../src/models/CollectionPoint');
const BulkCollection = require('../src/models/BulkCollection');
const SocietyPointEvent = require('../src/models/SocietyPointEvent');
const {
  generateQRCodeString,
  generateSocietyQRCodeString,
  generateSocietyJoinCode,
  generateQRCodeImage
} = require('../src/utils/qrGenerator');
const { getIstBusinessDate } = require('../src/utils/dateHelper');

const TEST_DB_NAME = 'greenpoint_task4_test_db';

let server;
let baseURL;

// Test Actors
let officerN, officerNToken;
let officerS, officerSToken;
let repN, repNToken;
let repS, repSToken;
let citizenN, citizenNToken;
let bmcCollectorN1, bmcCollectorN1Token;
let bmcCollectorN2, bmcCollectorN2Token;
let bmcCollectorS1, bmcCollectorS1Token;
let internalCollectorN, internalCollectorNToken;

let societyN, pointN;
let societyS, pointS;

async function apiRequest(path, options = {}) {
  const { method = 'GET', body, token, headers = {} } = options;
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseURL}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    body: data
  };
}

function makeToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      wardId: user.wardId
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '2h' }
  );
}

describe('Task 4: BMC Society QR Verification & Society-Level Points', () => {
  before(async () => {
    const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const testURI = rawUri.replace(/\/[^/?]+(\?|$)/, `/${TEST_DB_NAME}$1`);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testURI);

    // Clean test database collections
    await User.deleteMany({});
    await Society.deleteMany({});
    await Household.deleteMany({});
    await SocietyMembership.deleteMany({});
    await CollectionPoint.deleteMany({});
    await BulkCollection.deleteMany({});
    await SocietyPointEvent.deleteMany({});

    // Start HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseURL = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    const hash = await bcrypt.hash('Secret@123', 6);

    // 1. Officers
    officerN = await User.create({
      name: 'Officer North',
      phone: '9900000001',
      passwordHash: hash,
      role: 'officer',
      wardId: 'N-WARD',
      isActive: true
    });
    officerNToken = makeToken(officerN);

    officerS = await User.create({
      name: 'Officer South',
      phone: '9900000002',
      passwordHash: hash,
      role: 'officer',
      wardId: 'S-WARD',
      isActive: true
    });
    officerSToken = makeToken(officerS);

    // 2. Representatives
    repN = await User.create({
      name: 'Rep North Society',
      phone: '9900000003',
      passwordHash: hash,
      role: 'society_representative',
      wardId: 'N-WARD',
      pointsBalance: 0,
      isActive: true
    });
    repNToken = makeToken(repN);

    repS = await User.create({
      name: 'Rep South Society',
      phone: '9900000004',
      passwordHash: hash,
      role: 'society_representative',
      wardId: 'S-WARD',
      pointsBalance: 0,
      isActive: true
    });
    repSToken = makeToken(repS);

    // 3. Citizen
    citizenN = await User.create({
      name: 'Citizen North',
      phone: '9900000005',
      passwordHash: hash,
      role: 'citizen',
      wardId: 'N-WARD',
      pointsBalance: 50,
      isActive: true
    });
    citizenNToken = makeToken(citizenN);

    // 4. Internal Collector
    internalCollectorN = await User.create({
      name: 'Collector Internal',
      phone: '9900000006',
      passwordHash: hash,
      role: 'collector',
      collectorId: 'COL-INT-1',
      wardId: 'N-WARD',
      isActive: true
    });
    internalCollectorNToken = makeToken(internalCollectorN);

    // 5. BMC Collectors
    bmcCollectorN1 = await User.create({
      name: 'BMC Collector N1',
      phone: '9900000007',
      passwordHash: hash,
      role: 'bmc_collector',
      collectorId: 'BMC-N-01',
      wardId: 'N-WARD',
      isActive: true
    });
    bmcCollectorN1Token = makeToken(bmcCollectorN1);

    bmcCollectorN2 = await User.create({
      name: 'BMC Collector N2',
      phone: '9900000008',
      passwordHash: hash,
      role: 'bmc_collector',
      collectorId: 'BMC-N-02',
      wardId: 'N-WARD',
      isActive: true
    });
    bmcCollectorN2Token = makeToken(bmcCollectorN2);

    bmcCollectorS1 = await User.create({
      name: 'BMC Collector S1',
      phone: '9900000009',
      passwordHash: hash,
      role: 'bmc_collector',
      collectorId: 'BMC-S-01',
      wardId: 'S-WARD',
      isActive: true
    });
    bmcCollectorS1Token = makeToken(bmcCollectorS1);

    // 6. Society North & Linked Point
    societyN = await Society.create({
      name: 'Green Heights CHS',
      address: '100 Ghatkopar West, Mumbai',
      wardId: 'N-WARD',
      representativeId: repN._id,
      registrationStatus: 'APPROVED',
      qrCode: generateSocietyQRCodeString(),
      joinCode: generateSocietyJoinCode(),
      pointsBalance: 0,
      submittedAt: new Date(),
      reviewedBy: officerN._id,
      reviewedAt: new Date()
    });

    pointN = await CollectionPoint.create({
      name: 'Green Heights CHS',
      type: 'society',
      wardId: 'N-WARD',
      address: societyN.address,
      societyId: societyN._id,
      assignedCollectorId: bmcCollectorN1._id,
      isActive: true
    });

    societyN.collectionPointId = pointN._id;
    await societyN.save();

    // 7. Society South & Linked Point
    societyS = await Society.create({
      name: 'Sea Breeze CHS',
      address: '200 Marine Drive, Mumbai',
      wardId: 'S-WARD',
      representativeId: repS._id,
      registrationStatus: 'APPROVED',
      qrCode: generateSocietyQRCodeString(),
      joinCode: generateSocietyJoinCode(),
      pointsBalance: 0,
      submittedAt: new Date(),
      reviewedBy: officerS._id,
      reviewedAt: new Date()
    });

    pointS = await CollectionPoint.create({
      name: 'Sea Breeze CHS',
      type: 'society',
      wardId: 'S-WARD',
      address: societyS.address,
      societyId: societyS._id,
      assignedCollectorId: bmcCollectorS1._id,
      isActive: true
    });

    societyS.collectionPointId = pointS._id;
    await societyS.save();
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  // -------------------------------------------------------------
  // Test 1: Resolution of Approved Society QR
  // -------------------------------------------------------------
  it('1. Assigned BMC collector can resolve an approved society QR code', async () => {
    const res = await apiRequest('/api/bmc-collections/resolve-society-qr', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: { qrCode: societyN.qrCode }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.societyId, societyN._id.toString());
    assert.equal(res.body.data.societyName, 'Green Heights CHS');
    assert.equal(res.body.data.collectionPointId, pointN._id.toString());
    assert.equal(res.body.data.pointsBalance, 0);
    assert.equal(res.body.data.alreadyAwardedToday, false);
  });

  // -------------------------------------------------------------
  // Test 2: Rejection of Household and Unknown QR codes
  // -------------------------------------------------------------
  it('2. Household QR codes (GP-HH-) and unknown codes are rejected with explicit guidance', async () => {
    // Household QR
    const hhRes = await apiRequest('/api/bmc-collections/resolve-society-qr', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: { qrCode: 'GP-HH-XYZ1234567' }
    });
    assert.equal(hhRes.status, 400);
    assert.match(hhRes.body.message, /Scan the society collection QR/i);

    // Non-society QR format
    const invalidRes = await apiRequest('/api/bmc-collections/resolve-society-qr', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: { qrCode: 'INVALID-CODE-123' }
    });
    assert.equal(invalidRes.status, 400);
    assert.match(invalidRes.body.message, /Invalid QR code format/i);

    // Unknown Society QR
    const unknownRes = await apiRequest('/api/bmc-collections/resolve-society-qr', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: { qrCode: 'GP-SOC-NONEXISTENT' }
    });
    assert.equal(unknownRes.status, 404);
    assert.match(unknownRes.body.message, /not found or not approved/i);
  });

  // -------------------------------------------------------------
  // Test 3: Unassigned collector and cross-ward resolution denied
  // -------------------------------------------------------------
  it('3. Unassigned BMC collector, cross-ward collector, and other roles are denied resolution', async () => {
    // BMC Collector N2 is in Ward N but not assigned to pointN
    const unassignedRes = await apiRequest('/api/bmc-collections/resolve-society-qr', {
      method: 'POST',
      token: bmcCollectorN2Token,
      body: { qrCode: societyN.qrCode }
    });
    assert.equal(unassignedRes.status, 403);
    assert.match(unassignedRes.body.message, /not assigned to you/i);

    // BMC Collector S1 is in Ward S (cross-ward)
    const crossWardRes = await apiRequest('/api/bmc-collections/resolve-society-qr', {
      method: 'POST',
      token: bmcCollectorS1Token,
      body: { qrCode: societyN.qrCode }
    });
    assert.equal(crossWardRes.status, 403);

    // Internal collector role is denied
    const internalRes = await apiRequest('/api/bmc-collections/resolve-society-qr', {
      method: 'POST',
      token: internalCollectorNToken,
      body: { qrCode: societyN.qrCode }
    });
    assert.equal(internalRes.status, 403);
  });

  // -------------------------------------------------------------
  // Test 4: First eligible segregated pickup awards 10 society points
  // -------------------------------------------------------------
  it('4. First eligible segregated pickup awards 10 society points to Society wallet', async () => {
    const res = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: {
        collectionPointId: pointN._id.toString(),
        outcome: 'SEGREGATED',
        wasteType: 'wet',
        weight: 35.5,
        weightBasis: 'MEASURED',
        notes: 'Clean wet waste handover in green municipal bins',
        requestId: 'req-test-pickup-01'
      }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.pointsAwarded, 10);
    assert.equal(res.body.pointsReason, '10 society points awarded');
    assert.equal(res.body.data.outcome, 'SEGREGATED');
    assert.equal(res.body.data.weight, 35.5);
    assert.equal(res.body.data.weightBasis, 'MEASURED');

    // Verify Society wallet is credited
    const updatedSoc = await Society.findById(societyN._id);
    assert.equal(updatedSoc.pointsBalance, 10);

    // Verify representative's personal user points balance is NOT credited (strictly 0)
    const repUser = await User.findById(repN._id);
    assert.equal(repUser.pointsBalance, 0);

    // Verify SocietyPointEvent ledger
    const ledger = await SocietyPointEvent.find({ societyId: societyN._id });
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].pointsAwarded, 10);
    assert.equal(ledger[0].istBusinessDate, getIstBusinessDate());
  });

  // -------------------------------------------------------------
  // Test 5: Second waste stream that day awards 0 extra points
  // -------------------------------------------------------------
  it('5. Second waste stream collection on same day saves record but awards 0 extra points', async () => {
    const res = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: {
        collectionPointId: pointN._id.toString(),
        outcome: 'SEGREGATED',
        wasteType: 'dry',
        weight: 18.2,
        weightBasis: 'ESTIMATED',
        notes: 'Dry recyclables pickup',
        requestId: 'req-test-pickup-02'
      }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.pointsAwarded, 0);
    assert.equal(res.body.pointsReason, 'Daily society reward already awarded');

    // Society balance remains 10 (not 20)
    const updatedSoc = await Society.findById(societyN._id);
    assert.equal(updatedSoc.pointsBalance, 10);

    // Only 1 positive event in SocietyPointEvent ledger
    const positiveLedger = await SocietyPointEvent.find({
      societyId: societyN._id,
      pointsAwarded: { $gt: 0 }
    });
    assert.equal(positiveLedger.length, 1);
  });

  // -------------------------------------------------------------
  // Test 6: Mixed handover awards zero points
  // -------------------------------------------------------------
  it('6. Mixed handover awards 0 society points', async () => {
    // For society S: first collection of day is MIXED
    const res = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorS1Token,
      body: {
        collectionPointId: pointS._id.toString(),
        outcome: 'MIXED',
        wasteType: 'mixed',
        weight: 42.0,
        weightBasis: 'MEASURED',
        notes: 'Commingled waste presented without segregation',
        requestId: 'req-test-pickup-03'
      }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.pointsAwarded, 0);
    assert.equal(res.body.pointsReason, 'Mixed handover: no points awarded');

    const updatedSocS = await Society.findById(societyS._id);
    assert.equal(updatedSocS.pointsBalance, 0);
  });

  // -------------------------------------------------------------
  // Test 7: Contradictory inputs rejected
  // -------------------------------------------------------------
  it('7. Contradictory inputs (outcome SEGREGATED with wasteType mixed) are rejected', async () => {
    const res = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: {
        collectionPointId: pointN._id.toString(),
        outcome: 'SEGREGATED',
        wasteType: 'mixed',
        weight: 20.0
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Contradictory handover/i);
  });

  // -------------------------------------------------------------
  // Test 8: NO_HANDOVER requires note, stores 0 weight, awards 0, and point remains pending
  // -------------------------------------------------------------
  it('8. NO_HANDOVER requires note, awards 0, records 0 weight, and leaves point pending', async () => {
    // Attempt without note should fail
    const failRes = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: {
        collectionPointId: pointN._id.toString(),
        outcome: 'NO_HANDOVER',
        notes: ''
      }
    });
    assert.equal(failRes.status, 400);

    // Create fresh uncollected point in Ward N
    const societyTemp = await Society.create({
      name: 'Temp CHS',
      address: '99 Road N',
      wardId: 'N-WARD',
      representativeId: new mongoose.Types.ObjectId(),
      registrationStatus: 'APPROVED',
      qrCode: generateSocietyQRCodeString(),
      pointsBalance: 0
    });
    const pointTemp = await CollectionPoint.create({
      name: 'Temp Point',
      type: 'society',
      wardId: 'N-WARD',
      address: '99 Road N',
      societyId: societyTemp._id,
      assignedCollectorId: bmcCollectorN1._id,
      isActive: true
    });

    const successRes = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: {
        collectionPointId: pointTemp._id.toString(),
        outcome: 'NO_HANDOVER',
        notes: 'Society gates closed, security guard stated bins empty',
        requestId: 'req-no-handover-01'
      }
    });

    assert.equal(successRes.status, 201);
    assert.equal(successRes.body.pointsAwarded, 0);
    assert.equal(successRes.body.data.weight, 0);

    // Verify pointTemp status on assigned points endpoint is still 'pending'
    const pointsRes = await apiRequest('/api/bmc-collections/points/assigned', {
      token: bmcCollectorN1Token
    });
    const fetchedPoint = pointsRes.body.data.find(p => p._id.toString() === pointTemp._id.toString());
    assert.equal(fetchedPoint.status, 'pending');
  });

  // -------------------------------------------------------------
  // Test 9: Manual operational entry earns 0 points
  // -------------------------------------------------------------
  it('9. Manual operational entry without assigned point earns 0 points', async () => {
    const res = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: {
        manualPointName: 'Dadar Market Bin #4',
        outcome: 'SEGREGATED',
        wasteType: 'wet',
        weight: 50.0,
        requestId: 'req-manual-01'
      }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.pointsAwarded, 0);
    assert.match(res.body.pointsReason, /Manual operational entry/i);
  });

  // -------------------------------------------------------------
  // Test 10: Idempotent Retries
  // -------------------------------------------------------------
  it('10. Idempotent retries of the same request return existing result without duplicate reward', async () => {
    const initialSoc = await Society.findById(societyN._id);
    const initialBalance = initialSoc.pointsBalance;

    // First attempt
    const res1 = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: {
        collectionPointId: pointN._id.toString(),
        outcome: 'SEGREGATED',
        wasteType: 'bulk',
        weight: 10.0,
        requestId: 'req-idempotent-repeat-test'
      }
    });

    assert.equal(res1.status, 201);

    // Retry with exact same requestId
    const res2 = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorN1Token,
      body: {
        collectionPointId: pointN._id.toString(),
        outcome: 'SEGREGATED',
        wasteType: 'bulk',
        weight: 10.0,
        requestId: 'req-idempotent-repeat-test'
      }
    });

    assert.equal(res2.status, 200);
    assert.equal(res2.body.isDuplicate, true);
    assert.equal(res2.body.data._id.toString(), res1.body.data._id.toString());

    // Society balance did not increment on retry
    const finalSoc = await Society.findById(societyN._id);
    assert.equal(finalSoc.pointsBalance, initialBalance);
  });

  // -------------------------------------------------------------
  // Test 11: Representative views their own society's handovers & balance
  // -------------------------------------------------------------
  it('11. Representative can view only their own society handovers and points balance', async () => {
    const res = await apiRequest('/api/societies/my/handovers', {
      token: repNToken
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.society.name, 'Green Heights CHS');
    assert.equal(res.body.data.pointsBalance, 10);
    assert.ok(res.body.data.handovers.length >= 2);

    // Each handover has outcome and points info
    const firstHandover = res.body.data.handovers[0];
    assert.ok(firstHandover.outcome);
    assert.ok(firstHandover.bmcCollectorId);

    // Rep S views their society handovers (isolated)
    const resS = await apiRequest('/api/societies/my/handovers', {
      token: repSToken
    });
    assert.equal(resS.status, 200);
    assert.equal(resS.body.data.society.name, 'Sea Breeze CHS');
    assert.equal(resS.body.data.handovers.length, 1);
    assert.equal(resS.body.data.handovers[0].outcome, 'MIXED');
  });

  // -------------------------------------------------------------
  // Test 12: Officer assigns active BMC collector in their ward
  // -------------------------------------------------------------
  it('12. Officer assigns active BMC collector to society collection point within ward', async () => {
    // Officer N assigns bmcCollectorN2 to pointN
    const assignRes = await apiRequest(`/api/collection-points/${pointN._id}/assign`, {
      method: 'PUT',
      token: officerNToken,
      body: { bmcCollectorId: bmcCollectorN2._id.toString() }
    });

    assert.equal(assignRes.status, 200);
    assert.equal(assignRes.body.success, true);

    const updatedPoint = await CollectionPoint.findById(pointN._id);
    assert.equal(updatedPoint.assignedCollectorId.toString(), bmcCollectorN2._id.toString());

    // Now bmcCollectorN2 can resolve societyN QR
    const resolveRes = await apiRequest('/api/bmc-collections/resolve-society-qr', {
      method: 'POST',
      token: bmcCollectorN2Token,
      body: { qrCode: societyN.qrCode }
    });
    assert.equal(resolveRes.status, 200);
    assert.equal(resolveRes.body.success, true);

    // Cross-ward assignment: Officer S cannot assign to pointN in Ward N
    const crossAssignRes = await apiRequest(`/api/collection-points/${pointN._id}/assign`, {
      method: 'PUT',
      token: officerSToken,
      body: { bmcCollectorId: bmcCollectorS1._id.toString() }
    });
    assert.equal(crossAssignRes.status, 403);
  });
});
