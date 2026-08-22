import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/context/LanguageContext';
import { AuthProvider } from './src/context/AuthContext';
import { useAppFonts } from './src/theme/fonts';
import SplashScreen from './src/components/ui/SplashScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';

// Deep-link scheme (reserved) — full path→screen mapping can be added later.
const linking = { prefixes: ['gnbedge://'] };

// Crash reporting — only initialise when a DSN is configured (per-env via eas.json),
// and tag the environment/release so events are attributable. Without a DSN this is
// a no-op and Sentry.wrap() below stays inert.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_ENV || (__DEV__ ? 'development' : 'production'),
    enableAutoSessionTracking: true,
    enableNative: true,
    tracesSampleRate: __DEV__ ? 0 : 0.2,
  });
}

function App() {
  const [fontsLoaded, fontError] = useAppFonts();

  // OTA: pull + apply a published update on launch (no-op in dev or until EAS
  // Update is configured — Updates.isEnabled is false then).
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const u = await Updates.checkForUpdateAsync();
        if (!cancelled && u.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // offline / no update server — ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Gate the UI until fonts resolve so the first paint uses the brand type.
  // fontsReady={false} → splash uses system type (custom families aren't loaded yet).
  if (!fontsLoaded && !fontError) {
    return <SplashScreen fontsReady={false} />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <AuthProvider>
            <NavigationContainer linking={linking}>
              <StatusBar style="dark" />
              <View style={{ flex: 1 }}>
                <AppNavigator />
                <OfflineBanner />
              </View>
            </NavigationContainer>
          </AuthProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);

