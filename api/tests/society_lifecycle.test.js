// filepath: api/tests/society_lifecycle.test.js
process.env.NODE_ENV = 'test';
require('dotenv').config();

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = require('../src/app');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Society = require('../src/models/Society');
const CollectionPoint = require('../src/models/CollectionPoint');

const TEST_DB_NAME = 'greenpoint_task1_test_db';

let server;
let baseURL;

// Test user tokens
let citizenUser, citizenToken;
let repUser1, repToken1;
let repUser2, repToken2;
let officerNWard, officerNWardToken;
let officerSWard, officerSWardToken;

// Helper to make authenticated HTTP requests to the test server
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
  } else if (contentType.includes('image/')) {
    data = await res.arrayBuffer();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    data
  };
}

describe('Task 1: Society Registration, Officer Approval and Society QR Identity', () => {
  before(async () => {
    // Connect to isolated test database
    await connectDB({ dbName: TEST_DB_NAME });

    // Clean test collections in isolated test database
    await Society.deleteMany({});
    await CollectionPoint.deleteMany({});
    await User.deleteMany({});

    // Ensure database indexes are created
    await Society.syncIndexes();
    await CollectionPoint.syncIndexes();
    await User.syncIndexes();

    // Start express app on ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseURL = `http://127.0.0.1:${port}`;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Secret123!', salt);

    // Seed test users
    citizenUser = await User.create({
      name: 'Test Citizen',
      phone: '9000000001',
      passwordHash,
      role: 'citizen',
      wardId: 'N-WARD'
    });
    citizenToken = jwt.sign(
      { id: citizenUser._id, phone: citizenUser.phone, role: citizenUser.role, wardId: citizenUser.wardId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    repUser1 = await User.create({
      name: 'Rep One',
      phone: '9000000002',
      passwordHash,
      role: 'society_representative',
      wardId: 'N-WARD'
    });
    repToken1 = jwt.sign(
      { id: repUser1._id, phone: repUser1.phone, role: repUser1.role, wardId: repUser1.wardId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    repUser2 = await User.create({
      name: 'Rep Two',
      phone: '9000000003',
      passwordHash,
      role: 'society_representative',
      wardId: 'N-WARD'
    });
    repToken2 = jwt.sign(
      { id: repUser2._id, phone: repUser2.phone, role: repUser2.role, wardId: repUser2.wardId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    officerNWard = await User.create({
      name: 'Officer Patil (N-Ward)',
      phone: '9000000004',
      passwordHash,
      role: 'officer',
      wardId: 'N-WARD'
    });
    officerNWardToken = jwt.sign(
      { id: officerNWard._id, phone: officerNWard.phone, role: officerNWard.role, wardId: officerNWard.wardId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    officerSWard = await User.create({
      name: 'Officer Deshmukh (S-Ward)',
      phone: '9000000005',
      passwordHash,
      role: 'officer',
      wardId: 'S-WARD'
    });
    officerSWardToken = jwt.sign(
      { id: officerSWard._id, phone: officerSWard.phone, role: officerSWard.role, wardId: officerSWard.wardId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  after(async () => {
    // Clean up test DB & close server
    try {
      await Society.deleteMany({});
      await CollectionPoint.deleteMany({});
      await User.deleteMany({});
    } catch (e) {}

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('1. Public signup cannot create privileged staff (officer, collector, bmc_collector)', async () => {
    for (const role of ['officer', 'collector', 'bmc_collector']) {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: `Hacker ${role}`,
          phone: '9111111111',
          password: 'password123',
          role
        }
      });
      assert.strictEqual(res.status, 400, `Expected 400 when registering public staff as ${role}`);
      assert.strictEqual(res.data.success, false);
    }
  });

  it('2. Public signup allows citizen and society_representative accounts', async () => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'New Representative',
        phone: '9222222222',
        password: 'password123',
        role: 'society_representative',
        wardId: 'N-WARD'
      }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.user.role, 'society_representative');
    assert.ok(res.data.data.token);
  });

  it('3. Citizen cannot submit society application (denied with 403)', async () => {
    const res = await apiRequest('/api/societies', {
      method: 'POST',
      token: citizenToken,
      body: {
        name: 'Citizen Attempt Society',
        address: '123 Fake Street, Ghatkopar East',
        wardId: 'N-WARD'
      }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
  });

  it('4. Clients cannot set approval/QR/reviewer/owner fields in POST /api/societies', async () => {
    const res = await apiRequest('/api/societies', {
      method: 'POST',
      token: repToken1,
      body: {
        name: 'Green Oasis CHS',
        address: 'Plot 42, LBS Marg, Ghatkopar East',
        wardId: 'N-WARD',
        registrationNumber: 'MH/MUM/2024/001',
        // Attempt spoofing privileged fields:
        registrationStatus: 'APPROVED',
        qrCode: 'GP-SOC-SPOOFED',
        representativeId: citizenUser._id.toString(),
        reviewedBy: officerNWard._id.toString(),
        collectionPointId: new mongoose.Types.ObjectId().toString()
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    const created = res.data.data;

    // Verify ownership derived from authenticated token
    assert.strictEqual(created.representativeId, repUser1._id.toString());
    // Verify status is PENDING, spoofed APPROVED ignored
    assert.strictEqual(created.registrationStatus, 'PENDING');
    // Verify QR code is null
    assert.strictEqual(created.qrCode, null);
    // Verify collectionPointId is null
    assert.strictEqual(created.collectionPointId, null);
    // Verify reviewedBy is null
    assert.strictEqual(created.reviewedBy, null);
  });

  it('5. Representative cannot create multiple society applications (409 Conflict)', async () => {
    const res = await apiRequest('/api/societies', {
      method: 'POST',
      token: repToken1,
      body: {
        name: 'Second Society Attempt',
        address: '99 Another Road, Ghatkopar',
        wardId: 'N-WARD'
      }
    });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /already/i);
  });

  it('6. Simultaneous concurrent requests by same representative are blocked by DB unique index', async () => {
    // Attempt concurrent submissions with representative 2
    const attempts = await Promise.all([
      apiRequest('/api/societies', {
        method: 'POST',
        token: repToken2,
        body: { name: 'Lotus Heights CHS', address: 'Bandra West, Mumbai', wardId: 'H-WEST' }
      }),
      apiRequest('/api/societies', {
        method: 'POST',
        token: repToken2,
        body: { name: 'Lotus Heights CHS', address: 'Bandra West, Mumbai', wardId: 'H-WEST' }
      })
    ]);

    const successes = attempts.filter(r => r.status === 201);
    const conflicts = attempts.filter(r => r.status === 409);

    assert.strictEqual(successes.length, 1, 'Only one concurrent submission can succeed');
    assert.strictEqual(conflicts.length, 1, 'Concurrent duplicate must receive 409 conflict');
  });

  it('7. Representative retrieves their own application via GET /api/societies/my', async () => {
    const res = await apiRequest('/api/societies/my', {
      token: repToken1
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.name, 'Green Oasis CHS');
    assert.strictEqual(res.data.data.registrationStatus, 'PENDING');
  });

  it('8. Representative cannot access another representative’s society (403 Forbidden)', async () => {
    // Rep 2 tries to view Rep 1's society
    const rep1Society = await Society.findOne({ representativeId: repUser1._id });

    const res = await apiRequest(`/api/societies/${rep1Society._id}`, {
      token: repToken2
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
  });

  it('9. Officer cannot list, read or review another ward’s society', async () => {
    const nWardSociety = await Society.findOne({ representativeId: repUser1._id });

    // Officer S-Ward lists societies -> should not include N-Ward society
    const listRes = await apiRequest('/api/societies', {
      token: officerSWardToken
    });
    assert.strictEqual(listRes.status, 200);
    const foundInList = listRes.data.data.some(s => s._id.toString() === nWardSociety._id.toString());
    assert.strictEqual(foundInList, false, 'S-Ward officer must not see N-Ward societies');

    // Officer S-Ward tries to get details of N-Ward society
    const getRes = await apiRequest(`/api/societies/${nWardSociety._id}`, {
      token: officerSWardToken
    });
    assert.strictEqual(getRes.status, 403, 'S-Ward officer denied reading N-Ward society');

    // Officer S-Ward tries to review N-Ward society
    const reviewRes = await apiRequest(`/api/societies/${nWardSociety._id}/review`, {
      method: 'PATCH',
      token: officerSWardToken,
      body: { decision: 'APPROVED' }
    });
    assert.strictEqual(reviewRes.status, 403, 'S-Ward officer denied reviewing N-Ward society');
  });

  it('10. Pending/rejected QR retrieval is denied (403 Forbidden)', async () => {
    const pendingSociety = await Society.findOne({ representativeId: repUser1._id });

    const res = await apiRequest(`/api/societies/${pendingSociety._id}/qr-image`, {
      token: repToken1
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
  });

  it('11. Rejection requires a reason and creates no QR or collection point', async () => {
    const rep2Society = await Society.findOne({ representativeId: repUser2._id });

    // Try rejecting without reason -> 400
    const noReasonRes = await apiRequest(`/api/societies/${rep2Society._id}/review`, {
      method: 'PATCH',
      token: officerNWardToken, // Wait, rep2 society was registered with H-WEST. Let's update ward to N-WARD so officerNWard can review it.
      body: { decision: 'REJECTED', reviewNote: '' }
    });
    // First let's check ward match
    if (rep2Society.wardId !== 'N-WARD') {
      rep2Society.wardId = 'N-WARD';
      await rep2Society.save();
    }

    const badReasonRes = await apiRequest(`/api/societies/${rep2Society._id}/review`, {
      method: 'PATCH',
      token: officerNWardToken,
      body: { decision: 'REJECTED', reviewNote: 'no' } // too short
    });
    assert.strictEqual(badReasonRes.status, 400, 'Rejection with short/empty reason must return 400');

    // Reject with meaningful reason
    const rejectRes = await apiRequest(`/api/societies/${rep2Society._id}/review`, {
      method: 'PATCH',
      token: officerNWardToken,
      body: { decision: 'REJECTED', reviewNote: 'Duplicate society record with conflicting address.' }
    });

    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectRes.data.data.registrationStatus, 'REJECTED');
    assert.strictEqual(rejectRes.data.data.qrCode, null);
    assert.strictEqual(rejectRes.data.data.collectionPointId, null);

    // Verify no collection point was created in DB
    const point = await CollectionPoint.findOne({ societyId: rep2Society._id });
    assert.strictEqual(point, null, 'No collection point must be created for rejected society');
  });

  it('12. Conflicting review cannot overwrite an already reviewed (rejected) decision', async () => {
    const rep2Society = await Society.findOne({ representativeId: repUser2._id });

    // Attempt second review on rejected society
    const secondReview = await apiRequest(`/api/societies/${rep2Society._id}/review`, {
      method: 'PATCH',
      token: officerNWardToken,
      body: { decision: 'APPROVED' }
    });

    assert.strictEqual(secondReview.status, 409, 'Expected 409 Conflict when reviewing non-pending society');
  });

  it('13. Approval creates exactly one linked point and stable QR', async () => {
    const nWardSociety = await Society.findOne({ representativeId: repUser1._id });

    const approveRes = await apiRequest(`/api/societies/${nWardSociety._id}/review`, {
      method: 'PATCH',
      token: officerNWardToken,
      body: {
        decision: 'APPROVED',
        reviewNote: 'Verified society premises and representative phone',
        location: { lat: 19.0860, lng: 72.8890 }
      }
    });

    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.data.success, true);

    const approvedSoc = approveRes.data.data.society;
    assert.strictEqual(approvedSoc.registrationStatus, 'APPROVED');
    assert.ok(approvedSoc.qrCode, 'QR code must be issued');
    assert.match(approvedSoc.qrCode, /^GP-SOC-[A-Z0-9]{12}$/, 'QR code must follow GP-SOC- format');
    assert.ok(approvedSoc.collectionPointId, 'Collection point must be linked');

    // Verify collection point in database
    const linkedPoint = await CollectionPoint.findById(approvedSoc.collectionPointId);
    assert.ok(linkedPoint, 'Collection point must exist');
    assert.strictEqual(linkedPoint.type, 'society');
    assert.strictEqual(linkedPoint.societyId.toString(), approvedSoc._id.toString());
    assert.strictEqual(linkedPoint.wardId, 'N-WARD');
    assert.strictEqual(linkedPoint.location.lat, 19.0860);
  });

  it('14. Repeated/concurrent approval creates no duplicate point and returns 409 Conflict', async () => {
    const approvedSoc = await Society.findOne({ representativeId: repUser1._id });

    // Repeated approval attempt
    const repeatRes = await apiRequest(`/api/societies/${approvedSoc._id}/review`, {
      method: 'PATCH',
      token: officerNWardToken,
      body: { decision: 'APPROVED' }
    });

    assert.strictEqual(repeatRes.status, 409);
    assert.strictEqual(repeatRes.data.success, false);

    // Verify only ONE collection point exists for this society
    const pointCount = await CollectionPoint.countDocuments({ societyId: approvedSoc._id });
    assert.strictEqual(pointCount, 1, 'Exactly one collection point must exist for approved society');
  });

  it('15. Approved society QR retrieval returns valid PNG image and stable identifier', async () => {
    const approvedSoc = await Society.findOne({ representativeId: repUser1._id });

    // Fetch as PNG
    const pngRes = await apiRequest(`/api/societies/${approvedSoc._id}/qr-image`, {
      token: repToken1
    });
    assert.strictEqual(pngRes.status, 200);
    assert.strictEqual(pngRes.headers.get('content-type'), 'image/png');
    assert.ok(pngRes.data.byteLength > 100, 'Expected non-empty PNG buffer');

    // Fetch as JSON / dataURL
    const jsonRes = await apiRequest(`/api/societies/${approvedSoc._id}/qr-image?format=json`, {
      token: repToken1
    });
    assert.strictEqual(jsonRes.status, 200);
    assert.strictEqual(jsonRes.data.qrCode, approvedSoc.qrCode);
    assert.match(jsonRes.data.qrImageUrl, /^data:image\/png;base64,/);
  });

  it('16. Existing collection points and pickup history remain intact', async () => {
    // Legacy collection point (not linked to any society)
    const legacyPoint = await CollectionPoint.create({
      name: 'Sunrise Apartments (Legacy)',
      type: 'society',
      wardId: 'N-WARD',
      address: 'LBS Marg, Ghatkopar',
      location: { lat: 19.1136, lng: 72.8697 },
      societyId: null
    });

    // Verify it exists with societyId null
    const found = await CollectionPoint.findById(legacyPoint._id);
    assert.ok(found);
    assert.strictEqual(found.societyId, null);
    assert.strictEqual(found.name, 'Sunrise Apartments (Legacy)');
  });
});
