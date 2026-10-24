// filepath: api/tests/task5_society_rewards_redemption.test.js
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
const SocietyVoucher = require('../src/models/SocietyVoucher');
const SocietyPointEvent = require('../src/models/SocietyPointEvent');
const CollectionPoint = require('../src/models/CollectionPoint');
const BulkCollection = require('../src/models/BulkCollection');
const { generateSocietyQRCodeString, generateSocietyVoucherCode } = require('../src/utils/qrGenerator');
const { SOCIETY_REWARDS_CATALOGUE } = require('../src/constants/societyRewardsCatalogue');

const TEST_DB_NAME = 'greenpoint_task5_test_db';

let server;
let baseURL;

// Test Actors
let officerKWest, officerKWestToken;
let officerHWest, officerHWestToken;
let repKWest, repKWestToken;
let repHWest, repHWestToken;
let repPending, repPendingToken;
let citizenKWest, citizenKWestToken;
let bmcCollectorKWest, bmcCollectorKWestToken;

let societyKWest;
let societyHWest;
let societyPending;

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

  return { status: res.status, ok: res.ok, body: data };
}

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

describe('Task 5: Society Reward Redemption and One-Time Voucher Fulfilment', () => {
  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
    await mongoose.connect(mongoUri, { dbName: TEST_DB_NAME });

    // Clean test db collections
    await User.deleteMany({});
    await Society.deleteMany({});
    await SocietyVoucher.deleteMany({});
    await SocietyPointEvent.deleteMany({});
    await CollectionPoint.deleteMany({});
    await BulkCollection.deleteMany({});

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseURL = `http://127.0.0.1:${port}`;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password@123', salt);

    // Officers
    officerKWest = await User.create({
      name: 'Officer K-West',
      phone: '9820000001',
      role: 'officer',
      wardId: 'K-West',
      officerId: 'OFF-KW-01',
      passwordHash: passwordHash,
      isActive: true
    });
    officerKWestToken = makeToken(officerKWest);

    officerHWest = await User.create({
      name: 'Officer H-West',
      phone: '9820000002',
      role: 'officer',
      wardId: 'H-West',
      officerId: 'OFF-HW-01',
      passwordHash: passwordHash,
      isActive: true
    });
    officerHWestToken = makeToken(officerHWest);

    // Representatives
    repKWest = await User.create({
      name: 'Rep K-West Society',
      phone: '9820000003',
      role: 'society_representative',
      wardId: 'K-West',
      passwordHash: passwordHash,
      pointsBalance: 50, // Personal balance should NOT be used or deducted
      isActive: true
    });
    repKWestToken = makeToken(repKWest);

    repHWest = await User.create({
      name: 'Rep H-West Society',
      phone: '9820000004',
      role: 'society_representative',
      wardId: 'H-West',
      passwordHash: passwordHash,
      pointsBalance: 100,
      isActive: true
    });
    repHWestToken = makeToken(repHWest);

    repPending = await User.create({
      name: 'Rep Pending Society',
      phone: '9820000005',
      role: 'society_representative',
      wardId: 'K-West',
      passwordHash: passwordHash,
      isActive: true
    });
    repPendingToken = makeToken(repPending);

    // Citizen and BMC Collector
    citizenKWest = await User.create({
      name: 'Citizen K-West',
      phone: '9820000006',
      role: 'citizen',
      wardId: 'K-West',
      passwordHash: passwordHash,
      pointsBalance: 150,
      isActive: true
    });
    citizenKWestToken = makeToken(citizenKWest);

    bmcCollectorKWest = await User.create({
      name: 'BMC Collector K-West',
      phone: '9820000007',
      role: 'bmc_collector',
      wardId: 'K-West',
      collectorId: 'BMC-KW-01',
      passwordHash: passwordHash,
      isActive: true
    });
    bmcCollectorKWestToken = makeToken(bmcCollectorKWest);

    // Societies
    societyKWest = await Society.create({
      name: 'Palm Grove CHS',
      registrationNumber: 'KW/CHS/2026/01',
      wardId: 'K-West',
      address: 'Juhu Tara Road, K-West',
      representativeId: repKWest._id,
      registrationStatus: 'APPROVED',
      pointsBalance: 30, // Society balance for redemption
      societyQrCode: generateSocietyQRCodeString()
    });

    societyHWest = await Society.create({
      name: 'Sea Breeze CHS',
      registrationNumber: 'HW/CHS/2026/02',
      wardId: 'H-West',
      address: 'Bandra West, H-West',
      representativeId: repHWest._id,
      registrationStatus: 'APPROVED',
      pointsBalance: 50,
      societyQrCode: generateSocietyQRCodeString()
    });

    societyPending = await Society.create({
      name: 'Pending Heights CHS',
      registrationNumber: 'KW/CHS/2026/03',
      wardId: 'K-West',
      address: 'Andheri West, K-West',
      representativeId: repPending._id,
      registrationStatus: 'PENDING',
      pointsBalance: 20
    });
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  it('1. Representative sees server catalogue and own society points balance', async () => {
    const res = await apiRequest('/api/society-rewards/catalogue', { token: repKWestToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.pointsBalance, 30);
    assert.equal(res.body.data.society.name, 'Palm Grove CHS');
    assert.ok(Array.isArray(res.body.data.catalogue));
    assert.ok(res.body.data.catalogue.length >= 2);

    const reward10 = res.body.data.catalogue.find(r => r.pointsCost === 10);
    assert.ok(reward10, 'Catalogue must include at least one 10-point pilot reward');
    assert.equal(reward10.id, 'DEMO-REWARD-10');
  });

  it('2. Unknown or inactive reward is rejected', async () => {
    const res = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: {
        rewardId: 'NON-EXISTENT-REWARD',
        requestId: 'req-unknown-1'
      }
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /invalid or inactive reward/i);
  });

  it('3. Pending or rejected society representative cannot redeem', async () => {
    const res = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repPendingToken,
      body: {
        rewardId: 'DEMO-REWARD-10',
        requestId: 'req-pending-1'
      }
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /only approved societies/i);
  });

  it('4. Insufficient points balance is rejected without writes', async () => {
    const res = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: {
        rewardId: 'DEMO-REWARD-50', // Costs 50, society only has 30
        requestId: 'req-insufficient-1'
      }
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /insufficient/i);

    // Verify no voucher was created
    const vouchersCount = await SocietyVoucher.countDocuments({ requestId: 'req-insufficient-1' });
    assert.equal(vouchersCount, 0);

    // Verify balance unchanged
    const society = await Society.findById(societyKWest._id);
    assert.equal(society.pointsBalance, 30);
  });

  it('5. Submitted client prices are ignored; server catalogue cost is authoritative', async () => {
    const res = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: {
        rewardId: 'DEMO-REWARD-10',
        pointsCost: 1, // Malicious client attempt to pay 1 point instead of 10
        requestId: 'req-price-tamper-1'
      }
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.pointsSpent, 10); // Deducted 10, not 1!
    assert.equal(res.body.data.remainingBalance, 20); // 30 - 10 = 20

    const updatedSociety = await Society.findById(societyKWest._id);
    assert.equal(updatedSociety.pointsBalance, 20);
  });

  it('6. Redemption deducts Society balance only; User.pointsBalance remains untouched', async () => {
    const userBefore = await User.findById(repKWest._id);
    assert.equal(userBefore.pointsBalance, 50); // Unchanged personal balance

    const res = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: {
        rewardId: 'DEMO-REWARD-10',
        requestId: 'req-personal-balance-test-1'
      }
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.remainingBalance, 10); // 20 - 10 = 10

    const userAfter = await User.findById(repKWest._id);
    assert.equal(userAfter.pointsBalance, 50, 'Personal User.pointsBalance must never be changed by society redemption');
  });

  it('7. Exactly one voucher and one ledger entry are created on successful redemption', async () => {
    const requestId = 'req-exact-one-test';
    const res = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: {
        rewardId: 'DEMO-REWARD-10',
        requestId
      }
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.remainingBalance, 0); // 10 - 10 = 0

    const vouchers = await SocietyVoucher.find({ requestId });
    assert.equal(vouchers.length, 1);
    const voucher = vouchers[0];
    assert.equal(voucher.status, 'ISSUED');
    assert.match(voucher.voucherCode, /^GP-VOUCH-[A-Z0-9]{12}$/);

    const ledgerEntries = await SocietyPointEvent.find({ voucherId: voucher._id });
    assert.equal(ledgerEntries.length, 1);
    assert.equal(ledgerEntries[0].type, 'REDEEM');
    assert.equal(ledgerEntries[0].pointsDeducted, 10);
    assert.equal(ledgerEntries[0].pointsAwarded, 0);
  });

  it('8. Same-request retry returns existing voucher without another deduction (idempotency)', async () => {
    const requestId = 'req-idempotent-retry-test';
    // Top up society balance to test idempotency cleanly
    await Society.findByIdAndUpdate(societyKWest._id, { pointsBalance: 20 });

    // First attempt
    const res1 = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: {
        rewardId: 'DEMO-REWARD-10',
        requestId
      }
    });
    assert.equal(res1.status, 201);
    const voucherCode1 = res1.body.data.voucher.voucherCode;

    // Retry with exact same requestId and rewardId
    const res2 = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: {
        rewardId: 'DEMO-REWARD-10',
        requestId
      }
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.body.isDuplicate, true);
    assert.equal(res2.body.data.voucher.voucherCode, voucherCode1);
    assert.equal(res2.body.data.pointsSpent, 0);

    // Verify balance was deducted only once: 20 - 10 = 10
    const society = await Society.findById(societyKWest._id);
    assert.equal(society.pointsBalance, 10);
  });

  it('9. Different reward with same request ID returns 409 Conflict', async () => {
    const requestId = 'req-conflict-reward-test';
    const res1 = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: {
        rewardId: 'DEMO-REWARD-10',
        requestId
      }
    });
    assert.equal(res1.status, 201);

    // Attempt second redemption with different rewardId and same requestId
    const res2 = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: {
        rewardId: 'DEMO-REWARD-25',
        requestId
      }
    });
    assert.equal(res2.status, 409);
    assert.equal(res2.body.success, false);
    assert.match(res2.body.message, /different reward/i);
  });

  it('10. Another representative cannot retrieve or hijack a voucher with matching request ID', async () => {
    const requestId = 'req-hijack-test';
    await Society.findByIdAndUpdate(societyKWest._id, { pointsBalance: 20 });
    const res1 = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: {
        rewardId: 'DEMO-REWARD-10',
        requestId
      }
    });
    assert.equal(res1.status, 201);

    // Another representative submits the same requestId
    const res2 = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repHWestToken,
      body: {
        rewardId: 'DEMO-REWARD-10',
        requestId
      }
    });
    assert.equal(res2.status, 409);
    assert.equal(res2.body.success, false);
    assert.match(res2.body.message, /another account/i);
  });

  it('11. Concurrent redemptions cannot overspend society points balance', async () => {
    // Set society balance to exactly 10 points
    await Society.findByIdAndUpdate(societyKWest._id, { pointsBalance: 10 });

    // Fire 3 simultaneous redemptions of 10 points each with distinct requestIds
    const promises = [1, 2, 3].map(i =>
      apiRequest('/api/society-rewards/redeem', {
        method: 'POST',
        token: repKWestToken,
        body: {
          rewardId: 'DEMO-REWARD-10',
          requestId: `req-concurrent-${i}`
        }
      })
    );

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.status === 201).length;
    const failCount = results.filter(r => r.status === 400).length;

    assert.equal(successCount, 1, 'Exactly one concurrent redemption should succeed');
    assert.equal(failCount, 2, 'Other concurrent redemptions should be rejected for insufficient balance');

    const society = await Society.findById(societyKWest._id);
    assert.equal(society.pointsBalance, 0, 'Final society balance must be 0 and never negative');
  });

  it('12. Ward Officer sees only their own ward vouchers', async () => {
    // Reset and issue one voucher in K-West and one in H-West
    await Society.findByIdAndUpdate(societyKWest._id, { pointsBalance: 20 });
    await Society.findByIdAndUpdate(societyHWest._id, { pointsBalance: 50 });

    const resK = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: { rewardId: 'DEMO-REWARD-10', requestId: 'req-ward-k-1' }
    });
    assert.equal(resK.status, 201);

    const resH = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repHWestToken,
      body: { rewardId: 'DEMO-REWARD-25', requestId: 'req-ward-h-1' }
    });
    assert.equal(resH.status, 201);

    // K-West Officer lists vouchers
    const officerKList = await apiRequest('/api/society-rewards/vouchers', { token: officerKWestToken });
    assert.equal(officerKList.status, 200);
    const kCodes = officerKList.body.data.vouchers.map(v => v.voucherCode);
    assert.ok(kCodes.includes(resK.body.data.voucher.voucherCode));
    assert.ok(!kCodes.includes(resH.body.data.voucher.voucherCode), 'K-West officer must not see H-West vouchers');

    // H-West Officer lists vouchers
    const officerHList = await apiRequest('/api/society-rewards/vouchers', { token: officerHWestToken });
    assert.equal(officerHList.status, 200);
    const hCodes = officerHList.body.data.vouchers.map(v => v.voucherCode);
    assert.ok(hCodes.includes(resH.body.data.voucher.voucherCode));
    assert.ok(!hCodes.includes(resK.body.data.voucher.voucherCode), 'H-West officer must not see K-West vouchers');
  });

  it('13. Ward Officer can fulfil an issued voucher once; records officer and timestamp', async () => {
    // Issue fresh voucher in K-West
    await Society.findByIdAndUpdate(societyKWest._id, { pointsBalance: 20 });
    const redeemRes = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: { rewardId: 'DEMO-REWARD-10', requestId: 'req-fulfil-success-1' }
    });
    assert.equal(redeemRes.status, 201);
    const voucherId = redeemRes.body.data.voucher.id;

    // Fulfil as K-West officer
    const fulfilRes = await apiRequest(`/api/society-rewards/vouchers/${voucherId}/fulfil`, {
      method: 'PATCH',
      token: officerKWestToken,
      body: { notes: 'Delivered composting starter culture during ward demo visit' }
    });
    assert.equal(fulfilRes.status, 200);
    assert.equal(fulfilRes.body.success, true);
    assert.equal(fulfilRes.body.data.status, 'FULFILLED');
    assert.equal(fulfilRes.body.data.effectiveStatus, 'FULFILLED');
    assert.ok(fulfilRes.body.data.fulfilledAt);
    assert.equal(fulfilRes.body.data.fulfilledBy.name, 'Officer K-West');
    assert.equal(fulfilRes.body.data.fulfilmentNotes, 'Delivered composting starter culture during ward demo visit');

    // Representative views vouchers and sees FULFILLED status and officer details
    const repVouchers = await apiRequest('/api/society-rewards/my/vouchers', { token: repKWestToken });
    assert.equal(repVouchers.status, 200);
    const fulfilledVoucher = repVouchers.body.data.vouchers.find(v => v.id === voucherId);
    assert.ok(fulfilledVoucher);
    assert.equal(fulfilledVoucher.status, 'FULFILLED');
    assert.equal(fulfilledVoucher.fulfilledBy.name, 'Officer K-West');
  });

  it('14. Second or repeated fulfilment is rejected (cannot fulfil twice)', async () => {
    // Issue voucher
    await Society.findByIdAndUpdate(societyKWest._id, { pointsBalance: 20 });
    const redeemRes = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: { rewardId: 'DEMO-REWARD-10', requestId: 'req-double-fulfil-1' }
    });
    const voucherId = redeemRes.body.data.voucher.id;

    // First fulfilment
    const firstFulfil = await apiRequest(`/api/society-rewards/vouchers/${voucherId}/fulfil`, {
      method: 'PATCH',
      token: officerKWestToken,
      body: { notes: 'First fulfilment' }
    });
    assert.equal(firstFulfil.status, 200);

    // Second fulfilment attempt
    const secondFulfil = await apiRequest(`/api/society-rewards/vouchers/${voucherId}/fulfil`, {
      method: 'PATCH',
      token: officerKWestToken,
      body: { notes: 'Second fulfilment attempt' }
    });
    assert.equal(secondFulfil.status, 400);
    assert.equal(secondFulfil.body.success, false);
    assert.match(secondFulfil.body.message, /already been fulfilled/i);
  });

  it('15. Officer from another ward cannot fulfil a cross-ward voucher', async () => {
    // Issue voucher in K-West
    await Society.findByIdAndUpdate(societyKWest._id, { pointsBalance: 20 });
    const redeemRes = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: { rewardId: 'DEMO-REWARD-10', requestId: 'req-cross-ward-fulfil-1' }
    });
    const voucherId = redeemRes.body.data.voucher.id;

    // H-West officer attempts to fulfil K-West voucher
    const res = await apiRequest(`/api/society-rewards/vouchers/${voucherId}/fulfil`, {
      method: 'PATCH',
      token: officerHWestToken,
      body: { notes: 'Cross ward attempt' }
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /only authorized to fulfil Ward H-West/i);
  });

  it('16. Expired voucher cannot be fulfilled and displays as EXPIRED', async () => {
    // Issue voucher and artificially set expiresAt to the past
    await Society.findByIdAndUpdate(societyKWest._id, { pointsBalance: 20 });
    const redeemRes = await apiRequest('/api/society-rewards/redeem', {
      method: 'POST',
      token: repKWestToken,
      body: { rewardId: 'DEMO-REWARD-10', requestId: 'req-expired-voucher-1' }
    });
    const voucherId = redeemRes.body.data.voucher.id;

    // Artificially expire the voucher
    await SocietyVoucher.findByIdAndUpdate(voucherId, {
      expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
    });

    // Officer attempts to fulfil
    const res = await apiRequest(`/api/society-rewards/vouchers/${voucherId}/fulfil`, {
      method: 'PATCH',
      token: officerKWestToken
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /expired/i);

    // Representative views vouchers - effectiveStatus must be EXPIRED
    const repVouchers = await apiRequest('/api/society-rewards/my/vouchers', { token: repKWestToken });
    const expiredVoucher = repVouchers.body.data.vouchers.find(v => v.id === voucherId);
    assert.ok(expiredVoucher);
    assert.equal(expiredVoucher.effectiveStatus, 'EXPIRED');
    assert.equal(expiredVoucher.isFulfillable, false);
  });

  it('17. Task 4 daily earning works after redemptions without index conflicts', async () => {
    // SocietyPalmGrove has had redemptions today.
    // Create an eligible municipal pickup event to verify Task 4 earning still succeeds
    const collectionPoint = await CollectionPoint.create({
      name: 'Palm Grove Waste Gate',
      pointCode: 'CP-PALM-01',
      qrCode: generateSocietyQRCodeString(),
      wardId: 'K-West',
      type: 'society',
      societyId: societyKWest._id,
      assignedCollectorId: bmcCollectorKWest._id,
      operatingHours: { open: '06:00', close: '18:00' }
    });

    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const istBusinessDate = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;

    // BulkCollection record
    const bulkCollection = await BulkCollection.create({
      collectionPointId: collectionPoint._id,
      societyId: societyKWest._id,
      bmcCollectorId: bmcCollectorKWest._id,
      wardId: 'K-West',
      wasteType: 'wet',
      weightKg: 45,
      outcome: 'SEGREGATED',
      pointsAwarded: 10,
      pointsReason: 'Society waste pickup: fully segregated',
      istBusinessDate,
      verificationMethod: 'SOCIETY_QR'
    });

    // Create positive SocietyPointEvent
    const earnEvent = new SocietyPointEvent({
      societyId: societyKWest._id,
      type: 'EARN',
      collectionId: bulkCollection._id,
      pointsAwarded: 10,
      reason: 'Society waste pickup: fully segregated',
      collectorId: bmcCollectorKWest._id,
      istBusinessDate
    });
    await earnEvent.save();

    await Society.findByIdAndUpdate(societyKWest._id, { $inc: { pointsBalance: 10 } });

    // Verify representative transactions endpoint shows both EARN and REDEEM
    const txRes = await apiRequest('/api/society-rewards/my/transactions', { token: repKWestToken });
    assert.equal(txRes.status, 200);
    assert.ok(Array.isArray(txRes.body.data.transactions));
    const earnTx = txRes.body.data.transactions.find(t => t.type === 'EARN');
    const redeemTx = txRes.body.data.transactions.find(t => t.type === 'REDEEM');

    assert.ok(earnTx, 'Earn transaction must be present');
    assert.equal(earnTx.sign, '+');
    assert.equal(earnTx.pointsDisplay, '+10 pts');

    assert.ok(redeemTx, 'Redeem transaction must be present');
    assert.equal(redeemTx.sign, '-');
    assert.equal(redeemTx.pointsDisplay, '-10 pts');
  });

  it('18. Legacy citizen redemption write endpoint is disabled with informative explanation', async () => {
    const res = await apiRequest('/api/points/redeem', {
      method: 'POST',
      token: citizenKWestToken,
      body: {
        rewardId: 'UTILITY_100',
        pointsCost: 100
      }
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /temporarily paused during the BMC Society Rewards pilot/i);

    // Verify citizen points balance was not deducted
    const citizen = await User.findById(citizenKWest._id);
    assert.equal(citizen.pointsBalance, 150);
  });
});
