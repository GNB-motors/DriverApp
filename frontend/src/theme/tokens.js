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
  // Brand — Nova SpiceKit "Nova Rage" blue
  primary: '#4469F0',
  primaryDeep: '#213EA7', // deep blue: button borders, shadows, pressed
  primaryBorder: '#213EA7', // explicit alias for CTA borders
  // NOTE: `tealTint` keeps its key name for backwards-compat with existing call
  // sites, but now holds the blue ~10% tint fill used by selected/hover states.
  tealTint: '#EAEEFD',
  blueTint: '#EAEEFD',
  accent: '#F0AA48', // amber (dots / notification markers)

  // Status
  success: '#187A32',
  warning: '#C56200',
  error: '#BB2626', // rejected / SOS text
  errorStrong: '#DD3030', // filled destructive buttons
  infoBlue: '#2666B8', // "In transit" text

  // Surfaces
  surface: '#FFFFFF',
  background: '#F3F3F6',

  // Text
  text: '#17181C',
  textMuted: '#5D5D5E',

  // Lines
  border: '#E6E6EB',

  white: '#FFFFFF',
  black: '#17181C',

  // Header gradient stops — linear-gradient(180deg,#213EA7,#2F58EE,#4469F0)
  gradient: ['#213EA7', '#2F58EE', '#4469F0'],
  // Avatar / brand mark gradient — linear-gradient(135deg,#F9A061,#E5686C)
  avatarGradient: ['#F9A061', '#E5686C'],

  // Soft tints used by badges / banners (Nova status swatches)
  validBg: '#E7F4EA',
  validText: '#187A32',
  expiredBg: '#FBEAEA',
  expiredText: '#BB2626',
  pendingBg: '#FDF3E0',
  pendingText: '#C56200',
  infoBg: '#E8F1FD',
  infoText: '#2666B8',

  // Status dots
  dotGreen: '#25BA4C',
  dotAmber: '#F0AA48',

  // Translucent overlays (e.g. content on the blue header)
  onPrimary: '#FFFFFF',
  onPrimaryMuted: 'rgba(255,255,255,0.72)',
  onPrimaryFaint: 'rgba(255,255,255,0.16)',
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
// Base shadow color rgb(10,16,36) = #0A1024 (Nova navy). RN needs color + opacity split.
const SHADOW = '#0A1024';
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
  // Inter — Latin UI / body
  display: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
  },
  // DM Sans — Latin display headings (display / h1 / h2 / h3)
  heading: {
    regular: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    semibold: 'DMSans_600SemiBold',
    bold: 'DMSans_700Bold',
    extrabold: 'DMSans_800ExtraBold',
  },
  // DM Mono — operational data (plates, litres, ₹, odometer)
  mono: {
    regular: 'DMMono_400Regular',
    medium: 'DMMono_500Medium',
    semibold: 'DMMono_500Medium',
    bold: 'DMMono_500Medium', // mono tops out at 500 in the family
    extrabold: 'DMMono_500Medium',
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

/**
 * Heading font for display/h1/h2/h3 variants. Latin → DM Sans; Devanagari and
 * Bengali fall back to their body families (DM Sans has no Indic glyphs).
 */
export function headingFont(language, weight = 'bold') {
  if (language === 'hi') return fontFamily.hi[weight] || fontFamily.hi.regular;
  if (language === 'bn') return fontFamily.bn[weight] || fontFamily.bn.regular;
  return fontFamily.heading[weight] || fontFamily.heading.regular;
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

export default { colors, spacing, radius, elevation, fontFamily, typography, bodyFont, headingFont, monoFont, TOUCH_TARGET };
