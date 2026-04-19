# Collector Sign-Up Visual Reference & Field Map

## Screen Layout Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 📱 BMC COLLECTOR PORTAL                              [←]    │ ← Green Gradient Header
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                   ╔═════════════════╗                       │
│                   ║       ✓         ║                       │ ← Verified Badge
│                   ║   (80x80px)     ║                       │    Green circle w/ checkmark
│                   ╚═════════════════╝                       │
│            Official BMC Collector                           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    ┌─ Form Container ─┐                    │ ← White card with shadow
│                    │ (28px radius)    │                    │
│                    │                  │                    │
│   Full Name *                         │                    │
│   ┌────────────────────────────────┐ │                    │ ← 16px radius input
│   │ Enter your full name           │ │                    │    Subtle border
│   └────────────────────────────────┘ │                    │
│                                      │                    │
│   Phone Number *                      │                    │
│   ┌────────────────────────────────┐ │                    │
│   │ 10-digit phone number          │ │                    │
│   └────────────────────────────────┘ │                    │
│                                      │                    │
│   Official BMC Collector ID *   ℹ    │                    │ ← Label with info icon
│   ┌────────────────────────────────┐ │                    │
│   │ Enter your Collector ID    [✓] │ │                    │ ← Checkmark appears here
│   └────────────────────────────────┘ │                    │    when user types
│   ID verified against BMC Database   │                    │ ← Green verification text
│   Provided by your Ward Office       │                    │ ← Grey info caption
│                                      │                    │
│   Ward Selection *                    │                    │
│   ┌────────────────────────────────┐ │                    │ ← Dropdown selector
│   │ Select your Ward         [▼]    │ │                    │
│   │ ├─ N-WARD ← Selectable         │ │                    │ ← Opens on tap
│   │ ├─ S-WARD                      │ │                    │
│   │ ├─ E-WARD                      │ │                    │
│   │ ├─ W-WARD                      │ │                    │
│   │ ├─ C-WARD                      │ │                    │
│   │ └─ H-WARD                      │ │                    │
│   └────────────────────────────────┘ │                    │
│                                      │                    │
│   Password *                          │                    │
│   ┌────────────────────────────────┐ │                    │ ← Masked text input
│   │ •••••••••••••                  │ │                    │
│   └────────────────────────────────┘ │                    │
│   Minimum 6 characters               │                    │
│                                      │                    │
│   Confirm Password *                  │                    │
│   ┌────────────────────────────────┐ │                    │
│   │ •••••••••••••                  │ │                    │
│   └────────────────────────────────┘ │                    │
│                                      │                    │
│   ┌────────────────────────────────┐ │                    │
│   │  Register as Collector         │ │                    │ ← Primary button
│   │  (Full width, green, squircle) │ │                    │    28px radius, shadow
│   └────────────────────────────────┘ │                    │
│                                      │                    │
│   Help & Support                      │                    │ ← Text link style
│   (Underlined, green, centered)      │                    │
│                                      │                    │
│   ┌────────────────────────────────┐ │                    │
│   │ Switch to Citizen Sign-Up      │ │                    │ ← Secondary button
│   │ (Green outline, transparent)   │ │                    │    No fill, 2px border
│   └────────────────────────────────┘ │                    │
│                    └──────────────────┘                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Field Details & Specifications

### 1. Full Name Field

```
Label:        "Full Name"
Placeholder:  "Enter your full name"
Type:         Text
Max Length:   No limit
Validation:   Minimum 2 characters
Error:        "Name must be at least 2 characters"
Focus State:  Green glow shadow (0px 0px 8px rgba(22, 163, 74, 0.2))
Color:        #1F2937 (dark slate)
```

### 2. Phone Number Field

```
Label:        "Phone Number"
Placeholder:  "10-digit phone number"
Type:         Numeric (keyboardType: numeric)
Max Length:   10 characters exactly
Validation:   Must be exactly 10 digits
Error:        "Phone must be exactly 10 digits"
Pattern:      /^\d{10}$/
Color:        #1F2937
```

### 3. BMC Collector ID Field (PRIMARY)

```
Label:        "Official BMC Collector ID"
Icon:         ℹ (Info icon) next to label
Placeholder:  "Enter your Collector ID"
Type:         Text
Max Length:   No limit (but verify in backend)
Validation:   Minimum 3 characters
Error:        "Collector ID must be at least 3 characters"

UNIQUE FEATURES:
├─ Verified Badge Position: Absolute positioned, right: 12px, top: 12px
├─ Badge Size: 24x24px, circular, green background #16a34a
├─ Badge Icon: White checkmark ✓
├─ Badge Visibility: Shows when text.length > 0
├─ Badge Animation: Appears/disappears smoothly
├─ Verification Text: "ID verified against BMC Employee Database"
│  └─ Color: Green #16a34a
│  └─ Font Size: 12px
│  └─ Position: Below field
└─ Info Caption: "Provided by your Ward Office"
   └─ Color: Muted Grey #6B7280
   └─ Font Size: 12px
   └─ Font Style: Italic
   └─ Always visible (not conditional)
```

