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
