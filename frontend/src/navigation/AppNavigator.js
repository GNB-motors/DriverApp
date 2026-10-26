import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NAV_ICONS } from './NavIcons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import FloatingTabBar from './FloatingTabBar';
import DriverNavigator from '../telematics/DriverNavigator';
import ManagerNavigator from '../telematics/ManagerNavigator';
import OwnerNavigator from '../telematics/OwnerNavigator';
import { selectAppShell } from '../telematics/services/appShell';
import UnsupportedRoleScreen from '../telematics/screens/UnsupportedRoleScreen';
import GetStartedScreen from '../screens/onboarding/GetStartedScreen';
import OnboardingLanguageScreen from '../screens/onboarding/OnboardingLanguageScreen';
import PhoneNumberScreen from '../screens/onboarding/PhoneNumberScreen';
import OtpScreen from '../screens/onboarding/OtpScreen';
import PasswordScreen from '../screens/onboarding/PasswordScreen';
import LoginScreen from '../screens/onboarding/LoginScreen';
import SOSOptionsScreen from '../screens/driver/sos/SOSOptionsScreen';
import SOSEmergencyActiveScreen from '../screens/driver/sos/SOSEmergencyActiveScreen';
import ChooseLanguageScreen from '../screens/driver/account/ChooseLanguageScreen';
import AlertsScreen from '../screens/driver/alerts/AlertsScreen';
import FuelCaptureScreen from '../screens/driver/fuel/FuelCaptureScreen';
import FuelEntryDetailsScreen from '../screens/driver/fuel/FuelEntryDetailsScreen';
import FuelSavedScreen from '../screens/driver/fuel/FuelSavedScreen';
import FuelLogScreen from '../screens/driver/fuel/FuelLogScreen';
import FieldAgentHomeScreen from '../screens/driver/home/FieldAgentHomeScreen';
import FieldAgentOrgsScreen from '../screens/driver/account/FieldAgentOrgsScreen';
import FieldAgentProfileScreen from '../screens/driver/account/FieldAgentProfileScreen';
import SplashScreen from '../components/ui/SplashScreen';
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const tabIcon = (routeName) => ({ color, size }) => { const Icon = NAV_ICONS[routeName] || NAV_ICONS.Home; return <Icon size={size} color={color} />; };
function AuthStack({ initialRoute }) {
  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="GetStarted" component={GetStartedScreen} />
      <Stack.Screen name="OnboardingLanguage" component={OnboardingLanguageScreen} />
      <Stack.Screen name="Phone" component={PhoneNumberScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="Password" component={PasswordScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function FieldAgentTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
    >
      <Tab.Screen name="Home" component={FieldAgentHomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Fuel" component={FuelLogScreen} options={{ tabBarLabel: 'Fuel' }} />
      <Tab.Screen name="Orgs" component={FieldAgentOrgsScreen} options={{ tabBarLabel: 'Orgs' }} />
      <Tab.Screen name="Profile" component={FieldAgentProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function FieldAgentStackInner() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={FieldAgentTabs} />
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
  const { user, loading } = useAuth();
  if (!isLoaded || loading) return <SplashScreen />;
  const shell = selectAppShell(user);
  if (shell === 'login') return <AuthStack initialRoute={onboarded ? 'Login' : 'GetStarted'} />;
  if (shell === 'driver') return <DriverNavigator />;
  if (shell === 'manager') return <ManagerNavigator />;
  if (shell === 'owner') return <OwnerNavigator />;
  if (shell === 'field-agent') return <FieldAgentStack />;
  return <UnsupportedRoleScreen />;
}
const styles = StyleSheet.create({ fill: { flex: 1 } });
