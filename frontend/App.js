import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/context/LanguageContext';
import { AuthProvider } from './src/context/AuthContext';
import { AccessProvider } from './src/context/AccessContext';
import { ErpProvider } from './src/context/ErpContext';
import { useAppFonts } from './src/theme/fonts';
import SplashScreen from './src/components/ui/SplashScreen';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableAutoSessionTracking: true,
  // We only want API errors — disable automatic JS error capture.
  enableNative: true,
  tracesSampleRate: 0,
});

function App() {
  const [fontsLoaded, fontError] = useAppFonts();

  // Gate the UI until fonts resolve so the first paint uses the brand type.
  // fontsReady={false} – splash uses system type (custom families aren't loaded yet).
  if (!fontsLoaded && !fontError) {
    return <SplashScreen fontsReady={false} />;
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          {/* AccessProvider must wrap ErpProvider — ErpContext asks it what the
              current role is allowed to poll for. */}
          <AccessProvider>
            <ErpProvider>
              <NavigationContainer>
                <StatusBar style="dark" />
                <AppNavigator />
              </NavigationContainer>
            </ErpProvider>
          </AccessProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
