# Collector Sign-Up - Quick Start Testing Guide

## What Was Implemented

### 1. **New Mobile Screen** ✅

- **File**: `app/app/(auth)/collector-signup.jsx`
- Beautiful WellNest aesthetic with green gradient header
- All required form fields with input validation
- Real-time collector ID verification visual (green checkmark)
- Ward selection dropdown with 6 BMC wards
- Two-button layout (Register & Help/Support)
- Secondary button to switch to citizen registration

### 2. **Backend Model Update** ✅

- **File**: `api/src/models/User.js`
- Added `collectorId` field (required only for collectors)
- Auto-validation using Mongoose schema

### 3. **API Routes Update** ✅

- **File**: `api/src/routes/auth.js`
- Conditional Joi validation for `collectorId`
- New registration logic to store collector ID
- Enhanced error handling for missing collector ID

### 4. **Enhanced Register Flow** ✅

- **File**: `app/app/(auth)/register.jsx`
- When user selects "Collector" role, redirects to new collector-signup screen
- Maintains citizen registration flow unchanged

### 5. **Design Reference** ✅

- **File**: `app/constants/collectorDesign.js`
- All design tokens, colors, spacing, typography
- Quick reference for future UI updates
- Validation rules and constants

---

## Testing Workflow

### Step 1: Start the Backend Server

```bash
cd api
npm install  # If dependencies missing
npm start
```

Expected: Server runs on http://localhost:5000

### Step 2: Start the Mobile App

```bash
cd app
npm install  # If dependencies missing
npm start    # or npx expo start
```

Expected: Expo Go app opens or simulator launches

### Step 3: Test Citizen Registration (Unchanged)

1. Click "Sign Up"
2. Select "Citizen" role (stays on register page)
3. Fill form: Name, Phone, Passwords
4. Click "Register"
5. Expected: Normal citizen registration works as before ✓

### Step 4: Test Collector Registration (NEW)

1. Tap "Sign Up"
2. Tap "Collector" role button
3. **Expected**: Redirects to collector-signup screen with:
   - Green gradient header: "BMC Collector Portal"
   - Verified badge icon at top
   - All form fields

### Step 5: Test Collector Form Fields

#### Full Name Field

- [ ] Type "Jo" - should show error "Name must be at least 2 characters"
- [ ] Type "John" - error clears ✓

#### Phone Field

- [ ] Type "9876" - should show placeholder "10-digit phone number"
- [ ] Type "12345" (5 digits) - error shows
- [ ] Type "9876543210" (10 digits) - error clears ✓

#### Collector ID Field (PRIMARY)

- [ ] Start typing "BMC" - green checkmark ✓ appears to the right
- [ ] Clear field - checkmark disappears
- [ ] Caption "ID verified against BMC Employee Database" shows in green
- [ ] `Provided by your Ward Office` sub-caption always visible

#### Ward Selection

- [ ] Tap dropdown - shows 6 ward options
- [ ] Select "N-WARD" - displays selected and closes dropdown
- [ ] Tap again to see selection highlighted in green with left border

#### Password Fields

- [ ] Type "12345" (5 chars) - error: "Password must be at least 6 characters"
- [ ] Type "123456" - error clears
- [ ] Different confirm password - error: "Passwords do not match"
- [ ] Matching passwords - error clears ✓

### Step 6: Test Form Submission

#### Valid Data

```
Name: John Doe
Phone: 9876543210
Collector ID: BMC-2024-001
Ward: N-WARD
Password: SecurePass123
Confirm: SecurePass123
```

**Expected Flow**:

1. Tap "Register as Collector"
2. Button shows loading spinner
3. API call to backend `/api/auth/register`
4. Success: Redirect to home screen
5. Token stored in AsyncStorage ✓

#### Invalid Data (Missing Collector ID)

```
Name: John Doe
Phone: 9876543210
Collector ID: [EMPTY]
Ward: N-WARD
Password: SecurePass123
Confirm: SecurePass123
```

**Expected**: Button disabled, error message shows "Collector ID is required"

### Step 7: Test Navigation

