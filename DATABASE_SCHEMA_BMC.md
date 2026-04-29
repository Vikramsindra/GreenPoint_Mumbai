# Database Schema Reference - BMC Collector System

## Collections Overview

### 1. users

Extended User collection with BMC Collector support.

```javascript
{
  _id: ObjectId,
  name: String,
  phone: String (unique, 10 digits),
  email: String,
  passwordHash: String,

  role: Enum [
    'citizen',
    'collector',        // Society Collector (existing)
    'bmc_collector',    // NEW
    'officer'
  ],

  // For collector/bmc_collector roles:
  collectorId: String (required if role is collector/bmc_collector),
  assignedCollectionPoints: [ObjectId], // NEW: refs to CollectionPoint

  // Ward assignment:
  wardId: String,
  societyId: String (for citizens),

  // Citizen-specific:
  householdId: ObjectId (ref: Household),
  pointsBalance: Number,
  violationCount30d: Number,

  // Meta:
  isActive: Boolean,
  lastLoginAt: Date,
  createdAt: Date
}
```

**Indexes**:

- `phone` (unique)
- `wardId, role`
- `role`

---

### 2. collectionpoints (NEW)

Locations where BMC collectors pick up waste.

```javascript
{
  _id: ObjectId,

  name: String,
  type: Enum ['society', 'public_bin', 'transfer_station'],

  // Location:
  location: {
    lat: Number,
    lng: Number
  },
  address: String,

  // Assignment:
  wardId: String,
  assignedCollectorId: ObjectId (ref: User - bmc_collector),

  // Contact info (mainly for societies/stations):
  contactPerson: String,
  contactPhone: String,

  // Status:
  isActive: Boolean,
  lastCollectionAt: Date,

  // Additional data:
  metadata: Mixed,
  createdAt: Date
}
```

**Indexes**:

- `wardId, type`
- `assignedCollectorId`
- `isActive`

**Sample Documents**:

```javascript
// Society
{
  name: "Sunrise Apartments",
  type: "society",
  location: { lat: 19.1136, lng: 72.8697 },
  address: "LBS Marg, Ghatkopar East",
  wardId: "N-WARD",
  assignedCollectorId: ObjectId("..."),
  contactPerson: "Rajesh Sharma",
  contactPhone: "9876543240",
  isActive: true,
  lastCollectionAt: ISODate("2026-04-28T08:30:00Z")
}

// Public Bin
{
  name: "Public Bin - LBS Road Junction",
  type: "public_bin",
  location: { lat: 19.1140, lng: 72.8710 },
  address: "LBS Marg Junction, Ghatkopar",
  wardId: "N-WARD",
  assignedCollectorId: ObjectId("..."),
  isActive: true
}

// Transfer Station
{
  name: "Transfer Point - Govandi",
  type: "transfer_station",
  location: { lat: 19.0400, lng: 72.8540 },
  address: "Govandi Transfer Station",
  wardId: "N-WARD",
  assignedCollectorId: ObjectId("..."),
  contactPerson: "Station Manager",
  contactPhone: "9876543243",
  isActive: true
}
```

---

### 3. bulkcollections (NEW)

Records of waste collected at collection points.

```javascript
{
  _id: ObjectId,

  // Who and where:
  bmcCollectorId: ObjectId (ref: User - bmc_collector),
  collectionPointId: ObjectId (ref: CollectionPoint),

  // What:
  wasteType: Enum ['wet', 'dry', 'mixed', 'bulk'],
  weight: Number (kg),

  // Evidence:
  photoUrl: String,

  // Context:
  wardId: String,
  notes: String,
  location: {
    lat: Number,
    lng: Number
  },

  // Verification:
  status: Enum ['pending', 'verified', 'rejected'],
  verifiedBy: ObjectId (ref: User - officer),
  verificationNotes: String,

  // Timeline:
  timestamp: Date,
  createdAt: Date
}
```

**Indexes**:

- `bmcCollectorId, timestamp DESC`
- `collectionPointId, timestamp DESC`
- `wardId, timestamp DESC`
- `status`

**Sample Document**:

```javascript
{
  bmcCollectorId: ObjectId("collector_1"),
  collectionPointId: ObjectId("sunrise_apts"),
  wasteType: "mixed",
  weight: 125.5,
  wardId: "N-WARD",
  notes: "Mixed waste from main entrance and rear gate",
  location: { lat: 19.1136, lng: 72.8697 },
  status: "pending",
  timestamp: ISODate("2026-04-28T08:45:00Z"),
  createdAt: ISODate("2026-04-28T08:46:00Z")
}
```

---

## Relationships Diagram

