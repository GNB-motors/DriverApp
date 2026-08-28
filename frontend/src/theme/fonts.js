/**
 * Font loading for Highway Sahayak — Nova SpiceKit type system.
 *
 *   Inter          → Latin UI / body text
 *   DM Sans        → Latin display headings
 *   DM Mono        → operational numbers (₹, litres, km, plates, IDs, dates)
 *   Hind           → Devanagari (हिन्दी)
 *   Hind Siliguri  → Bengali (বাংলা)
 *
 * Loads only the weights referenced in tokens.fontFamily so the bundle stays
 * lean. Call useAppFonts() once at the app root and gate the UI until it resolves.
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
import {
  Hind_400Regular,
  Hind_500Medium,
  Hind_600SemiBold,
  Hind_700Bold,
} from '@expo-google-fonts/hind';
import {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from '@expo-google-fonts/hind-siliguri';

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
  // DM Mono — numbers (400/500 only in the family)
  DMMono_400Regular,
  DMMono_500Medium,
  // Hind — Devanagari (हिन्दी)
  Hind_400Regular,
  Hind_500Medium,
  Hind_600SemiBold,
  Hind_700Bold,
  // Hind Siliguri — Bengali (বাংলা)
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
};

/** Returns [fontsLoaded, error]. */
export function useAppFonts() {
  return useFonts(FONT_MAP);
}
