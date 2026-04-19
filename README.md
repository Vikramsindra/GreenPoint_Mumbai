# GreenPoint Mumbai

A civic waste management platform for BMC citizens.

## Three parts:
- Mobile App (React Native + Expo) — citizen-facing
- Backend API (Node.js + Express + MongoDB) — REST API  
- Web Dashboard (React + Vite) — BMC officer panel

## Quick Start

### 1. Backend API
```bash
cd api
npm install
cp .env.example .env
# Edit .env: add your MONGO_URI from MongoDB Atlas and a JWT_SECRET
npm run seed    # creates test data
npm run dev     # runs on http://localhost:5000
```

### 2. Mobile App
```bash
cd app
npm install
# Edit services/api.js: replace 192.168.1.100 with your machine's local IP
npx expo start
# Scan QR with Expo Go app on your phone
```

### 3. Dashboard
```bash
cd dashboard
npm install
npm run dev     # opens on http://localhost:5173
```

## Test Accounts (from seed)

| Role      | Phone       | Password    |
|-----------|-------------|-------------|
| Officer   | 9876543210  | password123 |
| Collector | 9876543211  | password123 |
| Citizen   | 9876543220  | password123 |

## Key Features
- QR scan → earn GreenPoints for waste segregation
- Tiered penalty system with citizen appeals
- Waste composition guide (6 categories)
- Campaign quizzes with bonus points
- BMC officer dashboard with compliance charts
- Violation management with appeal review

# GreenPoint Mumbai: Civic Waste Management & Rewards Platform

Welcome to **GreenPoint Mumbai**, a state-of-the-art civic technology platform designed to transform urban waste management through gamification, real-time verification, and citizen incentives. Built for the Brihanmumbai Municipal Corporation (BMC), GreenPoint encourages source segregation of waste by rewarding citizens with redeemable points.

---

## 1. Project Overview

### Purpose & Goals
Mumbai generates over 7,000 metric tonnes of solid waste daily. Source segregation is the most critical yet under-implemented step in waste management. **GreenPoint Mumbai** provides a digital bridge between citizens and waste collectors, ensuring that proper segregation is verified at the doorstep and rewarded instantly.

### Key Features
- **Doorstep QR Verification:** Every household is assigned a unique, trackable QR code.
- **Collector-Verified Segregation:** Waste collectors use the mobile app to verify waste quality before awarding points.
- **Points & Rewards Engine:** Earn GreenPoints for segregation, composting, and recycling drop-offs.
- **Gamification:** Citizen leaderboards, achievement badges, and tier-based status (Seedling to Mumbai Legend).
- **Anti-Fraud Engine:** GPS boundary checks and Ward-matching algorithms ensure scans are physically performed at the correct location.
- **Admin Dashboard:** Real-time analytics for BMC officers to monitor ward-wise performance and collector efficiency.

---

## 2. Folder Structure

The GreenPoint Mumbai ecosystem is a multi-repo monorepo structure:

```text
greenpoint-mumbai/
├── api/                    # Express.js Backend API
│   ├── src/
│   │   ├── config/         # Database and middleware configs
│   │   ├── middleware/     # Auth (JWT), Role-based access, and Validation
│   │   ├── models/         # Mongoose schemas (User, PointEvent, Household, Violation)
│   │   ├── routes/         # API endpoints (Auth, Points, Awareness, Households)
│   │   ├── services/       # Business logic (Points Engine, QR generation)
│   │   ├── utils/          # Anti-fraud logic (GPS/Ward checks)
│   │   └── seed.js         # Comprehensive DB initialization script
├── app/                    # Expo (React Native) Mobile Application
│   ├── app/
│   │   ├── (tabs)/         # Citizen navigation (Home, QR, History)
│   │   ├── (collector)/    # Collector navigation (Round, Scan, History)
│   │   ├── profile.jsx     # Citizen profile with Badges and Tiers
│   │   └── leaderboard.jsx # Real-time citizen rankings
│   ├── components/         # Mobile-optimized UI components
│   ├── services/           # Axios API service layer
│   └── store/              # State management (Auth, Points)
├── dashboard/              # Vite (React) Web Dashboard
│   ├── src/
│   │   ├── components/     # Layouts, Sidebar, and UI Widgets
│   │   ├── pages/          # Officer views (Ward Overview, Households, Audits)
│   │   └── services/       # API abstraction
└── DOCUMENTATION.md        # This file
```

