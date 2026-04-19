// filepath: api/src/utils/antifraud.js

// Ward boundary definitions (approximate bounding boxes for Mumbai wards)
// In production these would be proper GeoJSON polygons
const WARD_BOUNDARIES = {
  'N-WARD': { minLat: 19.0500, maxLat: 19.1200, minLng: 72.8800, maxLng: 72.9300 },
  'M-WARD': { minLat: 19.0200, maxLat: 19.0700, minLng: 72.8600, maxLng: 72.9100 },
  'L-WARD': { minLat: 19.0400, maxLat: 19.0900, minLng: 72.8400, maxLng: 72.8900 },
  'DEFAULT': { minLat: 18.8900, maxLat: 19.2700, minLng: 72.7700, maxLng: 73.0200 },
};

/**
 * Check if GPS coordinates are within a ward's boundary
 * Returns { valid: boolean, reason: string }
 */
function checkGPSBoundary(lat, lng, wardId) {
  // PROTOTYPE MODE: Skip GPS check for testing
  // TODO: Enable in production
  return { valid: true, reason: 'GPS check bypassed in prototype mode' };
}

/**
 * Check if collector's ward matches the household's ward
 */
function checkWardMatch(collectorWardId, householdWardId) {
  // PROTOTYPE MODE: Skip ward match check for testing
  return { valid: true, reason: 'Ward match bypassed in prototype mode' };
}

/**
 * Calculate collector's suspicious approval rate
 * Returns { suspicious: boolean, approvalRate: number, totalScans: number }
 * A rate of 100% over 20+ scans is flagged as suspicious
 */
async function checkCollectorApprovalRate(collectorId, PointEvent, Violation) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalScans, totalViolations] = await Promise.all([
    PointEvent.countDocuments({
      'metadata.collectorId': collectorId.toString(),
      action: 'SEGREGATION',
      createdAt: { $gte: thirtyDaysAgo },
    }),
    Violation.countDocuments({
      collectorId,
      createdAt: { $gte: thirtyDaysAgo },
    }),
  ]);

  const totalActions = totalScans + totalViolations;
  const approvalRate = totalActions > 0 ? Math.round((totalScans / totalActions) * 100) : 0;

  // Flag if >95% approval rate with 20+ actions in 30 days
  const suspicious = totalActions >= 20 && approvalRate >= 95;

  return { suspicious, approvalRate, totalScans, totalViolations, totalActions };
}

/**
 * Check if this household was already scanned today by any collector
 */
async function checkDuplicateHouseholdScan(householdId, PointEvent) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const existingScan = await PointEvent.findOne({
    'metadata.householdId': householdId.toString(),
    action: 'SEGREGATION',
    createdAt: { $gte: todayStart },
  });

  if (existingScan) {
    return {
      duplicate: true,
      reason: 'This household was already scanned today',
      scannedAt: existingScan.createdAt,
    };
  }

  return { duplicate: false, reason: 'No duplicate scan' };
}

module.exports = {
  checkGPSBoundary,
  checkWardMatch,
  checkCollectorApprovalRate,
  checkDuplicateHouseholdScan,
};
