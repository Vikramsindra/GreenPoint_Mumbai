# GreenPoint Mumbai — Demonstration Account & QR Guide

This guide details the demonstration accounts, pre-configured roles, QR identifiers, and safe rehearsal procedures for visiting BMC officials.

---

## 1. Quick PowerShell Setup & Startup Commands

Run each command in its own dedicated Windows PowerShell terminal:

### Terminal 1: Backend API (Listening on all network interfaces `0.0.0.0:5000`)
```powershell
cd C:\Users\dyara\GreenPoint_Mumbai\api
npm run start
```
*Note: Verify that `HOST=0.0.0.0` and `PORT=5000` are configured in `api/.env`. Your computer's Wi-Fi LAN address is `192.168.29.174`.*

### Terminal 2: Officer Web Dashboard (Vite on `http://localhost:5173`)
```powershell
cd C:\Users\dyara\GreenPoint_Mumbai\dashboard
npm run dev
```

### Terminal 3: Mobile App via Expo Go (LAN Mode for Physical Phones)
```powershell
cd C:\Users\dyara\GreenPoint_Mumbai\app
npx expo start --lan --clear
```
*Note: Ensure `app/.env.local` specifies `EXPO_PUBLIC_API_URL=http://192.168.29.174:5000/api`. Your mobile phone must be connected to the same Wi-Fi network.*

---

## 2. Safe Demonstration Data Preparation & Reset

Use these safe scripts to prepare a fresh database state without affecting production or normal test data:

### Prepare Fresh Live-Start Scenario (Default)
Sets Gokuldham CHS to **0 points today** and **0 household inspections today**, allowing you to demonstrate the live flow (+10 points on pickup $\to$ redeem 10-point reward $\to$ officer fulfilment):
```powershell
cd C:\Users\dyara\GreenPoint_Mumbai\api
npm run demo:prepare
```

### Reset Demo Records for Same-Day Rehearsal
Safely purges only synthetic demonstration records and re-seeds clean baseline data without modifying non-demo accounts:
```powershell
cd C:\Users\dyara\GreenPoint_Mumbai\api
npm run demo:reset
```

### Seed Showcase Mode (With Historical Charts & Past Fulfilled Vouchers)
Populates 7-day trend charts and a completed voucher for Shivaji Heights while leaving live demo households clean:
```powershell
cd C:\Users\dyara\GreenPoint_Mumbai\api
npm run demo:showcase
```

---

## 3. Demonstration Accounts & Roles

> **Default Password for All Demo Accounts**: `Demo@GreenPoint2026`  
> *(Can be overridden locally via `DEMO_USER_PASSWORD` environment variable. Never commit custom passwords.)*

| Role | Name | Phone Number | Ward | Purpose in Demo |
| :--- | :--- | :--- | :--- | :--- |
| **Ward Officer (Primary)** | Officer R. K. Shinde | `9820100001` | `N-WARD` | Approves pending society, monitors ward overview, reviews BMC pickup, fulfils reward voucher. |
| **Ward Officer (Secondary)**| Officer S. V. Patil | `9820100002` | `K-WARD` | Proves strict administrative ward boundaries and cross-ward access denial. |
| **Society Representative** | Aatmaram Bhide | `9820200001` | `N-WARD` | Representative of Gokuldham CHS; approves pending citizen membership, monitors balance, redeems reward. |
| **Internal Collector** | Raju Shinde | `9820300001` | `N-WARD` | Internal collector for Gokuldham CHS; inspects member households and records segregation outcomes. |
| **BMC Municipal Collector**| Mahesh Kadam | `9820400001` | `N-WARD` | Municipal bulk collector; scans Gokuldham society QR and logs segregated wet waste pickup (+10 pts). |
| **Citizen (Live Household 1)**| Jethalal Gada | `9820500001` | `N-WARD` | Approved member (Flat 101); displays household QR for live **Segregated** inspection. |
| **Citizen (Live Household 2)**| Taarak Mehta | `9820500002` | `N-WARD` | Approved member (Flat 102); displays household QR for live **Mixed** inspection (requires note). |
| **Citizen (Live Household 3)**| Popatlal Pandey | `9820500003` | `N-WARD` | Approved member (Flat 201); reserved for **No Handover** attempt (0 kg, requires note). |
| **Citizen (Pending Member)** | Sundarlal Topiwala | `9820500004` | `N-WARD` | Citizen with pending membership in Gokuldham CHS (Flat 303); for representative approval demo. |
| **Secondary Society Rep** | Sunil More | `9820200002` | `N-WARD` | Representative of Shivaji Heights CHS; pre-loaded with background chart activity. |
| **Pending Society Rep** | Pooja Deshmukh | `9820200003` | `N-WARD` | Representative of Sahyadri Residency CHS; submitted application awaiting officer approval. |

---

## 4. Demonstration Societies & Reserved Handover Outcomes

| Society Name | Status | Join Code | Society QR Code | Assigned BMC Collector | Starting Balance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Gokuldham Co-op Housing Society** | `APPROVED` | `GOKUL1` | `GP-SOC-GOKULDHAM` | Mahesh Kadam (`BMC-N-COL01`) | **0 pts** *(Live demo society)* |
| **Shivaji Heights CHS** | `APPROVED` | `SHIVA1` | `GP-SOC-SHIVAJI` | Mahesh Kadam (`BMC-N-COL01`) | **20 pts** *(Background & 7-day trend)* |
| **Sahyadri Residency CHS** | `PENDING` | `SAHYA1` | `GP-SOC-SAHYADRI` | Unassigned | **0 pts** *(For Live Officer Approval)* |
| **Palm Beach Residency CHS** | `APPROVED` | `PALMB1` | `GP-SOC-PALMBEACH`| Ward K Collector | **50 pts** *(Cross-Ward Boundary Check)* |

### Reserved Household Handover Outcomes (Gokuldham CHS)

| Flat / Resident | QR Code | Reserved Handover Outcome | Expected Impact |
| :--- | :--- | :--- | :--- |
| **Flat 101 (Jethalal Gada)** | `GP-HH-GOKUL-101` | **SEGREGATED** | Records participation; zero points/fines awarded. Increments Segregated count. |
| **Flat 102 (Taarak Mehta)** | `GP-HH-GOKUL-102` | **MIXED** | Mandatory explanatory note required (e.g. *"Wet & dry mixed in single bag"*); zero points/fines. |
| **Flat 201 (Popatlal Pandey)**| `GP-HH-GOKUL-201` | **NO_HANDOVER** | Mandatory note (e.g. *"Door locked / Resident not available"*); weight must be 0 kg. |
| **Flat 303 (Sundarlal Topiwala)**| None (Pending) | **MEMBERSHIP APPROVAL** | Demonstrates representative reviewing and approving membership request to issue household QR. |

---

## 5. Where to View & Download Demonstration QRs

1. **Household QRs**:
   - Log in as the Citizen on the mobile app $\to$ Tap the **QR Code** card on the home screen.
   - Or as the Society Representative $\to$ Navigate to **Members** $\to$ Tap any approved resident to view their verified QR.
2. **Society QRs**:
   - Log in as Society Representative (`9820200001`) $\to$ Tap **Society QR** on the home screen.
   - Or on the Officer Web Dashboard $\to$ Navigate to **Societies** $\to$ Click **Gokuldham CHS** $\to$ QR badge.
3. **Display & Scan Procedure**:
   - Display the QR on your laptop/monitor screen (dashboard or citizen app).
   - Point the mobile phone camera running the internal or BMC collector scanner at the screen.
   - Automatic barcode detection will read the code instantaneously.