```
users (officer)
  ├─→ creates ─→ CollectionPoints
  └─→ verifies ─→ BulkCollections

users (bmc_collector)
  ├─ has many assignedCollectionPoints
  └─→ logs ─→ BulkCollections

CollectionPoints
  ├─ assigned to users (bmc_collector)
  └─ has many BulkCollections

BulkCollections
  └─ verified by users (officer)
```

---

## Query Examples

### Get all collection points for a collector

```javascript
db.collectionpoints.find({
  assignedCollectorId: ObjectId("..."),
  isActive: true,
});
```

### Get today's collections for a collector

```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);

db.bulkcollections.find({
  bmcCollectorId: ObjectId("..."),
  timestamp: {
    $gte: today,
    $lt: new Date(today.getTime() + 86400000),
  },
});
```

### Get pending verifications for an officer

```javascript
db.bulkcollections
  .find({
    wardId: "N-WARD",
    status: "pending",
  })
  .sort({ timestamp: -1 });
```

### Get collector statistics

```javascript
db.bulkcollections.aggregate([
  { $match: { bmcCollectorId: ObjectId("...") } },
  {
    $group: {
      _id: null,
      totalCollections: { $sum: 1 },
      totalWeight: { $sum: "$weight" },
      avgWeight: { $avg: "$weight" },
      wasteTypes: { $push: "$wasteType" },
    },
  },
]);
```

### Get waste type distribution by ward

```javascript
db.bulkcollections.aggregate([
  { $match: { wardId: "N-WARD" } },
  {
    $group: {
      _id: "$wasteType",
      count: { $sum: 1 },
      totalWeight: { $sum: "$weight" },
    },
  },
  { $sort: { totalWeight: -1 } },
]);
```

---

## Data Validation Rules

### CollectionPoint

- `name`: 2-200 characters
- `type`: Must be one of ['society', 'public_bin', 'transfer_station']
- `location.lat`: -90 to 90
- `location.lng`: -180 to 180
- `wardId`: Required, must match officer's wardId

### BulkCollection

- `weight`: > 0 kg
- `wasteType`: Must be one of ['wet', 'dry', 'mixed', 'bulk']
- `collectionPointId`: Must be assigned to collector
- `timestamp`: Cannot be in future
- `status`: Default 'pending' on creation

---

## Indexes Summary

```javascript
// users
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ wardId: 1, role: 1 });

// collectionpoints
db.collectionpoints.createIndex({ wardId: 1, type: 1 });
db.collectionpoints.createIndex({ assignedCollectorId: 1 });
db.collectionpoints.createIndex({ isActive: 1 });

// bulkcollections
db.bulkcollections.createIndex({ bmcCollectorId: 1, timestamp: -1 });
db.bulkcollections.createIndex({ collectionPointId: 1, timestamp: -1 });
db.bulkcollections.createIndex({ wardId: 1, timestamp: -1 });
db.bulkcollections.createIndex({ status: 1 });
```

---

## Migration Notes

### From Previous Version

If upgrading from version < 1.0 with only Collector role:

1. No breaking changes to existing `users`, `households`, `pointevents` collections
2. New collections (`collectionpoints`, `bulkcollections`) are additive
3. Existing "Collector" role remains as-is (Society Collector)
4. Add `bmc_collector` role value to User.role enum

### Backward Compatibility

- ✅ All existing collector routes continue to work
- ✅ Citizen point system unaffected
- ✅ Violation tracking unaffected
- ✅ New BMC system is parallel, not replacing existing features

---

## Performance Considerations

### Collection Sizes (Expected)

- **users**: Thousands (households + staff)
- **collectionpoints**: Hundreds per ward
- **bulkcollections**: Millions over time (1000s per day per ward)

### Recommended Sharding Strategy

For large deployments, consider sharding on `wardId` for:

- collectionpoints
- bulkcollections

---

## Monitoring Queries

### Daily summary

```javascript
db.bulkcollections.aggregate([
  {
    $match: {
      timestamp: {
        $gte: ISODate("2026-04-28T00:00:00Z"),
        $lt: ISODate("2026-04-29T00:00:00Z"),
      },
    },
  },
  {
    $group: {
      _id: "$wardId",
      collectors: { $addToSet: "$bmcCollectorId" },
      points: { $addToSet: "$collectionPointId" },
      totalWeight: { $sum: "$weight" },
      count: { $sum: 1 },
    },
  },
]);
```

### Pending verifications (stale)

```javascript
db.bulkcollections
  .find({
    status: "pending",
    createdAt: { $lt: new Date(Date.now() - 86400000) }, // > 1 day old
  })
  .count();
```

---

**Last Updated**: April 28, 2026
**Database Version**: MongoDB 4.4+
