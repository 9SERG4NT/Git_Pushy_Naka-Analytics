// OPS_COMMAND Tactical Design System
export const COLORS = {
  // Surfaces
  surface: '#0c0e11',
  surfaceContainer: '#171a1d',
  surfaceContainerHigh: '#1d2024',
  surfaceContainerHighest: '#23262a',
  surfaceContainerLow: '#111417',
  surfaceDim: '#0c0e11',
  surfaceBright: '#292c31',
  surfaceVariant: '#23262a',

  // Primary (Orange)
  primary: '#ff9159',
  primaryDim: '#ff7524',
  primaryFixed: '#ff7a2f',
  primaryFixedDim: '#f66700',
  onPrimary: '#531e00',

  // Secondary (Yellow)
  secondary: '#fdd400',
  secondaryDim: '#edc600',
  secondaryContainer: '#705d00',
  onSecondary: '#594a00',

  // Tertiary (Red-Orange)
  tertiary: '#ff7166',
  tertiaryDim: '#db322f',
  tertiaryContainer: '#f5443f',

  // Error
  error: '#ff7351',
  errorContainer: '#b92902',
  onError: '#450900',

  // Text
  onSurface: '#f9f9fd',
  onSurfaceVariant: '#aaabaf',
  onBackground: '#f9f9fd',

  // Outline
  outline: '#747579',
  outlineVariant: '#46484b',

  // Aliases used across screens
  accent: '#fdd400',       // = secondary (yellow)
  accentOrange: '#ff9159', // = primary (orange)
  danger: '#ff7351',       // = error
  success: '#4ade80',
  info: '#38bdf8',
  textPrimary: '#f9f9fd',
  textSecondary: '#aaabaf',
  textMuted: '#747579',
  border: '#46484b',
  cardBg: 'rgba(23, 26, 29, 0.85)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const FONTS = {
  title: { fontSize: 22, fontWeight: '900', color: COLORS.onSurface, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface },
  body: { fontSize: 14, fontWeight: '400', color: COLORS.onSurfaceVariant },
  caption: { fontSize: 11, fontWeight: '400', color: COLORS.textMuted },
  mono: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
};

export const NAGPUR_CENTER = {
  latitude: 21.1458,
  longitude: 79.0882,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// Use your computer's LAN IP for physical device via Expo Go
// Run: Get-NetIPAddress -AddressFamily IPv4 to find your IP
export const API_BASE_URL = 'http://172.16.35.218:8000';
