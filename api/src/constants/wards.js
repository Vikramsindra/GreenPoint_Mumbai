// filepath: api/src/constants/wards.js

// Canonical Mumbai Municipal Administrative Wards
// GreenPoint supports standard BMC wards and prototype ward notations.
const VALID_WARDS = [
  'N-WARD',
  'S-WARD',
  'E-WARD',
  'W-WARD',
  'C-WARD',
  'H-WARD',
  'M-WARD',
  'L-WARD',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F-NORTH',
  'F-SOUTH',
  'G-NORTH',
  'G-SOUTH',
  'H-EAST',
  'H-WEST',
  'K-EAST',
  'K-WEST',
  'L',
  'M-EAST',
  'M-WEST',
  'N',
  'P-NORTH',
  'P-SOUTH',
  'R-NORTH',
  'R-SOUTH',
  'R-CENTRAL',
  'S',
  'T'
];

function isValidWard(ward) {
  if (!ward || typeof ward !== 'string') return false;
  const normalized = ward.trim().toUpperCase();
  return VALID_WARDS.includes(normalized);
}

module.exports = {
  VALID_WARDS,
  isValidWard
};
