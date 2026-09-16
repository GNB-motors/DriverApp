import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { DrawerProvider } from '../context/DrawerContext';
import FloatingTabBar from './FloatingTabBar';
import { NAV_ICONS } from './NavIcons';
import { colors } from '../components/ui';

import GetStartedScreen from '../screens/onboarding/GetStartedScreen';
import OnboardingLanguageScreen from '../screens/onboarding/OnboardingLanguageScreen';
import PhoneNumberScreen from '../screens/onboarding/PhoneNumberScreen';
import OtpScreen from '../screens/onboarding/OtpScreen';
import PasswordScreen from '../screens/onboarding/PasswordScreen';
import LoginScreen from '../screens/onboarding/LoginScreen';

import HomeScreen from '../screens/driver/home/HomeScreen';
import SOSOptionsScreen from '../screens/driver/sos/SOSOptionsScreen';
import SOSEmergencyActiveScreen from '../screens/driver/sos/SOSEmergencyActiveScreen';
import ProfileScreen from '../screens/driver/account/ProfileScreen';
import ChooseLanguageScreen from '../screens/driver/account/ChooseLanguageScreen';
import VehiclesScreen from '../screens/driver/vehicles/VehiclesScreen';
import TripsScreen from '../screens/driver/trips/TripsScreen';
import AlertsScreen from '../screens/driver/alerts/AlertsScreen';
import MoreScreen from '../screens/driver/account/MoreScreen';
import WalletScreen from '../screens/driver/wallet/WalletScreen';
import AddBillScreen from '../screens/driver/wallet/AddBillScreen';
import BillSentScreen from '../screens/driver/wallet/BillSentScreen';
import MyAdvancesScreen from '../screens/driver/wallet/MyAdvancesScreen';
import ActiveTripScreen from '../screens/driver/trips/ActiveTripScreen';
import TripDetailScreen from '../screens/driver/trips/TripDetailScreen';
import ConsignmentNoteScreen from '../screens/driver/trips/ConsignmentNoteScreen';
import PodScreen from '../screens/driver/trips/PodScreen';
import FuelCaptureScreen from '../screens/driver/fuel/FuelCaptureScreen';
import FuelEntryDetailsScreen from '../screens/driver/fuel/FuelEntryDetailsScreen';
import FuelSavedScreen from '../screens/driver/fuel/FuelSavedScreen';
import FuelLogScreen from '../screens/driver/fuel/FuelLogScreen';
import MyDocumentsScreen from '../screens/driver/documents/MyDocumentsScreen';
import RepairsScreen from '../screens/driver/repairs/RepairsScreen';
import LogRepairScreen from '../screens/driver/repairs/LogRepairScreen';

import FieldAgentHomeScreen from '../screens/driver/home/FieldAgentHomeScreen';
import FieldAgentOrgsScreen from '../screens/driver/account/FieldAgentOrgsScreen';
import FieldAgentSidebar from '../screens/driver/account/FieldAgentSidebar';
import FieldAgentProfileScreen from '../screens/driver/account/FieldAgentProfileScreen';
import DriverSidebar from '../screens/driver/account/DriverSidebar';

import OwnerSidebar from '../screens/owner/OwnerSidebar';
import OwnerApprovalsScreen from '../screens/owner/OwnerApprovalsScreen';
import OwnerBillDetailScreen from '../screens/owner/OwnerBillDetailScreen';
import OwnerRejectScreen from '../screens/owner/OwnerRejectScreen';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import OwnerMoneyScreen from '../screens/owner/OwnerMoneyScreen';
import OwnerDriverScreen from '../screens/owner/OwnerDriverScreen';
import OwnerSaleBillsScreen from '../screens/owner/OwnerSaleBillsScreen';
import OwnerFleetScreen from '../screens/owner/OwnerFleetScreen';
import OwnerErpScreen from '../screens/owner/OwnerErpScreen';
import OwnerLedgerScreen from '../screens/owner/OwnerLedgerScreen';
import OwnerProfileScreen from '../screens/owner/OwnerProfileScreen';
import OwnerDriversDashboardScreen from '../screens/owner/OwnerDriversDashboardScreen';

import ManagerSidebar from '../screens/manager/ManagerSidebar';
import OpsHomeScreen from '../screens/manager/OpsHomeScreen';
import OpsTripsScreen from '../screens/manager/OpsTripsScreen';
import OpsTripDetailScreen from '../screens/manager/OpsTripDetailScreen';
import OpsApprovalsScreen from '../screens/manager/OpsApprovalsScreen';
import OpsLoadsScreen from '../screens/manager/OpsLoadsScreen';
import OpsCloseTripScreen from '../screens/manager/OpsCloseTripScreen';
import OpsUnloadingScreen from '../screens/manager/OpsUnloadingScreen';
import OpsInboundEwbScreen from '../screens/manager/OpsInboundEwbScreen';
import OpsDeliveryOrderScreen from '../screens/manager/OpsDeliveryOrderScreen';
import OpsPlacementsScreen from '../screens/manager/OpsPlacementsScreen';
import OpsAdvancesScreen from '../screens/manager/OpsAdvancesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function tabIcon(name) {
  const Icon = NAV_ICONS[name] || NAV_ICONS.Home;
  return (props) => <Icon {...props} />;
}

