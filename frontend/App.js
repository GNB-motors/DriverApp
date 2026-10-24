import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/context/LanguageContext';
import { AuthProvider } from './src/context/AuthContext';
import { useAppFonts } from './src/theme/fonts';
import SplashScreen from './src/components/ui/SplashScreen';
import { setupAndroidChannel } from './src/services/pushNotifications';

export const navigationRef = createNavigationContainerRef();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableAutoSessionTracking: true,
  // We only want API errors — disable automatic JS error capture.
  enableNative: true,
  tracesSampleRate: 0,
});

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

