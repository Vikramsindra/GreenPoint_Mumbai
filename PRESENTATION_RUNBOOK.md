# GreenPoint Mumbai — 6–8 Minute BMC Presentation Runbook

A structured, rehearsed demonstration script for presenting the GreenPoint Mumbai pilot to visiting BMC officials.

---

## Pre-Demo Checklist (Complete 10 Minutes Before Presentation)

1. **Database Ready**: Run `npm run demo:prepare` in `api/` to ensure a clean live-start state.
2. **Backend Online**: Terminal 1 running `npm run start` in `api/` (listening on `0.0.0.0:5000`).
3. **Dashboard Loaded**: Terminal 2 running `npm run dev` in `dashboard/`. Open `http://localhost:5173` in your browser and log in as Ward Officer (`9820100001` / `Demo@GreenPoint2026`).
4. **Mobile Device Ready**: Terminal 3 running `npx expo start --lan` in `app/`. Expo Go opened on physical phone; logged in as Internal Collector (`9820300001`) or keep account switcher ready.
5. **Screen Setup**: Laptop displaying the Officer Web Dashboard side-by-side or tabbed with citizen/society QR views.

---

## Presentation Runbook

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOTAL TIME: 7 Minutes 30 Seconds                                                       │
│ THEME: Transparent Ward Monitoring, Segregation Accountability & Community Rewards     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Stage 1: The Core Distinction & Philosophy (0:00 – 1:00)
- **Device / Screen**: Laptop — Officer Web Dashboard (`Ward N-WARD Overview`).
- **What to Say**:
  > *"Good morning officials. GreenPoint Mumbai solves segregation compliance by introducing a clean operational boundary:  
  > 1. **Internal Household Participation**: Society collectors inspect resident waste at the flat door to build daily habits and record participation—without invasive municipal penalization or personal points speculation.  
  > 2. **Municipal Society-Level Rewards**: BMC route collectors verify the aggregated bulk handover at the society gate. Societies that hand over segregated waste earn community points to redeem tangible infrastructure and green vouchers.  
  > Let us walk through the complete journey from society registration to voucher fulfilment."*
- **Visible on Screen**: Compact Ward Overview cards showing live societies, active households, and zero fake placeholder metrics.

---

### Stage 2: Society Onboarding & Officer Verification (1:00 – 2:00)
- **Device / Screen**: Laptop — Officer Web Dashboard $\to$ **Societies**.
- **Action**:
  1. Click **Societies** in the navigation menu.
  2. Point to `Sahyadri Residency CHS` marked as `Pending Review`.
  3. Click **Review Application** $\to$ Select **Approve** $\to$ Click **Confirm Approval**.
- **What to Say**:
  > *"New housing societies register through the representative portal. The Ward Officer verifies the society's property tax identity and administrative ward boundaries. Upon approval, the system immediately generates a permanent, cryptographically stable Society QR identity."*
- **Expected Result**: Sahyadri Residency transitions to `APPROVED`. Society QR code is issued immediately.
- **Fallback**: If approval request times out, point to pre-approved `Gokuldham CHS` and show its permanent QR code.

---

### Stage 3: Internal Household Participation (2:00 – 3:30)
- **Device / Screen**: Mobile Phone (Logged in as Internal Collector: `9820300001` / `Raju Shinde`).
- **Action**:
  1. Tap **Scan Household QR** on the collector app.
  2. Point camera at Jethalal Gada's household QR (`GP-HH-GOKUL-101`) displayed on screen or printed card.
  3. Select **Segregated Handover** $\to$ Tap **Submit Inspection**.
  4. Show successful toast: *"Inspection recorded: Segregated"*.
- **What to Say**:
  > *"Here is Raju Shinde, Gokuldham's internal society collector. He scans Flat 101's QR code. Notice the options: Segregated, Mixed, or No Handover. If mixed waste is handed over, the collector must record an explanatory observation note.  
  > Crucially: this records household segregation behavior without creating direct financial penalties or speculative resident crypto-tokens. Observations are aggregated for the society committee."*
- **Expected Result**: Inspection saved. On Officer Dashboard, click **Refresh Data** $\to$ Today's household inspections increments from 0 to 1, showing 100% segregation compliance.
- **Fallback**: If mobile camera has glare, switch to list selection mode $\to$ select Flat 101 $\to$ submit.

---

