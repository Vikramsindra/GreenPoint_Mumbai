// filepath: app/constants/theme.js
export const COLORS = {
  primary: '#16a34a',
  primaryGradientStart: '#16a34a',
  primaryGradientEnd: '#86efac',
  primaryDark: '#15803d',
  primaryLight: '#f0fdf4',
  primaryMuted: '#dcfce7',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  warning: '#d97706',
  warningLight: '#fffbeb',
  info: '#2563eb',
  infoLight: '#eff6ff',
  white: '#ffffff',
  background: '#F8FAFC',
  cardBg: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  textSecondary: '#64748B',
  textMuted: '#9ca3af',
  success: '#16a34a',
};

export const FONTS = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24,
};

export const RADIUS = {
  sm: 6, md: 10, lg: 14, xl: 20, squircle: 28, squircleLg: 32, full: 999,
};

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4, // Android equivalent approximation
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  floating: {
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  }
};