### 4. Ward Selection Dropdown

```
Label:        "Ward Selection"
Type:         Dropdown (Picker)
Default:      "Select your Ward" (placeholder)
Options:      ["N-WARD", "S-WARD", "E-WARD", "W-WARD", "C-WARD", "H-WARD"]
Validation:   Selection required
Error:        "Ward selection is required"

DROPDOWN STATES:
├─ Closed:
│  └─ Shows selected value or placeholder
│  └─ Dropdown arrow ▼ on right (12px font, grey color)
│  └─ Tap to open
└─ Open:
   ├─ Appears below field
   ├─ 6 options displayed vertically
   ├─ Each option: 48px height, 12px padding
   ├─ Unselected option: #6B7280 text on light background
   ├─ Selected option:
   │  ├─ Green background #F0FDF4 (very light green)
   │  ├─ Green text #16a34a
   │  ├─ Left border: 3px solid green #16a34a
   │  └─ Font weight: 600 (bold)
   └─ Tap option to select and close

Border Style:
├─ Closed: 1px solid #E5E7EB
├─ Selected: 1px solid #E5E7EB
└─ Focused: Green glow shadow
```

### 5. Password Field

```
Label:        "Password"
Placeholder:  "Minimum 6 characters"
Type:         Secure (secureTextEntry: true)
Display:      Masked with dots/asterisks
Max Length:   No limit (app side)
Validation:   Minimum 6 characters
Error:        "Password must be at least 6 characters"
Color:        #1F2937
```

### 6. Confirm Password Field

```
Label:        "Confirm Password"
Placeholder:  "Re-enter your password"
Type:         Secure (secureTextEntry: true)
Display:      Masked with dots/asterisks
Max Length:   No limit
Validation:   Must exactly match Password field
Error:        "Passwords do not match"
Color:        #1F2937
```

---

## Input Field Visual States

### Default State

```
┌────────────────────────────────┐
│ Placeholder text (grey)        │
└────────────────────────────────┘
Background: White
Border: 1px solid #E5E7EB (light grey)
Border Radius: 16px
Padding: 12px 16px
```

### Focus State (On Tap)

```
┌════════════════════════════════┐
│ User input text here           │
└════════════════════════════════┘
Background: White
Border: 1px solid #16a34a (green, thicker visual)
Shadow: 0px 0px 8px rgba(22, 163, 74, 0.2) (soft green glow)
Border Radius: 16px
Padding: 12px 16px
Text Color: #1F2937
```

### Error State

```
┌─╳─────────────────────────────╳┐
│ Invalid input                  │
└─╳─────────────────────────────╳┘
Background: White
Border: 1px solid #EF4444 (red)
Error Message Below: "Error text here"
└─ Font Size: 12px
└─ Color: #EF4444 (red)
└─ Margin Top: 4px
Border Radius: 16px
Padding: 12px 16px
```

### Filled State

```
┌────────────────────────────────┐
│ Valid user input               │
└────────────────────────────────┘
Background: White
Border: 1px solid #E5E7EB
Border Radius: 16px
Padding: 12px 16px
Text Color: #1F2937
```

---

## Button Specifications

### Primary Button: "Register as Collector"

```
Style:       Full-width squircle button
Width:       100% (with margin on sides)
Height:      52px (spacious touch target)
Margin:      0 16px
Padding:     16px (vertical spacing)
Border:      None
Border Radius: 28px (squircle style)
Background:  Green gradient or solid #16a34a
Text:        "Register as Collector"
Text Color:  White (#FFFFFF)
Text Size:   16px
Font Weight: 700 (bold)
Shadow:      0px 8px 12px rgba(22, 163, 74, 0.25) (subtle glow)

States:
├─ Default:     Green background, white text
├─ Pressed:     Opacity ~0.9 (tactile feedback)
├─ Disabled:    Opacity ~0.6 (during loading)
└─ Loading:     Shows spinner (ActivityIndicator) instead of text
   └─ Spinner Color: White
   └─ Size: Large
```

### Secondary Button: "Help & Support"

```
Style:          Text link (NOT a button component)
Alignment:      Centered
Text:           "Help & Support"
Text Color:     Green #16a34a
Text Size:      14px
Font Weight:    600
Decoration:     Underline (textDecorationLine: 'underline')
Margin:         Top: 24px, Bottom: 16px
Action:         Opens native alert
Alert Title:    "Help & Support"
Alert Message:  "Contact your Ward Office for Collector ID"
Alert Button:   "OK"
```

### Tertiary Button: "Switch to Citizen Sign-Up"

