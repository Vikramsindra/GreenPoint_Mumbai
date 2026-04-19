# Collector Sign-Up Component Architecture

## Component Hierarchy

```
CollectorSignupScreen (main component)
│
├── SafeAreaView
│   ├── Header
│   │   ├── BackButton
│   │   └── Title: "BMC Collector Portal"
│   │
│   └── KeyboardAvoidingView
│       └── ScrollView
│           └── FormContent
│               ├── IllustrationContainer
│               │   ├── BadgeIcon (80x80)
│               │   │   └── Checkmark: "✓"
│               │   └── Label: "Official BMC Collector"
│               │
│               ├── FormContainer (white, 28px radius)
│               │   ├── Field: Full Name
│               │   ├── Field: Phone Number
│               │   ├── Field: BMC Collector ID (PRIMARY)
│               │   │   ├── Label + Info Icon
│               │   │   ├── TextInput + Verify Badge
│               │   │   ├── Verification Caption (green)
│               │   │   └── Info Caption (grey)
│               │   ├── Field: Ward Selection
│               │   │   ├── Dropdown Trigger
│               │   │   └── WardPickerContainer (conditional)
│               │   │       └── WardOptions (6 items)
│               │   ├── Field: Password
│               │   ├── Field: Confirm Password
│               │   └── FormError (conditional)
│               │
│               ├── PrimaryActionButton
│               │   └── "Register as Collector" (with spinner on loading)
│               │
│               ├── HelpLink
│               │   └── "Help & Support" (opens alert)
│               │
│               ├── SecondaryButton
│               │   └── "Switch to Citizen Sign-Up"
│               │
│               └── BottomSpacing
```

## State Management

```javascript
form = {
  name: '',
  phone: '',
  collectorId: '',
  wardId: '',
  password: '',
  confirm: ''
}

errors = {
  name: '',
  phone: '',
  collectorId: '',
  wardId: '',
  password: '',
  confirm: '',
  form: ''
}

idVerified = boolean (true when user typing in collectorId)
showWardPicker = boolean (toggle dropdown)
```

## Props & Context

```
Router (expo-router)
├── router.push() - navigate to routes
└── router.replace() - replace screen

useAuthStore (Zustand)
├── register(data) - async registration API call
└── isLoading - loading state boolean

Constants (theme.js)
├── COLORS - color palette
├── SPACING - spacing values
└── Typography values

New Constants (collectorDesign.js)
├── Color palette
├── Border radius values
├── Typography specifications
└── Validation rules
```

## Key Functions

### `validate()`

Checks all form fields against validation rules:

- name >= 2 chars
- phone exactly 10 digits
- collectorId >= 3 chars
- wardId selected
- password >= 6 chars
- confirm === password

Returns: boolean

### `handleCollectorIdChange(text)`

- Updates form.collectorId with input text
- Shows checkmark if text.length > 0
- Hides checkmark if text is empty

### `handleRegister()`

- Validates all fields
- Calls useAuthStore.register() with form data
- Handles success: navigates to home
- Handles error: shows error message

### `handleRoleChange(role)` (from register.jsx)

- If role === 'collector': navigates to collector-signup
- Otherwise: sets form role

### `handleSwitchToCitizen()`

- Navigates to citizen registration screen

### `handleHelpSupport()`

- Shows native alert with support message

## Data Flow: Registration

```
User Input Form
    ↓
handleRegister() validations
    ↓ (if valid)
register() API call
    ↓
Backend /api/auth/register
    ↓
✓ User created + token returned
    ↓
AsyncStorage.setItem(token)
    ↓
useAuthStore updates user + token
    ↓
router.replace('/(tabs)/home')
    ↓
Logged-in user sees app
```

## Validation Rules Map

```
Name:
  ├─ min length: 2
  └─ error: "Name must be at least 2 characters"

Phone:
  ├─ pattern: /^\d{10}$/
  ├─ exact length: 10
  └─ error: "Phone must be exactly 10 digits"

Collector ID:
  ├─ min length: 3
  ├─ required for role='collector'
  └─ error: "Collector ID must be at least 3 characters"

Ward:
  ├─ required: true
  ├─ options: [N-WARD, S-WARD, E-WARD, W-WARD, C-WARD, H-WARD]
  └─ error: "Ward selection is required"

Password:
  ├─ min length: 6
  └─ error: "Password must be at least 6 characters"

Confirm Password:
  ├─ must equal password
  └─ error: "Passwords do not match"
```

