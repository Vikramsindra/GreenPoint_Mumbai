// filepath: api/tests/task3_role_boundaries.test.js
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
const Violation = require('../src/models/Violation');
const { generateQRCodeString, generateQRCodeImage } = require('../src/utils/qrGenerator');

const TEST_DB_NAME = 'greenpoint_task3_test_db';

let server;
let baseURL;

// Test actors
let officerN, officerNToken;
let officerS, officerSToken;
let citizenN, citizenNToken;
let citizenPending, citizenPendingToken;
let repN, repNToken;
let collectorN, collectorNToken;
let bmcCollectorN, bmcCollectorNToken;
let bmcCollectorS, bmcCollectorSToken;
let inactiveUser, inactiveUserToken;

let societyN, householdNApproved, householdNPending;
let pointN, unassignedPointN;

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

  return { status: res.status, headers: res.headers, data };
}

function makeToken(user, overrideClaims = {}) {
  return jwt.sign(
    {
      id: user._id.toString(),
      phone: user.phone,
      role: user.role,
      wardId: user.wardId,
      ...overrideClaims
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Task 3: Role Boundaries and Account State Verification', () => {
  before(async () => {
    const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const testUri = rawUri.replace(/\/[^/?]+(\?|$)/, `/${TEST_DB_NAME}$1`);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testUri);
    await mongoose.connection.db.dropDatabase();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseURL = `http://127.0.0.1:${port}`;

    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Officers in different wards
    officerN = await User.create({
      name: 'Officer North',
      phone: '9811111110',
      passwordHash,
      role: 'officer',
      wardId: 'N-WARD'
    });
    officerNToken = makeToken(officerN);

    officerS = await User.create({
      name: 'Officer South',
      phone: '9811111111',
      passwordHash,
      role: 'officer',
      wardId: 'S-WARD'
    });
    officerSToken = makeToken(officerS);

    // 2. Society Representative & Society in N-WARD
    repN = await User.create({
      name: 'Rep Shalimar',
      phone: '9822222220',
      passwordHash,
      role: 'society_representative',
      wardId: 'N-WARD'
    });
    repNToken = makeToken(repN);

    societyN = await Society.create({
      name: 'Shalimar Heights',
      address: '100 Marine Drive',
      wardId: 'N-WARD',
      representativeId: repN._id,
      registrationStatus: 'APPROVED',
      joinCode: 'SOC-TASK03',
      reviewedBy: officerN._id,
      reviewedAt: new Date()
    });

    // 3. Collectors
    collectorN = await User.create({
      name: 'Internal Collector N',
      phone: '9833333330',
      passwordHash,
      role: 'collector',
      collectorId: 'COL-N1',
      wardId: 'N-WARD',
      assignedSocietyId: societyN._id
    });
    collectorNToken = makeToken(collectorN);
    societyN.internalCollectorId = collectorN._id;
    await societyN.save();

    bmcCollectorN = await User.create({
      name: 'BMC Collector N',
      phone: '9844444440',
      passwordHash,
      role: 'bmc_collector',
      collectorId: 'BMC-N1',
      wardId: 'N-WARD'
    });
    bmcCollectorNToken = makeToken(bmcCollectorN);

    bmcCollectorS = await User.create({
      name: 'BMC Collector S',
      phone: '9844444441',
      passwordHash,
      role: 'bmc_collector',
      collectorId: 'BMC-S1',
      wardId: 'S-WARD'
    });
    bmcCollectorSToken = makeToken(bmcCollectorS);

    // 4. Citizens
    citizenN = await User.create({
      name: 'Citizen Approved',
      phone: '9855555550',
      passwordHash,
      role: 'citizen',
      wardId: 'N-WARD'
    });
    citizenNToken = makeToken(citizenN);

    citizenPending = await User.create({
      name: 'Citizen Pending',
      phone: '9855555551',
      passwordHash,
      role: 'citizen',
      wardId: 'N-WARD'
    });
    citizenPendingToken = makeToken(citizenPending);

    // 5. Inactive User
    inactiveUser = await User.create({
      name: 'Deactivated User',
      phone: '9866666660',
      passwordHash,
      role: 'citizen',
      wardId: 'N-WARD',
      isActive: false
    });
    inactiveUserToken = makeToken(inactiveUser);

    // 6. Households & Memberships
    const qr1 = generateQRCodeString();
    const qrImg1 = await generateQRCodeImage(qr1);
    householdNApproved = await Household.create({
      citizenId: citizenN._id,
      address: 'Flat 101, Shalimar Heights',
      wardId: 'N-WARD',
      societyRef: societyN._id,
      societyId: societyN._id.toString(),
      qrCode: qr1,
      qrImageUrl: qrImg1,
      isActive: true
    });
    citizenN.householdId = householdNApproved._id;
    await citizenN.save();

    await SocietyMembership.create({
      citizenId: citizenN._id,
      societyId: societyN._id,
      address: 'Flat 101, Shalimar Heights',
      householdId: householdNApproved._id,
      status: 'APPROVED',
      reviewedBy: repN._id,
      reviewedAt: new Date()
    });

    const qr2 = generateQRCodeString();
    const qrImg2 = await generateQRCodeImage(qr2);
    householdNPending = await Household.create({
      citizenId: citizenPending._id,
      address: 'Flat 202, Shalimar Heights',
      wardId: 'N-WARD',
      societyRef: societyN._id,
      societyId: societyN._id.toString(),
      qrCode: qr2,
      qrImageUrl: qrImg2,
      isActive: true
    });
    citizenPending.householdId = householdNPending._id;
    await citizenPending.save();

    await SocietyMembership.create({
      citizenId: citizenPending._id,
      societyId: societyN._id,
      address: 'Flat 202, Shalimar Heights',
      householdId: householdNPending._id,
      status: 'PENDING'
    });

    // 7. Collection Points
    pointN = await CollectionPoint.create({
      name: 'Shalimar Gate Point',
      type: 'society',
      location: { lat: 19.076, lng: 72.8777 },
      address: 'Gate 1, 100 Marine Drive',
      wardId: 'N-WARD',
      societyId: societyN._id,
      assignedCollectorId: bmcCollectorN._id,
      isActive: true
    });

    unassignedPointN = await CollectionPoint.create({
      name: 'Public Bin North',
      type: 'public_bin',
      location: { lat: 19.078, lng: 72.879 },
      address: 'Corner St',
      wardId: 'N-WARD',
      assignedCollectorId: null,
      isActive: true
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
    }
  });

  // -------------------------------------------------------------
  // Test 1: Inactive/Deactivated accounts denied at login & auth
  // -------------------------------------------------------------
  it('1. Deactivated user is rejected at login and on protected routes', async () => {
    // Attempt login with deactivated user
    const loginRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { phone: inactiveUser.phone, password: 'password123' }
    });
    assert.equal(loginRes.status, 401);
    assert.match(loginRes.data.message, /deactivated/i);

    // Attempt protected API with token of deactivated user
    const meRes = await apiRequest('/api/auth/me', { token: inactiveUserToken });
    assert.equal(meRes.status, 401);
    assert.match(meRes.data.message, /deactivated|not found/i);
  });

  // -------------------------------------------------------------
  // Test 2: Active DB role & ward takes precedence over stale JWT
  // -------------------------------------------------------------
  it('2. Stale JWT claims cannot elevate privileges or cross wards', async () => {
    // Generate token claiming role: 'officer' and wardId: 'N-WARD', but DB user is citizenN
    const spoofedToken = makeToken(citizenN, { role: 'officer', wardId: 'N-WARD' });

    // Citizen attempting officer household endpoint with spoofed token
    const res = await apiRequest('/api/households/all', { token: spoofedToken });
    assert.equal(res.status, 403);
    assert.match(res.data.message, /Access denied|Forbidden/i);
  });

  // -------------------------------------------------------------
  // Test 3: BMC collector denied household operations
  // -------------------------------------------------------------
  it('3. BMC collector is denied household list, scan and registration endpoints', async () => {
    // Household list for society
    const listRes = await apiRequest('/api/households/society', { token: bmcCollectorNToken });
    assert.equal(listRes.status, 403);

    // Household scan
    const scanRes = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: bmcCollectorNToken,
      body: { qrCode: householdNApproved.qrCode }
    });
    assert.equal(scanRes.status, 403);

    // Household registration
    const regRes = await apiRequest('/api/households/register', {
      method: 'POST',
      token: bmcCollectorNToken,
      body: { citizenId: citizenN._id.toString(), address: '123 Fake Street' }
    });
    assert.equal(regRes.status, 403);
  });

  // -------------------------------------------------------------
  // Test 4: Internal collector denied scanning unapproved household
  // -------------------------------------------------------------
  it('4. Internal collector denied scanning household with PENDING membership', async () => {
    const scanRes = await apiRequest('/api/points/collector-scan', {
      method: 'POST',
      token: collectorNToken,
      body: { qrCode: householdNPending.qrCode, location: { lat: 19.076, lng: 72.8777 } }
    });
    assert.equal(scanRes.status, 403);
    assert.match(scanRes.data.message, /approved membership/i);
  });

  // -------------------------------------------------------------
  // Test 5: Internal collector household list excludes unapproved members
  // -------------------------------------------------------------
  it('5. Internal collector household list includes only APPROVED households', async () => {
    const res = await apiRequest('/api/households/society', { token: collectorNToken });
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    const households = res.data.data.households;

    // Must include approved household, but NOT pending household
    assert.ok(households.some((h) => h._id.toString() === householdNApproved._id.toString()));
    assert.ok(!households.some((h) => h._id.toString() === householdNPending._id.toString()));
  });

  // -------------------------------------------------------------
  // Test 6: Officer /all endpoint is strictly ward-scoped
  // -------------------------------------------------------------
  it('6. Officer household /all is strictly scoped to officer ward and client wardId cannot widen access', async () => {
    // Officer North requests with query parameter trying to view S-WARD
    const res = await apiRequest('/api/households/all?wardId=S-WARD', { token: officerNToken });
    assert.equal(res.status, 200);
    // All returned households must be in N-WARD
    const households = res.data.data.households;
    households.forEach((h) => {
      assert.equal(h.wardId, 'N-WARD');
    });
  });

  // -------------------------------------------------------------
  // Test 7: Officer cannot deactivate or retrieve QR of another ward
  // -------------------------------------------------------------
  it('7. Officer South is denied QR view and deactivation of North ward household', async () => {
    const qrRes = await apiRequest(`/api/households/qr-image/${householdNApproved._id}`, {
      token: officerSToken
    });
    assert.equal(qrRes.status, 403);

    const deactRes = await apiRequest(`/api/households/${householdNApproved._id}/deactivate`, {
      method: 'PATCH',
      token: officerSToken
    });
    assert.equal(deactRes.status, 403);
  });

  // -------------------------------------------------------------
  // Test 8: Violation logging restricted to approved member households
  // -------------------------------------------------------------
  it('8. Internal collector cannot log violation against citizen without approved membership', async () => {
    // Attempt to log violation against citizen with pending membership
    const res = await apiRequest('/api/violations/log', {
      method: 'POST',
      token: collectorNToken,
      body: { citizenId: citizenPending._id.toString(), type: 'NON_SEGREGATION' }
    });
    assert.equal(res.status, 403);
    assert.match(res.data.message, /approved member/i);

    // BMC collector cannot log household violation
    const bmcRes = await apiRequest('/api/violations/log', {
      method: 'POST',
      token: bmcCollectorNToken,
      body: { citizenId: citizenN._id.toString(), type: 'NON_SEGREGATION' }
    });
    assert.equal(bmcRes.status, 403);
  });

  // -------------------------------------------------------------
  // Test 9: Officer collector stats requires collector in officer ward
  // -------------------------------------------------------------
  it('9. Officer South cannot view statistics of internal collector in North ward', async () => {
    const res = await apiRequest(`/api/points/collector-stats?collectorId=${collectorN._id}`, {
      token: officerSToken
    });
    assert.equal(res.status, 403);
  });

  // -------------------------------------------------------------
  // Test 10: Collection point assignment rejects non-BMC or cross-ward collectors
  // -------------------------------------------------------------
  it('10. Officer cannot assign internal collector or cross-ward BMC collector to collection point', async () => {
    // Attempt assigning internal collector
    const internalRes = await apiRequest(`/api/collection-points/${pointN._id}/assign`, {
      method: 'PUT',
      token: officerNToken,
      body: { bmcCollectorId: collectorN._id.toString() }
    });
    assert.equal(internalRes.status, 400);

    // Attempt assigning South ward BMC collector to North collection point
    const crossRes = await apiRequest(`/api/collection-points/${pointN._id}/assign`, {
      method: 'PUT',
      token: officerNToken,
      body: { bmcCollectorId: bmcCollectorS._id.toString() }
    });
    assert.equal(crossRes.status, 400);
  });

  // -------------------------------------------------------------
  // Test 11: BMC collection rejects unassigned or other collector points
  // -------------------------------------------------------------
  it('11. BMC collector denied logging collection for unassigned or another collector point', async () => {
    // Point assigned to BMC Collector N, attempted by BMC Collector S
    const otherRes = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorSToken,
      body: { collectionPointId: pointN._id.toString(), wasteType: 'wet', weight: 50 }
    });
    assert.equal(otherRes.status, 403);

    // Unassigned point
    const unassignedRes = await apiRequest('/api/bmc-collections', {
      method: 'POST',
      token: bmcCollectorNToken,
      body: { collectionPointId: unassignedPointN._id.toString(), wasteType: 'dry', weight: 30 }
    });
    assert.equal(unassignedRes.status, 403);
  });

  // -------------------------------------------------------------
  // Test 12: Protected collection-point fields cannot be edited generically
  // -------------------------------------------------------------
  it('12. Protected fields (societyId, wardId, assignedCollectorId) cannot be modified via generic PUT', async () => {
    const res = await apiRequest(`/api/collection-points/${pointN._id}`, {
      method: 'PUT',
      token: officerNToken,
      body: {
        name: 'Updated Name',
        assignedCollectorId: bmcCollectorS._id.toString(),
        wardId: 'S-WARD'
      }
    });
    assert.equal(res.status, 400);
    assert.match(JSON.stringify(res.data), /assignedCollectorId|wardId/i);
  });
});
