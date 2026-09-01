import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { DrawerProvider } from '../context/DrawerContext';
import SplashScreen from '../components/ui/SplashScreen';
import FloatingTabBar from './FloatingTabBar';
import { NAV_ICONS } from './NavIcons';

import GetStartedScreen from '../screens/onboarding/GetStartedScreen';
import OnboardingLanguageScreen from '../screens/onboarding/OnboardingLanguageScreen';
import PhoneNumberScreen from '../screens/onboarding/PhoneNumberScreen';
import OtpScreen from '../screens/onboarding/OtpScreen';
import PasswordScreen from '../screens/onboarding/PasswordScreen';
import LoginScreen from '../screens/onboarding/LoginScreen';
import HomeScreen from '../screens/driver/home/HomeScreen';
import FieldAgentHomeScreen from '../screens/driver/home/FieldAgentHomeScreen';
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
import DriverSidebar from '../screens/driver/account/DriverSidebar';
// Owner (O1–O10)
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
// Manager + Ops
import OpsHomeScreen from '../screens/manager/OpsHomeScreen';
import OpsTripsScreen from '../screens/manager/OpsTripsScreen';
import OpsTripDetailScreen from '../screens/manager/OpsTripDetailScreen';
import OpsApprovalsScreen from '../screens/manager/OpsApprovalsScreen';
import OpsLoadsScreen from '../screens/manager/OpsLoadsScreen';
import OpsCloseTripScreen from '../screens/manager/OpsCloseTripScreen';
import OpsUnloadingScreen from '../screens/manager/OpsUnloadingScreen';
import OpsDeliveryOrderScreen from '../screens/manager/OpsDeliveryOrderScreen';
import OpsPlacementsScreen from '../screens/manager/OpsPlacementsScreen';
import OpsAdvancesScreen from '../screens/manager/OpsAdvancesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIcon = (routeName) => ({ focused, color, size }) => {
  // The 5 driver tabs use the exact design SVGs; anything else (e.g. field-agent
  // Profile) falls back to Ionicons.
  const SvgIcon = NAV_ICONS[routeName];
  if (SvgIcon) return <SvgIcon size={size} color={color} />;
  const iconName = routeName === 'Profile' ? (focused ? 'person' : 'person-outline') : 'ellipse-outline';
  return <Ionicons name={iconName} size={size} color={color} />;
};

// Driver tabs: Home · Vehicles · [Trips FAB] · Alerts · Profile
function BottomTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} showFab />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Vehicles" component={VehiclesScreen} options={{ tabBarLabel: 'Vehicles' }} />
      <Tab.Screen name="Trips" component={TripsScreen} options={{ tabBarLabel: 'Trips' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarLabel: 'Alerts' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// Field Agent: Home · Fuel · Profile (no FAB)
// - FieldAgentHomeScreen is dedicated: fuel-upload CTA + recent uploads.
// - Home opens the DriverSidebar via DrawerContext (hamburger in header).
// - Fuel tab shows the full FuelLogScreen for history + capture.
function FieldAgentTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
    >
      <Tab.Screen name="Home" component={FieldAgentHomeScreen} options={{ tabBarLabel: t('home', 'tabName') || 'Home' }} />
      <Tab.Screen name="Fuel" component={FuelLogScreen} options={{ tabBarLabel: 'Fuel' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('profile', 'title') || 'Profile' }} />
    </Tab.Navigator>
  );
}

// Owner (O1–O10) — its own stack, no route into Manager or the driver app.
// OwnerShell's sidebar can only navigate to names registered here.
function OwnerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
      <Stack.Screen name="OwnerApprovals" component={OwnerApprovalsScreen} />
      <Stack.Screen name="OwnerBillDetail" component={OwnerBillDetailScreen} />
      <Stack.Screen name="OwnerReject" component={OwnerRejectScreen} />
      <Stack.Screen name="OwnerMoney" component={OwnerMoneyScreen} />
      <Stack.Screen name="OwnerDriver" component={OwnerDriverScreen} />
      <Stack.Screen name="OwnerSaleBills" component={OwnerSaleBillsScreen} />
      <Stack.Screen name="OwnerFleet" component={OwnerFleetScreen} />
      <Stack.Screen name="OwnerErp" component={OwnerErpScreen} />
      <Stack.Screen name="OwnerLedger" component={OwnerLedgerScreen} />
      {/* Owner-specific profile (company + account info, no wallet) */}
      <Stack.Screen name="Profile" component={OwnerProfileScreen} />
      <Stack.Screen name="LanguageScreen" component={ChooseLanguageScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
    </Stack.Navigator>
  );
}