## Styling Architecture

All styles defined in `StyleSheet.create()`:

```
Containers:
  - safeArea (flex container)
  - header (green gradient bg)
  - scroll (ScrollView content)
  - illustrationContainer (centered badge)
  - formContainer (white card, 28px radius)

Fields:
  - field (margin-bottom 16px)
  - labelRow (flexDirection: 'row')
  - label (dark slate text)
  - infoIcon (small grey icon)
  - input (16px radius, subtle border)
  - collectorIdContainer (position: relative)
  - collectorIdInput (padding for badge)
  - verifiedBadge (absolute positioned)
  - wardPickerContainer (dropdown overlay)

Buttons:
  - submitBtn (full-width green, 28px radius)
  - secondaryBtn (transparent, green outline)
  - helpLink (text link style)

States:
  - error variants for inputs
  - focused variants (green glow)
  - active/selected variants

Text:
  - errorText (12px, red #EF4444)
  - verificationCaption (12px, green)
  - infoCaption (12px, grey, italic)
```

## Colors Used

```
Primary: #16a34a (Green)
Light: #86efac (Light Green)
Dark Text: #1F2937 (Dark Slate)
Muted: #6B7280 (Muted Grey)
Light: #9CA3AF (Light Grey)
Error: #EF4444 (Red)
Border: #E5E7EB (Light Border)
Badge BG: #DCFCE7 (Very Light Green)
Field Placeholder: #F9FAFB (Almost White)
Selected: #F0FDF4 (Very Light Green)
```

## Responsive Considerations

- Mobile-first design
- Full-width buttons (with margin)
- ScrollView prevents keyboard overlap
- KeyboardAvoidingView handles input visibility
- Fixed header + scrollable content

## Performance Optimizations

1. **State**: Separate state objects for form, errors, UI state
2. **Re-renders**: Only necessary components re-render on state change
3. **Images**: No heavy images (uses text icons: ✓, ℹ, ▼, ←)
4. **Lists**: Ward picker uses map() for dynamic rendering
5. **AsyncStorage**: Async operations don't block UI

## Accessibility Features

- Label associations with fields
- Error messages linked to inputs
- BackButton for easy navigation
- Proper text contrast ratios
- Keyboard navigation support
- Focus states visible (green glow)

## Integration Points

### With authStore:

```javascript
const { register, isLoading } = useAuthStore();
// Pass form data to register()
// Use isLoading for button state
```

### With router:

```javascript
const router = useRouter();
router.push("/(auth)/collector-signup"); // Navigation
router.replace("/(tabs)/home"); // Success redirect
router.back(); // Go back
```

### With backend API:

```
POST /api/auth/register {
  name, phone, collectorId, wardId, password, role='collector'
}
→ Returns: { token, user }
```

## Testing Points

1. Form validation (5 error scenarios)
2. Checkmark appearance (2 scenarios: appear/disappear)
3. Ward dropdown (open/select/close)
4. API integration (success/error cases)
5. Navigation (3 navigation paths)
6. Loading states (button spinner)
7. Error display (multiple errors)
8. Input focus/blur (green glow)
9. Responsive layout (portrait/landscape)
10. Keyboard handling (no overlap)

---

## Component Lifecycle

```
1. Component Mount
   ├─ Initialize form state (empty)
   ├─ Initialize errors state (empty)
   ├─ Initialize UI states (idVerified=false, showWardPicker=false)
   └─ Set up listeners (keyboard, focus, etc.)

2. User Interaction
   ├─ Input changes → Update form state
   ├─ Validation on change (debounced)
   ├─ Show/hide errors in real-time
   └─ Update UI indicators (checkmark, etc.)

3. Form Submission
   ├─ Validate all fields
   ├─ Disable button (isLoading=true)
   ├─ Show spinner
   ├─ Call register() API
   └─ Handle response (success/error)

4. Navigation
   ├─ Success → Redirect to home
   ├─ Back button → Pop screen
   ├─ Help link → Show alert
   └─ Switch role → Push collector-signup
```

---

This architecture ensures:
✅ Clean component structure
✅ Proper state management
✅ Validation at multiple levels
✅ Good UX with visual feedback
✅ Scalability for future enhancements
