// COLLECTOR SIGNUP DESIGN REFERENCE CARD
// Quick reference for the WellNest aesthetic

export const COLLECTOR_DESIGN = {
    // Color Variables
    colors: {
        gradient: {
            start: '#16a34a', // Primary Green
            end: '#86efac',   // Light Green
        },
        primary: '#16a34a',
        lightGreen: '#86efac',
        darkSlate: '#1F2937',
        mutedGrey: '#6B7280',
        lightGrey: '#9CA3AF',
        border: '#E5E7EB',
        error: '#EF4444',
        success: '#16a34a',
        badgeBg: '#DCFCE7',
        fieldBg: '#FAFAFA',
        selectedBg: '#F0FDF4',
    },

    // Border Radius (Squircle style)
    borderRadius: {
        container: 28,    // Main form container
        input: 16,        // Input fields
        button: 28,       // Buttons (squircle)
        badge: 40,        // Circular badges (half of 80)
        icon: 10,         // Small icons
    },

    // Spacing (in px)
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 32,
    },

    // Typography
    typography: {
        header: {
            fontSize: 24,
            fontWeight: 'bold',
            color: 'white',
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            color: '#1F2937',
        },
        input: {
            fontSize: 14,
            fontWeight: '500',
            color: '#1F2937',
        },
        placeholder: {
            fontSize: 14,
            color: '#9CA3AF',
        },
        button: {
            fontSize: 16,
            fontWeight: '700',
            color: 'white',
        },
        caption: {
            fontSize: 12,
            color: '#6B7280',
        },
        error: {
            fontSize: 12,
            color: '#EF4444',
        },
    },

    // Shadows & Effects
    shadows: {
        input: {
            focusShadow: '0px 0px 8px rgba(22, 163, 74, 0.2)',
        },
        button: {
            primary: '0px 8px 12px rgba(22, 163, 74, 0.25)',
        },
        container: {
            default: '0px 2px 12px rgba(0, 0, 0, 0.08)',
        },
    },

    // Component Sizes
    sizes: {
        badge: {
            width: 80,
            height: 80,
        },
        checkmark: {
            width: 24,
            height: 24,
        },
        infoIcon: {
            width: 20,
            height: 20,
        },
        inputHeight: 48, // padding + icon space
    },

    // State Styles
    states: {
        input: {
            default: {
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                color: '#1F2937',
            },
            focused: {
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#16a34a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            error: {
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#EF4444',
            },
            filled: {
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#E5E7EB',
            },
        },
        button: {
            primary: {
                backgroundColor: '#16a34a',
                borderRadius: 28,
            },
            secondary: {
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: '#16a34a',
                borderRadius: 28,
            },
        },
    },

    // Animation Values
    animations: {
        duration: 200, // ms
        easing: 'ease-in-out',
    },

    // Responsive Breakpoints
    responsive: {
        mobile: 480,
        tablet: 768,
        desktop: 1024,
    },
};

// ICONS & SYMBOLS
export const ICONS = {
    verified: '✓',      // Checkmark for verification
    badge: '✓',         // Badge checkmark
    info: 'ℹ',          // Info icon
    dropdown: '▼',      // Dropdown arrow
    back: '←',          // Back arrow
};

// PLACEHOLDER TEXTS
export const PLACEHOLDERS = {
    name: 'Enter your full name',
    phone: '10-digit phone number',
    collectorId: 'Enter your Collector ID',
    password: 'Minimum 6 characters',
    confirmPassword: 'Re-enter your password',
    ward: 'Select your Ward',
};

// LABELS & CAPTIONS
export const LABELS = {
    fullName: 'Full Name',
    phone: 'Phone Number',
    collectorId: 'Official BMC Collector ID',
    ward: 'Ward Selection',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    infoBmc: 'Provided by your Ward Office',
    infoBadge: 'ID verified against BMC Employee Database',
    headerTitle: 'BMC Collector Portal',
    registerBtn: 'Register as Collector',
    helpSupport: 'Help & Support',
    switchCitizen: 'Switch to Citizen Sign-Up',
};

// ERROR MESSAGES
export const ERRORS = {
    nameMinLength: 'Name must be at least 2 characters',
    phoneInvalid: 'Phone must be exactly 10 digits',
    collectorIdMinLength: 'Collector ID must be at least 3 characters',
    passwordMinLength: 'Password must be at least 6 characters',
    passwordMismatch: 'Passwords do not match',
    wardRequired: 'Ward selection is required',
    collectorIdRequired: 'BMC Collector ID is required for collector registration',
};

// WARDS
export const WARDS = ['N-WARD', 'S-WARD', 'E-WARD', 'W-WARD', 'C-WARD', 'H-WARD'];

// FORM VALIDATION RULES
export const VALIDATION_RULES = {
    name: { minLength: 2 },
    phone: { pattern: /^\d{10}$/, length: 10 },
    collectorId: { minLength: 3 },
    password: { minLength: 6 },
    confirmPassword: { mustMatch: 'password' },
};
