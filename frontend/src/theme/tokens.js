/**
 * ============================================================
 * HIGHWAY SAHAYAK — Design Tokens (single source of truth)
 * Mirrors components.html. Import these everywhere instead of
 * hard-coding hex values, sizes, or shadows.
 *
 *   import { colors, spacing, radius, typography, elevation } from '../theme/tokens';
 * ============================================================
 */

// ── COLOR ──────────────────────────────────────────────────
export const colors = {
  // Brand
  primary: '#0F6E60',
  primaryDeep: '#0A4F47',
  tealTint: '#E7F1EE',
  accent: '#E8943A', // amber

  // Status
  success: '#16A06B',
  warning: '#E0A53B',
  error: '#E23B33', // also SOS

  // Surfaces
  surface: '#FFFFFF',
  background: '#F4F6F5',

  // Text
  text: '#16211F',
  textMuted: '#61716C',

  // Lines
  border: '#E3E9E6',

  white: '#FFFFFF',
  black: '#16211F',

  // Header gradient stops — linear-gradient(165deg,#1AA28E,#0C5A50)
  gradient: ['#1AA28E', '#0C5A50'],

  // Soft tints used by badges / banners (derived from the swatches in components.html)
  validBg: '#E1F4EC',
  validText: '#0F8A5C',
  expiredBg: '#FBE9E7',
  expiredText: '#C42820',
  pendingBg: '#FBF2DE',
  pendingText: '#A9781C',
  infoBg: '#E7F1EE',
  infoText: '#0F6E60',

  // Translucent overlays (e.g. content on the teal header)
  onPrimary: '#FFFFFF',
  onPrimaryMuted: 'rgba(255,255,255,0.72)',
  onPrimaryFaint: 'rgba(255,255,255,0.16)',

  // ── Aliases ──────────────────────────────────────────────
  // Several screens and StatCard reach for these names. They resolved to
  // `undefined` before, which React Native silently renders as "no colour" —
  // so a danger-toned figure came out the same as a neutral one.
  danger: '#E23B33',
  info: '#0F6E60',
  textPrimary: '#16211F',
  textSecondary: '#61716C',
};

// ── SPACING · 4px grid ─────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

// ── RADIUS ─────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

// ── ELEVATION ──────────────────────────────────────────────
// Base shadow color rgb(16,40,36) = #102824. RN needs color + opacity split.
const SHADOW = '#102824';
export const elevation = {
  none: {},
  sm: {
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
};

// ── FONT FAMILIES ──────────────────────────────────────────
// These are the family-name strings registered by expo-font (see theme/fonts.js).
// In RN each weight is a distinct family — never combine fontFamily + fontWeight.
export const fontFamily = {
  // Plus Jakarta Sans — Latin UI / display
  display: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extrabold: 'PlusJakartaSans_800ExtraBold',
  },
  // Spline Sans Mono — operational data (plates, litres, ₹, odometer)
  mono: {
    regular: 'SplineSansMono_400Regular',
    medium: 'SplineSansMono_500Medium',
    semibold: 'SplineSansMono_600SemiBold',
    bold: 'SplineSansMono_600SemiBold', // mono tops out at 600 in our bundle
    extrabold: 'SplineSansMono_600SemiBold',
  },
  // Hind — Devanagari (हिन्दी)
  hi: {
    regular: 'Hind_400Regular',
    medium: 'Hind_500Medium',
    semibold: 'Hind_600SemiBold',
    bold: 'Hind_700Bold',
    extrabold: 'Hind_700Bold',
  },
  // Hind Siliguri — Bengali (বাংলা)
  bn: {
    regular: 'HindSiliguri_400Regular',
    medium: 'HindSiliguri_500Medium',
    semibold: 'HindSiliguri_600SemiBold',
    bold: 'HindSiliguri_700Bold',
    extrabold: 'HindSiliguri_700Bold',
  },
};

/**
 * Resolve the correct body font family for a script + weight.
 * Latin (en) → Plus Jakarta Sans; hi → Hind; bn → Hind Siliguri.
 */
export function bodyFont(language, weight = 'regular') {
  if (language === 'hi') return fontFamily.hi[weight] || fontFamily.hi.regular;
  if (language === 'bn') return fontFamily.bn[weight] || fontFamily.bn.regular;
  return fontFamily.display[weight] || fontFamily.display.regular;
}

export function monoFont(weight = 'regular') {
  return fontFamily.mono[weight] || fontFamily.mono.regular;
}

// ── TYPE SCALE ─────────────────────────────────────────────
// fontSize / lineHeight / default weight key (see components.html scale).
export const typography = {
  display: { fontSize: 34, lineHeight: 38, weight: 'extrabold', letterSpacing: -0.8 },
  h1: { fontSize: 26, lineHeight: 32, weight: 'extrabold', letterSpacing: -0.5 },
  h2: { fontSize: 21, lineHeight: 28, weight: 'bold', letterSpacing: -0.3 },
  h3: { fontSize: 17, lineHeight: 24, weight: 'bold', letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, weight: 'regular', letterSpacing: 0 },
  bodyStrong: { fontSize: 15, lineHeight: 22, weight: 'semibold', letterSpacing: 0 },
  small: { fontSize: 13, lineHeight: 18, weight: 'regular', letterSpacing: 0 },
  label: { fontSize: 12, lineHeight: 16, weight: 'bold', letterSpacing: 1, uppercase: true },
  caption: { fontSize: 11, lineHeight: 14, weight: 'medium', letterSpacing: 0.3 },
};

// Minimum touch target per design rules.
export const TOUCH_TARGET = 44;

export default { colors, spacing, radius, elevation, fontFamily, typography, bodyFont, monoFont, TOUCH_TARGET };