### Stage 4: BMC Municipal Bulk Pickup & Points Award (3:30 – 5:00)
- **Device / Screen**: Mobile Phone (Logged in as BMC Collector: `9820400001` / `Mahesh Kadam`).
- **Action**:
  1. Open BMC Collector interface $\to$ Select **Scan Society QR**.
  2. Scan Gokuldham Society QR (`GP-SOC-GOKULDHAM`).
  3. Input details: Waste Stream: `Wet Waste`, Weight: `45 kg`, Weight Basis: `MEASURED`, Outcome: `SEGREGATED`.
  4. Tap **Verify & Log Pickup**.
- **What to Say**:
  > *"Now, Mahesh Kadam, the BMC municipal compactor collector, arrives at Gokuldham's collection gate. He scans the society's collection QR.  
  > The compactor scales measure 45 kg of segregated wet waste. He submits the record. Notice: The society immediately earns +10 Society Points on the municipal ledger!  
  > If the collector attempts to log a second wet waste pickup for the same society today, the system logs the operational load but awards zero additional points, preventing quota gaming."*
- **Expected Result**: Success screen: *"+10 Society Points Awarded to Gokuldham CHS"*.
- **Fallback**: If scanner is unavailable, open `testBMCData.js` or submit via route collector point list.

---

### Stage 5: Society Reward Redemption (5:00 – 6:00)
- **Device / Screen**: Mobile Phone or Browser (Logged in as Society Representative: `9820200001` / `Aatmaram Bhide`).
- **Action**:
  1. Open Society Portal home screen.
  2. Observe Society Points Wallet: **10 Points**.
  3. Tap **Redeem Rewards** $\to$ Select `Demo Recognition Certificate` (Cost: 10 points).
  4. Tap **Confirm Redemption**.
- **What to Say**:
  > *"Aatmaram Bhide, Gokuldham's society representative, opens his dashboard. The 10 points earned from this morning's clean handover are in the society wallet.  
  > He redeems a pilot reward: a BMC Recognition Certificate for his society. The server-authoritative catalogue deducts exactly 10 points and issues an official alphanumeric voucher code. This voucher is one-time use and expires in 14 days."*
- **Expected Result**: Society balance updates from 10 to 0. Voucher screen displays `ISSUED` status with unique code.
- **Fallback**: Show existing issued voucher in the representative's voucher history.

---

### Stage 6: Officer Pickup Review & Voucher Fulfilment (6:00 – 7:30)
- **Device / Screen**: Laptop — Officer Web Dashboard.
- **Action**:
  1. Navigate to **BMC Operations**:
     - Point to this morning's 45 kg pickup from Gokuldham marked `Pending Review`.
     - Click **Review** $\to$ Select **Verify** $\to$ Click **Submit Decision**.
     - Point to the banner: *"Review records an operational decision; it does not adjust previously awarded points."*
  2. Navigate to **Society Vouchers**:
     - Locate Gokuldham's voucher under `Awaiting Fulfilment`.
     - Click **Fulfil** $\to$ Enter brief note (e.g., *"Certificate printed and dispatched"*) $\to$ Click **Confirm**.
     - Voucher status changes to `FULFILLED`.
  3. Navigate to **Ward Overview**:
     - Click **Refresh**: Observe that all cards reconcile—1 pickup, 45 kg collected, 10 points earned, 10 points redeemed, 0 awaiting fulfilment, 1 fulfilled.
- **What to Say**:
  > *"The Ward Officer reviews the municipal pickup to record administrative verification. Next, the officer opens the Society Vouchers queue, finds Gokuldham's voucher, and marks it fulfilled. The system prevents double fulfilment and blocks cross-ward officers from touching Ward N vouchers.  
  > As you see on the Ward Overview, every number corresponds to real, persisted data in our demonstration ward. This completes the loop: clean segregation at the household, verified municipal bulk collection, community rewards, and transparent officer governance."*

---

## What to Emphasize vs What to Clarify

| Emphasize To Officials | Clarify Honestly (Prototype Scope) |
| :--- | :--- |
| **Clear Operational Boundaries**: Internal collectors inspect households; BMC collectors verify society gates. | **Demonstration Rewards**: Vouchers are demonstration items; real transport credits or tax rebates require policy MOUs. |
| **No Speculative Crypto**: Society points belong to the society legal entity, not individual citizens. | **No Automatic Reversals**: Officer pickup review records administrative decisions without altering financial ledger retroactively. |
| **Strict Ward Scoping**: Officers and BMC collectors cannot access or modify records of other wards. | **No Machine-Vision AI**: QR codes verify location/identity; human collectors log verified outcomes. |
| **Idempotent Operations**: Network retries and duplicate scans never award duplicate points. | **Demonstration Scale**: Validated for pilot wards; full citywide rollout will follow standard BMC phasing. |
