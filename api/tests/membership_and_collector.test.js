// filepath: api/tests/membership_and_collector.test.js
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
const { generateQRCodeString, generateQRCodeImage } = require('../src/utils/qrGenerator');

const TEST_DB_NAME = 'greenpoint_task2_test_db';

let server;
let baseURL;

// Test accounts & tokens
let citizen1, citizen1Token;
let citizen2, citizen2Token;
let rep1, rep1Token;
let rep2, rep2Token;
let officer, officerToken;
let collector1, collector1Token;
let collector2, collector2Token;
let bmcCollector, bmcCollectorToken;

let society1Approved, society1JoinCode;
let society2Approved, society2JoinCode;
let societyPending, societyPendingJoinCode;

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
    data
  };
}

describe('Task 2: Society Membership and Internal Collector Assignment', () => {
  before(async () => {
    const rawMongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    assert.ok(rawMongoUri, 'MONGO_URI must be configured');

    const uriObj = new URL(rawMongoUri);
    uriObj.pathname = `/${TEST_DB_NAME}`;
    const testMongoUri = uriObj.toString();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testMongoUri);

    // Clean test database collections
    await Promise.all([
      User.deleteMany({}),
      Society.deleteMany({}),
      Household.deleteMany({}),
      SocietyMembership.deleteMany({}),
      CollectionPoint.deleteMany({})
    ]);

    const pwHash = await bcrypt.hash('secret123', 8);

    // 1. Create Citizen accounts
    citizen1 = await User.create({
      name: 'Citizen One',
      phone: '8000000001',
      passwordHash: pwHash,
      role: 'citizen',
      wardId: 'N-WARD'
    });
    citizen1Token = jwt.sign(
      { id: citizen1._id, phone: citizen1.phone, role: citizen1.role, wardId: citizen1.wardId },
      process.env.JWT_SECRET || 'test_secret'
    );

    citizen2 = await User.create({
      name: 'Citizen Two',
      phone: '8000000002',
      passwordHash: pwHash,
      role: 'citizen',
      wardId: 'N-WARD'
    });
    citizen2Token = jwt.sign(
      { id: citizen2._id, phone: citizen2.phone, role: citizen2.role, wardId: citizen2.wardId },
      process.env.JWT_SECRET || 'test_secret'
    );

    // 2. Create Society Representatives
    rep1 = await User.create({
      name: 'Representative One',
      phone: '8000000011',
      passwordHash: pwHash,
      role: 'society_representative',
      wardId: 'N-WARD'
    });
    rep1Token = jwt.sign(
      { id: rep1._id, phone: rep1.phone, role: rep1.role, wardId: rep1.wardId },
      process.env.JWT_SECRET || 'test_secret'
    );

    rep2 = await User.create({
      name: 'Representative Two',
      phone: '8000000012',
      passwordHash: pwHash,
      role: 'society_representative',
      wardId: 'N-WARD'
    });
    rep2Token = jwt.sign(
      { id: rep2._id, phone: rep2.phone, role: rep2.role, wardId: rep2.wardId },
      process.env.JWT_SECRET || 'test_secret'
    );

    // 3. Create Officer
    officer = await User.create({
      name: 'Officer Rajesh',
      phone: '8000000020',
      passwordHash: pwHash,
      role: 'officer',
      wardId: 'N-WARD'
    });
    officerToken = jwt.sign(
      { id: officer._id, phone: officer.phone, role: officer.role, wardId: officer.wardId },
      process.env.JWT_SECRET || 'test_secret'
    );

    // 4. Create Internal Collectors
    collector1 = await User.create({
      name: 'Collector Ramesh',
      phone: '8000000031',
      passwordHash: pwHash,
      role: 'collector',
      collectorId: 'COL1001',
      wardId: 'N-WARD'
    });
    collector1Token = jwt.sign(
      { id: collector1._id, phone: collector1.phone, role: collector1.role, wardId: collector1.wardId },
      process.env.JWT_SECRET || 'test_secret'
    );

    collector2 = await User.create({
      name: 'Collector Suresh',
      phone: '8000000032',
      passwordHash: pwHash,
      role: 'collector',
      collectorId: 'COL1002',
      wardId: 'N-WARD'
    });
    collector2Token = jwt.sign(
      { id: collector2._id, phone: collector2.phone, role: collector2.role, wardId: collector2.wardId },
      process.env.JWT_SECRET || 'test_secret'
    );

    // 5. Create BMC Collector (Municipal bulk pickup)
    bmcCollector = await User.create({
      name: 'BMC Bulk Collector',
      phone: '8000000041',
      passwordHash: pwHash,
      role: 'bmc_collector',
      collectorId: 'BMC2001',
      wardId: 'N-WARD'
    });
    bmcCollectorToken = jwt.sign(
      { id: bmcCollector._id, phone: bmcCollector.phone, role: bmcCollector.role, wardId: bmcCollector.wardId },
      process.env.JWT_SECRET || 'test_secret'
    );

    // 6. Create Societies
    // Society 1 (Approved)
    society1JoinCode = 'SOC-ALPHA1';
    society1Approved = await Society.create({
      name: 'Alpha Heights CHS',
      address: 'Plot 101, Central Avenue, Ghatkopar East',
      wardId: 'N-WARD',
      representativeId: rep1._id,
      registrationStatus: 'APPROVED',
      qrCode: 'GP-SOC-ALPHA111111',
      joinCode: society1JoinCode
    });

    // Society 2 (Approved)
    society2JoinCode = 'SOC-BETA22';
    society2Approved = await Society.create({
      name: 'Beta Enclave CHS',
      address: 'Plot 202, MG Road, Ghatkopar East',
      wardId: 'N-WARD',
      representativeId: rep2._id,
      registrationStatus: 'APPROVED',
      qrCode: 'GP-SOC-BETA222222',
      joinCode: society2JoinCode
    });

    // Society 3 (Pending - representative 3)
    const rep3 = await User.create({
      name: 'Representative Three',
      phone: '8000000013',
      passwordHash: pwHash,
      role: 'society_representative',
      wardId: 'N-WARD'
    });
    societyPendingJoinCode = 'SOC-PEND99';
    societyPending = await Society.create({
      name: 'Pending Gardens CHS',
      address: 'Plot 303, Hill Road',
      wardId: 'N-WARD',
      representativeId: rep3._id,
      registrationStatus: 'PENDING',
      joinCode: societyPendingJoinCode
    });

    // Start HTTP server on ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseURL = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((res) => server.close(res));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  // 1. Only approved societies accept join requests
  it('1. Only approved societies accept join requests (pending society rejected)', async () => {
    // Attempt with pending society's code
    const resPending = await apiRequest('/societies/join-request', {
      method: 'POST',
      token: citizen1Token,
      body: { joinCode: societyPendingJoinCode, address: 'Flat 101' }
    });
    assert.strictEqual(resPending.status, 404);
    assert.strictEqual(resPending.data.success, false);

    // Attempt with completely invalid code
    const resInvalid = await apiRequest('/societies/join-request', {
      method: 'POST',
      token: citizen1Token,
      body: { joinCode: 'SOC-DOESNOTEXIST', address: 'Flat 101' }
    });
    assert.strictEqual(resInvalid.status, 404);

    // Valid approved society code succeeds
    const resValid = await apiRequest('/societies/join-request', {
      method: 'POST',
      token: citizen1Token,
      body: { joinCode: society1JoinCode, address: 'Flat 301, Wing A' }
    });
    assert.strictEqual(resValid.status, 201);
    assert.strictEqual(resValid.data.success, true);
    assert.strictEqual(resValid.data.data.status, 'PENDING');
  });

  // 2. Citizen cannot approve themselves
  it('2. Citizen cannot approve themselves or access review endpoint', async () => {
    const membership = await SocietyMembership.findOne({ citizenId: citizen1._id });
    assert.ok(membership);

    const res = await apiRequest(`/societies/members/${membership._id}/review`, {
      method: 'PATCH',
      token: citizen1Token,
      body: { decision: 'APPROVED' }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
  });

  // 3. Repeated requests do not create duplicates
  it('3. Repeated requests while pending or approved are rejected', async () => {
    // Citizen 1 already has a pending request from test 1
    const resDup = await apiRequest('/societies/join-request', {
      method: 'POST',
      token: citizen1Token,
      body: { joinCode: society1JoinCode, address: 'Flat 301, Wing A duplicate attempt' }
    });
    assert.strictEqual(resDup.status, 409);
    assert.match(resDup.data.message, /already have a pending membership request/i);

    const count = await SocietyMembership.countDocuments({ citizenId: citizen1._id });
    assert.strictEqual(count, 1);
  });

  // 4. Representative cannot review another society’s request
  it('4. Representative cannot review requests belonging to another society', async () => {
    const membership = await SocietyMembership.findOne({ citizenId: citizen1._id });
    assert.ok(membership);

    // rep2 owns Society 2, membership belongs to Society 1
    const res = await apiRequest(`/societies/members/${membership._id}/review`, {
      method: 'PATCH',
      token: rep2Token,
      body: { decision: 'APPROVED' }
    });
    assert.strictEqual(res.status, 403);
    assert.match(res.data.message, /only review requests for your own society/i);
  });

  // 5. Approval creates/links one household and stable household QR
  it('5. Representative approves request -> creates household with GP-HH- QR and updates citizen', async () => {
    const membership = await SocietyMembership.findOne({ citizenId: citizen1._id });
    assert.ok(membership);

    const res = await apiRequest(`/societies/members/${membership._id}/review`, {
      method: 'PATCH',
      token: rep1Token,
      body: { decision: 'APPROVED' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.membership.status, 'APPROVED');

    // Verify Household record
    const household = await Household.findOne({ citizenId: citizen1._id });
    assert.ok(household);
    assert.match(household.qrCode, /^GP-HH-[A-Z0-9]{10}$/);
    assert.strictEqual(household.societyRef.toString(), society1Approved._id.toString());
    assert.strictEqual(household.societyId, society1Approved._id.toString());
    assert.strictEqual(household.wardId, society1Approved.wardId);

    // Verify User record
    const updatedCitizen = await User.findById(citizen1._id);
    assert.strictEqual(updatedCitizen.householdId.toString(), household._id.toString());
    assert.strictEqual(updatedCitizen.societyId, society1Approved._id.toString());

    // Verify citizen can retrieve membership and household via API
    const myMemRes = await apiRequest('/societies/my-membership', { token: citizen1Token });
    assert.strictEqual(myMemRes.status, 200);
    assert.strictEqual(myMemRes.data.data.status, 'APPROVED');

    const myHhRes = await apiRequest('/households/my', { token: citizen1Token });
    assert.strictEqual(myHhRes.status, 200);
    assert.strictEqual(myHhRes.data.data.household.qrCode, household.qrCode);
  });

  // 6. Compatible existing household is preserved
  it('6. Compatible existing unlinked household preserves ID, QR and history upon approval', async () => {
    // Create citizen3 with a pre-existing unlinked household
    const pwHash = await bcrypt.hash('secret123', 8);
    const citizen3 = await User.create({
      name: 'Citizen Three Legacy',
      phone: '8000000003',
      passwordHash: pwHash,
      role: 'citizen',
      wardId: 'N-WARD'
    });
    const citizen3Token = jwt.sign(
      { id: citizen3._id, phone: citizen3.phone, role: citizen3.role, wardId: citizen3.wardId },
      process.env.JWT_SECRET || 'test_secret'
    );

    const legacyQr = generateQRCodeString();
    const legacyQrImage = await generateQRCodeImage(legacyQr);
    const legacyHh = await Household.create({
      citizenId: citizen3._id,
      address: 'Flat 404, Legacy Building',
      wardId: 'N-WARD',
      societyId: '',
      societyRef: null,
      qrCode: legacyQr,
      qrImageUrl: legacyQrImage,
      totalScans: 15
    });
    await User.findByIdAndUpdate(citizen3._id, { householdId: legacyHh._id });

    // Citizen 3 requests to join society 1
    const joinRes = await apiRequest('/societies/join-request', {
      method: 'POST',
      token: citizen3Token,
      body: { joinCode: society1JoinCode, address: 'Flat 404, Wing A, Alpha Heights' }
    });
    assert.strictEqual(joinRes.status, 201);

    // Rep 1 approves citizen 3
    const membership = await SocietyMembership.findOne({ citizenId: citizen3._id });
    const appRes = await apiRequest(`/societies/members/${membership._id}/review`, {
      method: 'PATCH',
      token: rep1Token,
      body: { decision: 'APPROVED' }
    });
    assert.strictEqual(appRes.status, 200);

    // Verify the legacy household was preserved and linked
    const updatedHh = await Household.findOne({ citizenId: citizen3._id });
    assert.strictEqual(updatedHh._id.toString(), legacyHh._id.toString());
    assert.strictEqual(updatedHh.qrCode, legacyQr); // QR code unchanged
    assert.strictEqual(updatedHh.totalScans, 15); // History unchanged
    assert.strictEqual(updatedHh.societyRef.toString(), society1Approved._id.toString());
  });

  // 7. Conflicting existing membership is rejected
  it('7. Conflicting membership request to second society is rejected', async () => {
    // Citizen 1 is already an approved member of society 1
    const res = await apiRequest('/societies/join-request', {
      method: 'POST',
      token: citizen1Token,
      body: { joinCode: society2JoinCode, address: 'Flat 505' }
    });
    assert.strictEqual(res.status, 409);
    assert.match(res.data.message, /already an approved member/i);
  });

  // 8. Rejected request can be corrected/resubmitted
  it('8. Representative rejects request -> citizen can correct and resubmit', async () => {
    // Citizen 2 submits join request for society 2
    const joinRes = await apiRequest('/societies/join-request', {
      method: 'POST',
      token: citizen2Token,
      body: { joinCode: society2JoinCode, address: 'Wrong Flat 999' }
    });
    assert.strictEqual(joinRes.status, 201);

    const membership = await SocietyMembership.findOne({ citizenId: citizen2._id });

    // Rep 2 rejects with reason
    const rejRes = await apiRequest(`/societies/members/${membership._id}/review`, {
      method: 'PATCH',
      token: rep2Token,
      body: { decision: 'REJECTED', reviewNote: 'Flat 999 does not exist in Beta Enclave' }
    });
    assert.strictEqual(rejRes.status, 200);
    assert.strictEqual(rejRes.data.data.status, 'REJECTED');
    assert.strictEqual(rejRes.data.data.reviewNote, 'Flat 999 does not exist in Beta Enclave');

    // Citizen 2 checks their membership
    const myMemRes = await apiRequest('/societies/my-membership', { token: citizen2Token });
    assert.strictEqual(myMemRes.data.data.status, 'REJECTED');
    assert.strictEqual(myMemRes.data.data.reviewNote, 'Flat 999 does not exist in Beta Enclave');

    // Citizen 2 resubmits with corrected address
    const resubmitRes = await apiRequest('/societies/join-request', {
      method: 'POST',
      token: citizen2Token,
      body: { joinCode: society2JoinCode, address: 'Flat 202, Wing B, Corrected' }
    });
    assert.strictEqual(resubmitRes.status, 201);
    assert.strictEqual(resubmitRes.data.data.status, 'PENDING');
    assert.strictEqual(resubmitRes.data.data.address, 'Flat 202, Wing B, Corrected');

    // Rep 2 now approves the corrected request
    const approvedRes = await apiRequest(`/societies/members/${membership._id}/review`, {
      method: 'PATCH',
      token: rep2Token,
      body: { decision: 'APPROVED' }
    });
    assert.strictEqual(approvedRes.status, 200);
    assert.strictEqual(approvedRes.data.data.membership.status, 'APPROVED');
  });

  // 9. Only eligible internal collectors can be assigned
  it('9. Only eligible internal collectors (role: collector) can be assigned', async () => {
    // Attempt lookup with citizen phone
    const resCitizen = await apiRequest(`/societies/collector-lookup?phone=${citizen1.phone}`, {
      token: rep1Token
    });
    assert.strictEqual(resCitizen.status, 400);
    assert.match(resCitizen.data.message, /not 'collector'/i);

    // Attempt lookup with bmc_collector phone
    const resBMC = await apiRequest(`/societies/collector-lookup?phone=${bmcCollector.phone}`, {
      token: rep1Token
    });
    assert.strictEqual(resBMC.status, 400);
    assert.match(resBMC.data.message, /not 'collector'/i);

    // Attempt assign with officer phone
    const resOfficer = await apiRequest('/societies/my/collector', {
      method: 'POST',
      token: rep1Token,
      body: { phone: officer.phone }
    });
    assert.strictEqual(resOfficer.status, 400);
    assert.match(resOfficer.data.message, /not 'collector'/i);

    // Lookup and assign eligible collector 1
    const resEligible = await apiRequest(`/societies/collector-lookup?phone=${collector1.phone}`, {
      token: rep1Token
    });
    assert.strictEqual(resEligible.status, 200);
    assert.strictEqual(resEligible.data.data.alreadyAssigned, false);

    const assignRes = await apiRequest('/societies/my/collector', {
      method: 'POST',
      token: rep1Token,
      body: { phone: collector1.phone }
    });
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignRes.data.success, true);

    // Verify in database
    const soc = await Society.findById(society1Approved._id);
    assert.strictEqual(soc.internalCollectorId.toString(), collector1._id.toString());
    const coll = await User.findById(collector1._id);
    assert.strictEqual(coll.assignedSocietyId.toString(), society1Approved._id.toString());
  });

  // 10. Collector cannot be assigned to two societies
  it('10. Collector cannot be assigned to a second society', async () => {
    // Collector 1 is already assigned to Society 1. Rep 2 tries to assign Collector 1
    const lookupRes = await apiRequest(`/societies/collector-lookup?phone=${collector1.phone}`, {
      token: rep2Token
    });
    assert.strictEqual(lookupRes.status, 400);
    assert.match(lookupRes.data.message, /already assigned to another/i);

    const assignRes = await apiRequest('/societies/my/collector', {
      method: 'POST',
      token: rep2Token,
      body: { phone: collector1.phone }
    });
    assert.strictEqual(assignRes.status, 400);
    assert.match(assignRes.data.message, /already assigned to another/i);
  });

  // 11. Unassigned collector sees no households
  it('11. Unassigned collector sees no households', async () => {
    // Collector 2 is not assigned to any society
    const resSociety = await apiRequest('/households/society', { token: collector2Token });
    assert.strictEqual(resSociety.status, 200);
    assert.strictEqual(resSociety.data.data.assigned, false);
    assert.strictEqual(resSociety.data.data.households.length, 0);

    const resWard = await apiRequest('/households/ward', { token: collector2Token });
    assert.strictEqual(resWard.status, 200);
    assert.strictEqual(resWard.data.data.assigned, false);
    assert.strictEqual(resWard.data.data.households.length, 0);
  });

  // 12. Assigned collector sees and scans only approved households in their society
  it('12. Assigned collector sees and scans only approved households in their assigned society', async () => {
    // Collector 1 is assigned to Society 1
    const resRound = await apiRequest('/households/society', { token: collector1Token });
    assert.strictEqual(resRound.status, 200);
    assert.strictEqual(resRound.data.data.assigned, true);
    assert.strictEqual(resRound.data.data.society.name, society1Approved.name);

    // Verify all returned households belong to Society 1
    const returnedHhIds = resRound.data.data.households.map(h => h._id.toString());
    const hhCitizen1 = await Household.findOne({ citizenId: citizen1._id });
    assert.ok(returnedHhIds.includes(hhCitizen1._id.toString()));

    const hhCitizen2 = await Household.findOne({ citizenId: citizen2._id }); // Belongs to Society 2
    assert.ok(!returnedHhIds.includes(hhCitizen2._id.toString()));

    // Successful scan of household in own society
    const scanSuccess = await apiRequest('/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: { qrCode: hhCitizen1.qrCode }
    });
    assert.strictEqual(scanSuccess.status, 200);
    assert.strictEqual(scanSuccess.data.success, true);
    assert.match(scanSuccess.data.message, /Segregation verified/i);

    // Attempt scan of household in different society -> 403 Forbidden
    const scanForbidden = await apiRequest('/points/collector-scan', {
      method: 'POST',
      token: collector1Token,
      body: { qrCode: hhCitizen2.qrCode }
    });
    assert.strictEqual(scanForbidden.status, 403);
    assert.match(scanForbidden.data.message, /does not belong to your assigned/i);
  });

  // 13. BMC collector cannot access household workflows
  it('13. BMC collector is denied access to household endpoints', async () => {
    const resSociety = await apiRequest('/households/society', { token: bmcCollectorToken });
    assert.strictEqual(resSociety.status, 403);

    const resWard = await apiRequest('/households/ward', { token: bmcCollectorToken });
    assert.strictEqual(resWard.status, 403);

    const hhCitizen1 = await Household.findOne({ citizenId: citizen1._id });
    const resScan = await apiRequest('/points/collector-scan', {
      method: 'POST',
      token: bmcCollectorToken,
      body: { qrCode: hhCitizen1.qrCode }
    });
    assert.strictEqual(resScan.status, 403);
  });

  // 14. Direct profile/legacy scan paths cannot bypass the new boundaries
  it('14. Direct profile updates and legacy scan cannot bypass society membership', async () => {
    // Attempt to change societyId via PUT /auth/me
    const updateRes = await apiRequest('/auth/me', {
      method: 'PUT',
      token: citizen1Token,
      body: { societyId: society2Approved._id.toString() }
    });
    assert.strictEqual(updateRes.status, 400); // Joi validation rejects societyId

    // Citizen record still has original society
    const citizenCheck = await User.findById(citizen1._id);
    assert.strictEqual(citizenCheck.societyId, society1Approved._id.toString());

    // Legacy scan endpoint is disabled
    const legacyScan = await apiRequest('/points/scan', {
      method: 'POST',
      token: collector1Token,
      body: { qrCode: citizen1._id.toString(), action: 'SEGREGATION' }
    });
    assert.strictEqual(legacyScan.status, 403);
    assert.match(legacyScan.data.message, /legacy user id scanning is disabled/i);
  });
});