```
Style:           Full-width outlined button
Width:           100% (with margin on sides)
Height:          48px
Margin:          0 16px
Border:          2px solid #16a34a (green outline)
Border Radius:   28px (squircle style)
Background:      Transparent (no fill)
Text:            "Switch to Citizen Sign-Up"
Text Color:      Green #16a34a
Text Size:       14px
Font Weight:     600

States:
├─ Default:      Transparent background, 2px green border, green text
├─ Pressed:      Slight background tint (opacity)
└─ Navigation:   Routes back to citizen registration
```

---

## Color Reference

### Dark Mode (Default - USED IN THIS DESIGN)

```
Primary Actions:      #16a34a (Green)
Light Accents:        #86efac (Light Green)
Text (Labels):        #1F2937 (Dark Slate)
Text (Disabled):      #6B7280 (Muted Grey)
Text (Placeholder):   #9CA3AF (Light Grey)
Errors:               #EF4444 (Red)
Borders:              #E5E7EB (Light Grey)
Background:           #FAFAFA (Off-white)
Badge Background:     #DCFCE7 (Very Light Green)
Selected Highlight:   #F0FDF4 (Very Light Green)
```

---

## Spacing & Sizing

### Container Margins

```
Horizontal Margin (Form Container):  16px (SPACING.lg)
Vertical Margin (Between Elements):  16px (SPACING.lg)
Form Padding:                        24px (SPACING.xxl)
Header Padding:                      16px (SPACING.lg)
```

### Field Heights

```
Input Fields:                  48px (12px padding top/bottom)
Dropdown:                      48px
Button (Primary):              52px
Button (Secondary):            48px
Badge Icon:                    80x80px
Verification Badge:            24x24px
```

### Text Sizes

```
Header Title:     24px
Label:            14px
Input Text:       14px
Button Text:      16px
Error/Caption:    12px
Info Icon:        12px
```

---

## Focus & Interaction Flow

```
1. User opens collector-signup screen
   ├─ Sees header, badge, form fields
   └─ All fields empty with placeholders

2. User taps "Full Name" field
   ├─ Field gets focus
   ├─ Green glow shadow appears
   └─ Keyboard opens

3. User types name (minimum 2 chars)
   ├─ Text appears in field
   └─ No error shown if valid

4. User taps "Phone Number" field
   ├─ Phone field gets focus
   ├─ Name field loses focus (keyboard may dismiss)
   └─ Numeric keyboard opens

5. User taps "Collector ID" field
   ├─ Gets focus with green glow
   └─ Unique badge container ready

6. User types collector ID (e.g., "BMC-001")
   ├─ As user types first character: Green checkmark ✓ appears
   ├─ Checkmark positioned absolutely (right: 12px, top: 12px)
   ├─ "ID verified against BMC Database" caption appears (green)
   ├─ "Provided by your Ward Office" always visible (grey, italic)
   └─ If user clears field: Checkmark disappears

7. User taps Ward Selection dropdown
   ├─ Dropdown opens below field
   ├─ 6 options displayed vertically
   └─ User taps option (e.g., "N-WARD")
       ├─ Option highlights green
       ├─ Dropdown closes
       └─ Selected value shows in field

8. User fills Password fields
   ├─ Text masked with dots/asterisks
   ├─ Confirm password must match
   ├─ If mismatch: Error "Passwords do not match"
   └─ If match: No error

9. All fields valid
   ├─ "Register as Collector" button active/enabled
   └─ User taps button

10. Registration process
    ├─ Button shows spinner
    ├─ Form disabled during submission
    ├─ API called with form data
    ├─ On success: Token stored, redirect to home
    ├─ On error: Error message shown in red
    └─ User can correct and re-submit

11. Alternative paths
    ├─ Tap "Help & Support": Alert shows contact info
    └─ Tap "Switch to Citizen Sign-Up": Navigate to citizen register
```

---

## Responsive Behavior

```
Portrait Mode (Default):
├─ Full-width layouts
├─ Vertical scrolling (ScrollView)
├─ Touch-friendly spacing
└─ All elements stacked vertically

Landscape Mode:
├─ Form still scrollable vertically
├─ Bottom buttons may need scroll
└─ Keyboard may reduce visible area
    (KeyboardAvoidingView handles this)

Small Screens (<480px):
├─ Margins reduce slightly
├─ Text sizes maintained (readable)
└─ Touch targets remain ≥48px

Large Screens (>768px):
├─ Form may have max-width
├─ Horizontal margin increases
└─ Same touch target sizes (≥48px)
```

---

## Accessibility Features

```
✅ Label-field associations
✅ Error messages linked to fields
✅ High contrast text (#1F2937 on white)
✅ Focus indicators (green glow)
✅ Touch targets ≥48px minimum
✅ Descriptive button text
✅ Keyboard navigation support
✅ Secure input for passwords
✅ Dropdown options clearly labeled
✅ Info icon with context
```

---

This visual reference provides developers with exact specifications for implementing the collector sign-up screen matching the WellNest aesthetic perfectly.
