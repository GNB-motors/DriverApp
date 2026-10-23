import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/context/LanguageContext';
import { AuthProvider } from './src/context/AuthContext';
import { useAppFonts } from './src/theme/fonts';
import SplashScreen from './src/components/ui/SplashScreen';
import { TelematicsDemoProvider } from './src/telematics/context/TelematicsDemoContext';
import FoundationPreviewScreen from './src/telematics/screens/FoundationPreviewScreen';

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
  // fontsReady={false} → splash uses system type (custom families aren't loaded yet).
  if (!fontsLoaded && !fontError) {
    return <SplashScreen fontsReady={false} />;
  }

  // Explicit development-only gallery. Never substitutes an authenticated role.
  if (__DEV__ && process.env.EXPO_PUBLIC_TELEMATICS_PREVIEW === 'true') {
    return (
      <SafeAreaProvider>
        <LanguageProvider>
          <TelematicsDemoProvider identity="foundation-preview:synthetic">
            <StatusBar style="dark" />
            <FoundationPreviewScreen />
          </TelematicsDemoProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);

