# GreenPoint Mumbai - Collector Sign-Up Implementation Guide

## Overview

This document describes the implementation of the "Collector Sign-Up" screen for BMC employees in the GreenPoint Mumbai platform, featuring the WellNest design aesthetic.

---

## Visual Design Specifications

### Color Palette (WellNest)

- **Primary Green Gradient**: `#16a34a` to `#86efac`
- **Dark Text**: `#1F2937` (Dark Slate)
- **Muted Grey**: `#6B7280`
- **Light Grey**: `#9CA3AF` (Placeholder text)
- **Border Color**: `#E5E7EB`
- **Error Red**: `#EF4444`
- **Success Green**: `#16a34a`

### Border Radius

- **Main Container**: 28px (Squircle style)
- **Input Fields**: 16px
- **Badge/Icon**: 10-12px

### Typography

- **Labels**: 14px, Weight 600, Color: `#1F2937`
- **Input Text**: 14px, Weight 500, Color: `#1F2937`
- **Placeholder**: 14px, Color: `#9CA3AF`
- **Header Title**: 24px, Weight Bold, Color: White
- **Button Text**: 16px, Weight 700

### Focus States & Interactive Elements

- **Input Focus**: Soft green shadow `0px 0px 8px rgba(22, 163, 74, 0.2)`
- **Button Shadow**: Emerald glow `0px 8px 12px rgba(22, 163, 74, 0.25)`
- **Verification Checkmark**: Green badge (#16a34a) 24x24px

---

## Components & Features

### 1. Header Section

- Soft green gradient background (#16a34a to #86efac)
- Back navigation button
- Title: "BMC Collector Portal"
- Safe area top padding

### 2. Illustration/Badge

- Centered verified badge icon (✓)
- Container: 80x80px with subtle border
- Background: Light green (#DCFCE7)
- Border: 2px solid green (#16a34a)
- Label: "Official BMC Collector"

### 3. Form Container

- White background with 28px border-radius
- Subtle shadow (elevation: 4)
- Padding: 24px
- Max width optimization for mobile

### 4. Form Fields

#### A. Full Name

- Label: "Full Name"
- Placeholder: "Enter your full name"
- Validation: Minimum 2 characters
- Error message display

#### B. Phone Number

- Label: "Phone Number"
- Placeholder: "10-digit phone number"
- Keyboard: Numeric
- Max length: 10
- Validation: Exactly 10 digits

#### C. BMC Collector ID (PRIMARY FIELD)

- Label: "Official BMC Collector ID"
- Info icon (ℹ) with tooltip context
- White background with 16px border-radius
- **Verification Features**:
  - Green checkmark (✓) badge appears when user starts typing
  - Position: Right-aligned inside input (12px from edge)
  - Caption below: "ID verified against BMC Employee Database" (green text, 12px)
  - Info caption: "Provided by your Ward Office" (muted grey, italic)
- Validation: Minimum 3 characters

#### D. Ward Selection

- Label: "Ward Selection"
- Dropdown selector style
- Options: N-WARD, S-WARD, E-WARD, W-WARD, C-WARD, H-WARD
- Default: "Select your Ward"
- Selected state: Highlighted with green background and left border
- Validation: Required field

#### E. Password

- Label: "Password"
- Placeholder: "Minimum 6 characters"
- Input type: Secure/masked
- Validation: Minimum 6 characters

#### F. Confirm Password

- Label: "Confirm Password"
- Placeholder: "Re-enter your password"
- Input type: Secure/masked
- Validation: Must match password field

### 5. Action Buttons

#### Primary: Register as Collector

- Full-width green button
- Squircle style (28px border-radius)
- Color: #16a34a
- Text: "Register as Collector" (white, 16px, bold)
- Shadow: Subtle white glow on text
- Disabled state during loading: Shows spinner
- Touch feedback: Opacity change

#### Secondary: Help & Support

- Link style (centered, underlined)
- Color: #16a34a
- Functionality: Opens support contact info
- Text: "Help & Support"
- Guidance: "for collectors who haven't received their ID yet"

#### Tertiary: Switch to Citizen Sign-Up

- Full-width transparent button
- Border: 2px solid #16a34a
- Text color: #16a34a
- No background fill
- 28px border-radius (matches primary button)
- Functionality: Navigate back to citizen registration

### 6. Input Field States

#### Default State

- Background: White
- Border: 1px solid #E5E7EB
- Text color: #1F2937
- Placeholder: #9CA3AF

#### Focus State

- Border: 1px solid #16a34a
- Shadow: `0px 0px 8px rgba(22, 163, 74, 0.2)`
- Text color: #1F2937

#### Error State

- Border: 1px solid #EF4444
- Error message: "#EF4444", 12px, below field
- Icon: None (text-based error)

#### Filled State

- Background: White
- Border: 1px solid #E5E7EB
- Text color: #1F2937

---

## File Structure

```
app/
├── app/
│   └── (auth)/
│       ├── collector-signup.jsx  [NEW] Collector sign-up screen
│       ├── register.jsx          [UPDATED] Routes to collector-signup for collector role
│       ├── login.jsx
│       └── _layout.jsx
└── store/
    └── authStore.js             [NO CHANGES NEEDED] Already supports collector registration

api/
├── src/
│   ├── models/
│   │   └── User.js              [UPDATED] Added collectorId field
│   └── routes/
│       └── auth.js              [UPDATED] Added collectorId validation & handling
```

---

## Backend Implementation Details

### 1. User Model Update

**File**: `api/src/models/User.js`

Added field:

```javascript
collectorId: {
  type: String,
  required: function() { return this.role === 'collector'; },
  trim: true,
  default: null,
  sparse: true
}
```

**Behavior**:

- Required only when `role === 'collector'`
- Automatically validated by Mongoose
- Sparse index allows multiple null values

### 2. Auth Routes Update

**File**: `api/src/routes/auth.js`

**Schema Validation**:

- Added conditional validation for `collectorId`
- Required when role is 'collector'
- Minimum 3 characters
- Allows empty string for non-collector roles

**Register Endpoint**:

- Extracts `collectorId` from request body
- Validates presence for collector role
- Stores `collectorId` in user document
- Returns complete user object with `collectorId`

**Validation Flow**:

1. Joi schema validates role
2. Conditional validation checks `collectorId` if role is 'collector'
3. Backend validates field presence before saving
4. Error response if validation fails

---

## User Flow

### Registration Flow: Collector

1. User opens app and selects "Sign Up"
2. In `register` screen, user selects "Collector" role
3. Automatically redirected to `collector-signup` screen
4. Fills form fields (name, phone, collector ID, ward, password)
5. Sees green verification checkmark as they type collector ID
6. Taps "Register as Collector" button
7. Backend validates and creates collector account
8. Redirected to main app with token stored
9. User is now authenticated as collector

### Alternative: Return to Citizen Registration

- User can tap "Switch to Citizen Sign-Up" button
- Navigates back to standard citizen registration
- No data loss (separate flow)

### Help Support

- User without collector ID can tap "Help & Support"
- Alert shown: "Contact your Ward Office for Collector ID"

---

## API Endpoints

### POST `/api/auth/register`

**Request Body**:

```json
{
  "name": "John Doe",
  "phone": "9876543210",
  "password": "SecurePass123",
  "role": "collector",
  "collectorId": "BMC-2024-001",
  "wardId": "N-WARD"
}
```

**Validation Rules**:

- `name`: String, min 2 chars, required
- `phone`: 10-digit numeric string, required
- `password`: String, min 6 chars, required
- `role`: Enum ['citizen', 'collector', 'officer'], default 'citizen'
- `collectorId`: Required if role is 'collector', min 3 chars
- `wardId`: String, default 'N-WARD'

**Success Response (201)**:

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "_id": "...",
      "name": "John Doe",
      "phone": "9876543210",
      "role": "collector",
      "collectorId": "BMC-2024-001",
      "wardId": "N-WARD",
      "pointsBalance": 0,
      "isActive": true
    }
  }
}
```

**Error Response (400/409/500)**:

```json
{
  "success": false,
  "message": "BMC Collector ID is required for collector registration"
}
```

---

## Testing Checklist

### Form Validation

- [ ] Name field rejects < 2 chars
- [ ] Phone field enforces 10 digits
- [ ] Collector ID field accepts >= 3 chars
- [ ] Ward selection is required
- [ ] Password must be >= 6 chars
- [ ] Confirm password must match password field
- [ ] All error messages display correctly

### Verification Visual

- [ ] Green checkmark appears when collector ID input has text
- [ ] Checkmark disappears when collector ID is cleared
- [ ] "ID verified against BMC Employee Database" caption shows when verified
- [ ] Info caption "Provided by your Ward Office" always visible

### Navigation

- [ ] Clicking "Collector" in register screen navigates to collector-signup
- [ ] Back button works and returns to previous screen
- [ ] "Switch to Citizen Sign-Up" button navigates to citizen register
- [ ] "Help & Support" link shows alert dialog

### Backend

- [ ] Collector registration with valid ID succeeds
- [ ] Collector registration without ID fails with 400 error
- [ ] Citizen registration works without collector ID
- [ ] Token returned contains user with collectorId field
- [ ] Collector ID persisted correctly in database

### UI/UX

- [ ] Green gradient header displays correctly
- [ ] Form container shadow appears subtle
- [ ] Input focus shows green glow shadow
- [ ] Button has white shadow/glow effect
- [ ] Responsive on different screen sizes

---

## Future Enhancements

1. **Backend ID Verification**:
   - Replace "accept any ID" with actual BMC database lookup
   - Async validation against official employee database
   - Real-time verification with visual feedback

2. **Ward Office Integration**:
   - Link to Ward Office contact/FAQ
   - QR code for ID generation
   - SMS/Email verification step

3. **Role-Based Permissions**:
   - Map collector ID to specific ward
   - Restricted access to ward data
   - Approval workflow for new collectors

4. **Security Enhancements**:
   - Implement rate limiting on registration
   - Add CAPTCHA for bot prevention
   - Implement 2FA for collectors

5. **Analytics**:
   - Track collector registration success rate
   - Monitor invalid ID attempts
   - Ward-wise registration metrics

---

## Technical Stack

- **Frontend**: React Native (Expo) with Zustand store
- **Backend**: Node.js, Express, Mongoose
- **Validation**: Joi schema validation
- **Auth**: JWT tokens, bcrypt password hashing
- **Database**: MongoDB (User collection)

---

## Notes

- The collector ID verification currently shows a checkmark for any input (prototype)
- Future: Integrate with actual BMC employee database
- The WellNest design aesthetic emphasizes trust and professionalism
- All colors and dimensions follow the specified design guidelines
- Responsive design adapts to different mobile screen sizes
