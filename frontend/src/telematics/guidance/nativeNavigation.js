import Constants from 'expo-constants';

// Expo Go ships only Expo's own native code, so Ferrostar and MapLibre exist
// only in the GNB build. Their modules are required lazily: a static import
// fails at startup and takes the whole app down, not just the Navigate tab.
export const NATIVE_NAVIGATION_MISSING = 'Turn-by-turn navigation needs the GNB driver app build. Expo Go cannot run it.';

export const nativeNavigationAvailable = Constants.executionEnvironment !== 'storeClient';

export function requireNavigationNative(load) {
  if (!nativeNavigationAvailable) throw new Error(NATIVE_NAVIGATION_MISSING);
  try {
    return load();
  } catch {
    throw new Error(NATIVE_NAVIGATION_MISSING);
  }
}
