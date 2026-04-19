// src/jobs/penaltyEscalation.js

const cron = require('node-cron');
const User = require('../../models/User');

// ─── Monthly Violation Window Reset ──────────────────────────────────────────

/**
 * Scheduled job: resets every user's rolling 30-day violation counter to 0.
 *
 * Schedule: '0 0 1 * *'
 *   → Runs at 00:00 on the 1st day of every month (server local time).
 *
 * Why this job exists:
 *   The penalty engine uses the last 30 days of violation history to determine
 *   the offence tier. `violationCount30d` on the User document is a denormalised
 *   counter used for quick dashboard reads. This job keeps that counter in sync
 *   with reality at the start of each calendar month.
 *
 * Important:
 *   This job must be imported and run once in the main entry point (index.js)
 *   so that the cron task is registered when the server starts.
 *
 * @example
 * // index.js
 * require('./src/jobs/penaltyEscalation');
 */

/**
 * Core reset logic — exported separately so it can be unit-tested or triggered
 * manually by an admin endpoint without waiting for the cron schedule.
 *
 * @returns {Promise<number>} Number of user documents updated.
 */
const resetViolationCounts = async () => {
  const result = await User.updateMany(
    { violationCount30d: { $gt: 0 } }, // only touch docs that actually need resetting
    { $set: { violationCount30d: 0 } }
  );

  const count = result.modifiedCount ?? result.nModified ?? 0;
  console.log(
    `[penaltyEscalation] Monthly violation window reset complete — ${count} user(s) updated`,
    `| ${new Date().toISOString()}`
  );

  return count;
};

// ─── Register Cron Task ───────────────────────────────────────────────────────

/**
 * node-cron task registered at module load time.
 *
 * Cron expression breakdown:
 *   ┌────────────── minute  (0)
 *   │ ┌──────────── hour    (0 = midnight)
 *   │ │ ┌────────── day of month  (1 = 1st)
 *   │ │ │ ┌──────── month   (* = every month)
 *   │ │ │ │ ┌────── day of week  (* = any)
 *   0 0 1 * *
 *
 * Options:
 *   scheduled: true   — task starts immediately upon registration
 *   timezone:         — set to your deployment timezone to avoid UTC drift
 *                       e.g. 'Asia/Kolkata' for Mumbai
 */
const task = cron.schedule(
  '0 0 1 * *',
  async () => {
    console.log('[penaltyEscalation] Starting monthly violation window reset...');
    try {
      await resetViolationCounts();
    } catch (err) {
      console.error('[penaltyEscalation] Reset failed:', err.message);
    }
  },
  {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  }
);

console.log('[penaltyEscalation] Monthly reset job registered (runs on 1st of each month at 00:00 IST)');

module.exports = { task, resetViolationCounts };
