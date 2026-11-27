import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NAV_ICONS, QuickAddIcon } from './NavIcons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../components/ui';
import CurvedTabBar from './CurvedTabBar';
import FloatingTabBar from './FloatingTabBar';
import DriverNavigator from '../telematics/DriverNavigator';
import ManagerNavigator from '../telematics/ManagerNavigator';
import OwnerNavigator from '../telematics/OwnerNavigator';
import { selectAppShell } from '../telematics/services/appShell';
import UnsupportedRoleScreen from '../telematics/screens/UnsupportedRoleScreen';
import LoginScreen from '../screens/onboarding/LoginScreen';
import { IntroScreen, LanguageScreen, MobileLoginScreen, OtpScreen } from '../driverUi/screens/OnboardingScreens';
import SOSOptionsScreen from '../screens/driver/sos/SOSOptionsScreen';
import SOSEmergencyActiveScreen from '../screens/driver/sos/SOSEmergencyActiveScreen';
import ChooseLanguageScreen from '../screens/driver/account/ChooseLanguageScreen';
import AlertsScreen from '../screens/driver/alerts/AlertsScreen';
import FuelCaptureScreen from '../screens/driver/fuel/FuelLogFormScreen';
import FuelEntryDetailsScreen from '../screens/driver/fuel/FuelEntryDetailsScreen';
import FuelSavedScreen from '../screens/driver/fuel/FuelSavedScreen';
import FuelLogScreen from '../screens/driver/fuel/FuelLogScreen';
import FieldAgentHomeScreen from '../screens/driver/home/FieldAgentHomeScreen';
import FieldAgentOrgsScreen from '../screens/driver/account/FieldAgentOrgsScreen';
import FieldAgentProfileScreen from '../screens/driver/account/FieldAgentProfileScreen';
import FieldAgentVehiclePickerScreen from '../screens/driver/fuel/FieldAgentVehiclePickerScreen';
import SplashScreen from '../components/ui/SplashScreen';
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const tabIcon = (routeName) => ({ color, size }) => { const Icon = NAV_ICONS[routeName] || NAV_ICONS.Home; return <Icon size={size} color={color} />; };
// Design screens 01–04: splash → language → mobile number → OTP. Drivers sign
// in by SMS code; owners, managers and field agents keep password sign-in.
function AuthStack({ initialRoute }) {
  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Intro" component={IntroScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Choose language" component={LanguageScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Mobile login" component={MobileLoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="Password login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function FieldAgentTabBar(props) {
  const { t } = useLanguage();
  return (
    <CurvedTabBar
      {...props}
      centerAction={{
        label: t('fieldAgent', 'capture') || 'Refuel',
        onPress: () => props.navigation.navigate('VehiclePicker'),
        icon: <QuickAddIcon size={26} color={colors.white} />,
      }}
    />
  );
}

function FieldAgentTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      tabBar={(props) => <FieldAgentTabBar {...props} />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
    >
      <Tab.Screen name="Home" component={FieldAgentHomeScreen} options={{ tabBarLabel: t('fieldAgent', 'home') || 'Home' }} />
      <Tab.Screen name="Fuel" component={FuelLogScreen} options={{ tabBarLabel: t('fieldAgent', 'fuelLogs') || 'Fuel Logs' }} />
      <Tab.Screen name="Orgs" component={FieldAgentOrgsScreen} options={{ tabBarLabel: t('fieldAgent', 'orgs') || 'Orgs' }} />
      <Tab.Screen name="Profile" component={FieldAgentProfileScreen} options={{ tabBarLabel: t('fieldAgent', 'profile') || 'Profile' }} />
    </Tab.Navigator>
  );
}

function FieldAgentStackInner() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={FieldAgentTabs} />
      <Stack.Screen name="VehiclePicker" component={FieldAgentVehiclePickerScreen} />
      <Stack.Screen name="FuelCapture" component={FuelCaptureScreen} />
      <Stack.Screen name="FuelEntryDetails" component={FuelEntryDetailsScreen} />
      <Stack.Screen name="FuelSaved" component={FuelSavedScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="SOSOptions" component={SOSOptionsScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="SOSEmergencyActive" component={SOSEmergencyActiveScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="LanguageScreen" component={ChooseLanguageScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
    </Stack.Navigator>
  );
}

function FieldAgentStack() {
  return (
    <View style={styles.fill}>
      <FieldAgentStackInner />
    </View>
  );
}


export default function AppNavigator() {
  const { isLoaded, onboarded } = useLanguage();
  const { user, loading, activeOrgId } = useAuth();
  if (!isLoaded || loading) return <SplashScreen />;
  const shell = selectAppShell(user);
  if (shell === 'login') return <AuthStack initialRoute={onboarded ? 'Mobile login' : 'Intro'} />;
  if (shell === 'driver') return <DriverNavigator />;
  if (shell === 'manager') return <ManagerNavigator />;
  if (shell === 'owner') return <OwnerNavigator />;
  if (shell === 'field-agent') return <FieldAgentStack key={`${user._id}:${activeOrgId || 'none'}`} />;
  return <UnsupportedRoleScreen />;
}
const styles = StyleSheet.create({ fill: { flex: 1 } });