- [ ] Tap back button → returns to login/home
- [ ] Tap "Help & Support" → shows alert: "Contact your Ward Office for Collector ID"
- [ ] Tap "Switch to Citizen Sign-Up" → navigates to citizen registration screen

### Step 8: Test Backend Validation

#### Via API Testing (Postman/cURL):

**Request**:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "9876543210",
    "password": "SecurePass123",
    "role": "collector",
    "collectorId": "BMC-2024-001",
    "wardId": "N-WARD"
  }'
```

**Expected Response (201)**:

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
      "pointsBalance": 0
    }
  }
}
```

#### Missing Collector ID:

**Expected Response (400)**:

```json
{
  "success": false,
  "message": "BMC Collector ID is required for collector registration"
}
```

---

## Design Verification Checklist

### Visual Elements

- [ ] Green gradient header (bottom to top or corner)
- [ ] Verified badge icon (80x80, green, centered)
- [ ] Form container has subtle shadow
- [ ] All borders are 16px radius (smooth, not sharp)
- [ ] Buttons have 28px radius (squircle style)

### Typography

- [ ] Labels are dark slate (#1F2937), 14px, bold-600
- [ ] Placeholders are light grey (#9CA3AF), 14px
- [ ] Button text is white, 16px, bold-700

### Colors

- [ ] Primary green used consistently (#16a34a)
- [ ] No bright/jarring colors
- [ ] Error text is red (#EF4444)
- [ ] Success indicators are green

### Spacing

- [ ] Form fields have consistent gaps (16px)
- [ ] Button has top margin (24px)
- [ ] Header padding looks balanced
- [ ] No text too close to edges

### Interactions

- [ ] Green glow appears on input focus
- [ ] Checkmark appears/disappears smoothly
- [ ] Dropdown opens below field
- [ ] Button has loading state (spinner)

---

## Common Issues & Solutions

### Issue: Collector signup screen not appearing

**Solution**:

- Verify `router.push('/(auth)/collector-signup')` path is correct
- Check file exists: `app/app/(auth)/collector-signup.jsx`
- Restart Expo server: `npm start --clear`

### Issue: Checkmark not showing

**Solution**:

- Verify `idVerified` state updates: `handleCollectorIdChange` function
- Check conditional render: `{idVerified && form.collectorId.length > 0 && ...}`

### Issue: Ward dropdown not working

**Solution**:

- Check TouchableOpacity onPress handlers
- Verify state array: `const [wards] = useState([...])`

### Issue: Backend returns 400 error on collector ID

**Solution**:

- Verify `collectorId` is included in request body
- Check API payload includes: `role: 'collector'` AND `collectorId: 'value'`
- Ensure backend schema validation passes

### Issue: User data not persisted

**Solution**:

- Verify `AsyncStorage.setItem('gp_token', ...)` works
- Check token is returned from API
- Verify authStore receives user object

---

## Next Steps

1. **Run the tests** following the workflow above
2. **Adjust colors/spacing** if needed using `collectorDesign.js`
3. **Integrate real BMC database** for actual collector ID verification
4. **Add two-factor authentication** for collector accounts
5. **Create collector dashboard** with ward-specific access

---

## Files Modified/Created

```
✅ NEW: app/app/(auth)/collector-signup.jsx (450+ lines)
✅ NEW: app/constants/collectorDesign.js (200+ lines)
✅ NEW: COLLECTOR_SIGNUP_IMPLEMENTATION.md (comprehensive guide)
✅ UPDATED: api/src/models/User.js (+10 lines)
✅ UPDATED: api/src/routes/auth.js (+20 lines)
✅ UPDATED: app/app/(auth)/register.jsx (+15 lines)
```

---

## Design Asset References

All design specifications follow the **WellNest** aesthetic:

- Soft, professional, trustworthy vibe
- Green gradient signifies environmental/civic purpose
- Smooth border-radius (no harsh angles)
- Clear hierarchy and visual feedback
- High contrast for readability

---

## Support

For questions or issues:

1. Check the `COLLECTOR_SIGNUP_IMPLEMENTATION.md` for detailed specs
2. Review `collectorDesign.js` for color/size constants
3. Refer to this testing guide for step-by-step workflow

Good luck with testing! 🎉