---

## 3. Installation & Setup

### Prerequisites
- **Node.js**: v18.x or higher
- **MongoDB**: v6.x or higher
- **Expo Go**: Installed on a mobile device for app testing

### Local Environment Setup

1. **Clone and Install:**
   ```bash
   git clone https://github.com/your-org/greenpoint-mumbai.git
   cd greenpoint-mumbai
   
   # Install dependencies for all components
   cd api && npm install
   cd ../app && npm install
   cd ../dashboard && npm install
   ```

2. **Environment Configuration:**
   Create `.env` files in `api/` and `app/`:
   
   **api/.env**:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/greenpoint
   JWT_SECRET=your_secret_key
   ```

3. **Seed the Database:**
   ```bash
   cd api
   npm run seed
   ```

4. **Run the Services:**
   ```bash
   # Backend (from /api)
   npm run dev
   
   # Mobile App (from /app)
   npx expo start
   
   # Dashboard (from /dashboard)
   npm run dev
   ```

---

## 4. Usage Guide

### Roles & Access
- **Citizen:** Scans QR to show to collector, earns points, views leaderboard.
- **Collector:** Scans household QR, verifies waste, takes photo, submits scan.
- **Officer/Admin:** Views the dashboard to manage households and audit collectors.

### Core Workflows
1. **Waste Collection:** Collector opens "Scan" -> Scans Household QR -> Selects "Segregated" -> Inputs Weight -> Takes Photo -> Submits.
2. **Earning Points:** Once submitted, the Citizen instantly receives 10 GreenPoints.
3. **Redemption:** Citizens go to the "Rewards" tab to exchange points for BEST Bus credits or utility discounts.

---

## 5. Architecture & Models

### System Architecture
The platform follows a **Hub-and-Spoke** architecture. The **Express API** acts as the central hub, managing state across the **Citizen App**, **Collector App**, and **Admin Dashboard**.

### Anti-Fraud Logic
Every scan passes through the `antifraud.js` engine:
- **GPS Check:** Validates if the collector is within the allowed Ward boundary.
- **Ward Match:** Ensures the collector is assigned to the same ward as the household.
- **Cooldown:** Prevents multiple scans of the same household within a 24-hour window.

### Key Schemas
- **User:** Role-based (Citizen, Collector, Officer).
- **PointEvent:** Records every transaction (Earn, Deduct, Redeem).
- **Household:** Links a citizen to a physical location and QR code.
- **Violation:** Created when a collector logs "Non-Segregated" waste.

---

## 6. Contributing

1. **Feature Branches:** Use `feat/feature-name` or `fix/bug-name`.
2. **PR Process:** All code must be linted and tested against the seed data.
3. **Styling:** Follow the Skyblue/Green premium design system established in `constants/theme.js`.

---

## 7. Testing

### Backend
Run the seeding script to test population:
```bash
cd api
npm run seed
```

### Mobile
Use the **"Use Test QR"** button in the Collector scanner to simulate a successful scan without a physical QR code.

---

## 8. Deployment

- **Backend:** Scalable Node.js environment (PM2/Docker).
- **Frontend App:** Published via Expo Application Services (EAS).
- **Dashboard:** Deployed as a static site (Vercel/Netlify).

---

## 9. License & Credits

### License
Proprietary - Developed for BMC Mumbai.

### Acknowledgments
- **UI Design:** Inspired by modern, breathable civic interfaces.
- **Maps:** Utilizing Leaflet for ward-boundary visualizations.
- **Icons:** Ionicons and Material Community Icons.

---
*GreenPoint Mumbai © 2024. Tech for a Cleaner Tomorrow.*