// Manager / Ops (M1–M10) — its own stack.
function ManagerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OpsHome" component={OpsHomeScreen} />
      <Stack.Screen name="OpsTrips" component={OpsTripsScreen} />
      <Stack.Screen name="OpsTripDetail" component={OpsTripDetailScreen} />
      <Stack.Screen name="OpsApprovals" component={OpsApprovalsScreen} />
      {/* Shared bill-approval detail + reject (also used by the owner surface). */}
      <Stack.Screen name="OwnerBillDetail" component={OwnerBillDetailScreen} />
      <Stack.Screen name="OwnerReject" component={OwnerRejectScreen} />
      <Stack.Screen name="OpsLoads" component={OpsLoadsScreen} />
      <Stack.Screen name="OpsCloseTrip" component={OpsCloseTripScreen} />
      <Stack.Screen name="OpsUnloading" component={OpsUnloadingScreen} />
      <Stack.Screen name="OpsDeliveryOrder" component={OpsDeliveryOrderScreen} />
      <Stack.Screen name="OpsPlacements" component={OpsPlacementsScreen} />
      <Stack.Screen name="OpsAdvances" component={OpsAdvancesScreen} />
      {/* Manager profile shows company info, not driver wallet */}
      <Stack.Screen name="Profile" component={OwnerProfileScreen} />
      <Stack.Screen name="LanguageScreen" component={ChooseLanguageScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
    </Stack.Navigator>
  );
}

// Driver + Field Agent — everything below Main. Wrapped in DrawerProvider so
// the animated DriverSidebar renders above the tab bar overlay.
function DriverStackInner() {
  const { user } = useAuth();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Main"
        component={user?.role === 'FIELD_AGENT' ? FieldAgentTabs : BottomTabs}
      />
      <Stack.Screen name="MyDocuments" component={MyDocumentsScreen} />
      <Stack.Screen name="LanguageScreen" component={ChooseLanguageScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="SOSOptions" component={SOSOptionsScreen} options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="SOSEmergencyActive" component={SOSEmergencyActiveScreen} options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Repairs" component={RepairsScreen} />
      <Stack.Screen name="LogRepair" component={LogRepairScreen} />

      {/* Wallet + bill loop (M3) */}
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="AddBill" component={AddBillScreen} />
      <Stack.Screen name="BillSent" component={BillSentScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="Advances" component={MyAdvancesScreen} />

      {/* Trips + trip documents (M4) */}
      <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="ConsignmentNote" component={ConsignmentNoteScreen} />
      <Stack.Screen name="Pod" component={PodScreen} />

      {/* Fuel (M5) */}
      <Stack.Screen name="FuelCapture" component={FuelCaptureScreen} />
      <Stack.Screen name="FuelEntryDetails" component={FuelEntryDetailsScreen} />
      <Stack.Screen name="FuelSaved" component={FuelSavedScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="FuelLog" component={FuelLogScreen} />
    </Stack.Navigator>
  );
}

function DriverStack() {
  const { user } = useAuth();
  // The navigation prop passed here is used by DriverSidebar to navigate
  // to any screen in the DriverStack (Wallet, FuelLog, etc.)
  return (
    <DrawerProvider>
      <View style={styles.fill}>
        <DriverStackInner />
        {/* Sidebar rendered here so it overlays the tab bar too */}
        <DriverSidebarWrapper />
      </View>
    </DrawerProvider>
  );
}

// Thin wrapper so DriverSidebar can call navigation.navigate() for any
// screen registered in the parent DriverStack.
function DriverSidebarWrapper() {
  const nav = useNavigation();
  return <DriverSidebar navigation={nav} />;
}

export default function AppNavigator() {
  const { language, isLoaded } = useLanguage();
  const { user, loading: authLoading, activeBranchId } = useAuth();

  if (!isLoaded || authLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="GetStarted" component={GetStartedScreen} />
          <Stack.Screen name="OnboardingLanguage" component={OnboardingLanguageScreen} />
          {/* Employee sign-in: email + phone + password */}
          <Stack.Screen name="Login" component={LoginScreen} />
          {/* PhoneNumber / Password / Otp kept for the OTP flow we switch back to later */}
          <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
          <Stack.Screen name="Password" component={PasswordScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
        </>
      ) : user.role === 'OWNER' ? (
        // Re-key on branch switch so every owner screen refetches for the picked location.
        <Stack.Screen name="OwnerRoot">
          {() => <OwnerStack key={activeBranchId || 'all'} />}
        </Stack.Screen>
      ) : user.role === 'MANAGER' ? (
        <Stack.Screen name="ManagerRoot" component={ManagerStack} />
      ) : (
        <Stack.Screen name="DriverRoot" component={DriverStack} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
