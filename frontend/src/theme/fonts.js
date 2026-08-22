/**
 * Font loading for Highway Sahayak — Nova SpiceKit type system.
 *
 *   Inter     → Latin UI / body text
 *   DM Sans   → Latin display headings
 *   DM Mono   → operational numbers (₹, litres, km, plates, IDs, dates)
 *
 * Loads only the weights referenced in tokens.fontFamily so the bundle stays
 * lean. Call useAppFonts() once at the app root and gate the UI until it resolves.
 *
 * NOTE: Devanagari (Hind) / Bengali (Hind Siliguri) fonts were dropped while
 * i18n is deferred — the app is English-only, so those ~2.4 MB of fonts were
 * dead weight. When hi/bn translations are wired, re-add:
 *   npx expo install @expo-google-fonts/hind @expo-google-fonts/hind-siliguri
 * and restore their imports + FONT_MAP entries (tokens.fontFamily.hi/bn already
 * reference the family names).
 */
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';

export const FONT_MAP = {
  // Inter — UI / body
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  // DM Sans — display headings
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  // DM Mono — numbers (300/400/500 only in the family)
  DMMono_400Regular,
  DMMono_500Medium,
};

/** Returns [fontsLoaded, error]. */
export function useAppFonts() {
  return useFonts(FONT_MAP);
}
