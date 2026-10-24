import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/context/LanguageContext';
import { AuthProvider } from './src/context/AuthContext';
import { useAppFonts } from './src/theme/fonts';
import SplashScreen from './src/components/ui/SplashScreen';
import { setupAndroidChannel } from './src/services/pushNotifications';

export const navigationRef = createNavigationContainerRef();

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
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    setupAndroidChannel();

    // Navigate to the right screen when the user taps a push notification.
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (!navigationRef.isReady()) return;
      if (data?.kind === 'DRIVER_ALERT' && data.alertId) {
        navigationRef.navigate('Alert detail', { id: data.alertId });
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

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
      <LanguageProvider>
        <AuthProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="dark" />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);