// ─── AUTH STACK ─────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="GetStarted" component={GetStartedScreen} />
      <Stack.Screen name="OnboardingLanguage" component={OnboardingLanguageScreen} />
      <Stack.Screen name="Phone" component={PhoneNumberScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="Password" component={PasswordScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// ─── DRIVER & FIELD AGENT ───────────────────────────────────────────────────
function DriverTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} showFab />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Vehicles" component={VehiclesScreen} options={{ tabBarLabel: 'Vehicles' }} />
      <Tab.Screen name="Trips" component={TripsScreen} options={{ tabBarLabel: 'Trips' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarLabel: 'Alerts' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: 'More' }} />
    </Tab.Navigator>
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

function DriverStackInner() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={DriverTabs} />
      <Stack.Screen name="MyDocuments" component={MyDocumentsScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="AddBill" component={AddBillScreen} />
      <Stack.Screen name="BillSent" component={BillSentScreen} />
      <Stack.Screen name="Advances" component={MyAdvancesScreen} />
      <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="ConsignmentNote" component={ConsignmentNoteScreen} />
      <Stack.Screen name="Pod" component={PodScreen} />
      <Stack.Screen name="FuelLog" component={FuelLogScreen} />
      <Stack.Screen name="FuelCapture" component={FuelCaptureScreen} />
      <Stack.Screen name="FuelEntryDetails" component={FuelEntryDetailsScreen} />
      <Stack.Screen name="FuelSaved" component={FuelSavedScreen} />
      <Stack.Screen name="Repairs" component={RepairsScreen} />
      <Stack.Screen name="LogRepair" component={LogRepairScreen} />
      <Stack.Screen name="More" component={MoreScreen} />
      <Stack.Screen name="SOSOptions" component={SOSOptionsScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="SOSEmergencyActive" component={SOSEmergencyActiveScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="LanguageScreen" component={ChooseLanguageScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
    </Stack.Navigator>
  );
}

function DriverStack() {
  return (
    <View style={styles.fill}>
      <DriverStackInner />
    </View>
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

// ─── OWNER STACK ────────────────────────────────────────────────────────────


function OwnerStackInner() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
      <Stack.Screen name="OwnerDriversDashboard" component={OwnerDriversDashboardScreen} />
      <Stack.Screen name="OwnerApprovals" component={OwnerApprovalsScreen} />
      <Stack.Screen name="OwnerFleet" component={OwnerFleetScreen} />
      <Stack.Screen name="OwnerProfile" component={OwnerProfileScreen} />
      <Stack.Screen name="OwnerBillDetail" component={OwnerBillDetailScreen} />
      <Stack.Screen name="OwnerReject" component={OwnerRejectScreen} />
      <Stack.Screen name="OwnerMoney" component={OwnerMoneyScreen} />
      <Stack.Screen name="OwnerDriver" component={OwnerDriverScreen} />
      <Stack.Screen name="OwnerSaleBills" component={OwnerSaleBillsScreen} />
      <Stack.Screen name="OwnerErp" component={OwnerErpScreen} />
      <Stack.Screen name="OwnerLedger" component={OwnerLedgerScreen} />
      <Stack.Screen name="LanguageScreen" component={ChooseLanguageScreen} options={{ presentation: "transparentModal", animation: "fade" }} />
    </Stack.Navigator>
  );
}

function OwnerStack({ navigation }) {
  return (
    <DrawerProvider>
      <View style={styles.fill}>
        <OwnerStackInner />
        <OwnerSidebar navigation={navigation} />
      </View>
    </DrawerProvider>
  );
}

// ─── MANAGER STACK ──────────────────────────────────────────────────────────


function ManagerStackInner() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>

      <Stack.Screen name="OpsHome" component={OpsHomeScreen} />
      <Stack.Screen name="OpsTrips" component={OpsTripsScreen} />
      <Stack.Screen name="OpsApprovals" component={OpsApprovalsScreen} />
      <Stack.Screen name="OpsProfile" component={OwnerProfileScreen} />
      <Stack.Screen name="OpsTripDetail" component={OpsTripDetailScreen} />
      <Stack.Screen name="OwnerBillDetail" component={OwnerBillDetailScreen} />
      <Stack.Screen name="OwnerReject" component={OwnerRejectScreen} />
      <Stack.Screen name="OpsLoads" component={OpsLoadsScreen} />
      <Stack.Screen name="OpsCloseTrip" component={OpsCloseTripScreen} />
      <Stack.Screen name="OpsUnloading" component={OpsUnloadingScreen} />
      <Stack.Screen name="OpsInboundEwb" component={OpsInboundEwbScreen} />
      <Stack.Screen name="OpsDeliveryOrder" component={OpsDeliveryOrderScreen} />
      <Stack.Screen name="OpsPlacements" component={OpsPlacementsScreen} />
      <Stack.Screen name="OpsAdvances" component={OpsAdvancesScreen} />
      <Stack.Screen name="LanguageScreen" component={ChooseLanguageScreen} options={{ presentation: "transparentModal", animation: "fade" }} />
    </Stack.Navigator>
  );
}

function ManagerStack({ navigation }) {
  return (
    <DrawerProvider>
      <View style={styles.fill}>
        <ManagerStackInner />
        <ManagerSidebar navigation={navigation} />
      </View>
    </DrawerProvider>
  );
}

// ─── ROOT NAVIGATOR ─────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Use the native stack container directly
  const renderRoot = () => {
    if (!token || !user) return <AuthStack />;
    
    // Route by role
    if (user.role === 'OWNER' || user.role === 'SUPER_ADMIN') return <OwnerStack />;
    if (user.role === 'MANAGER') return <ManagerStack />;
    if (user.role === 'FIELD_AGENT') return <FieldAgentStack />;
    return <DriverStack />;
  };

  return renderRoot();
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
});
// Trigger hot reload