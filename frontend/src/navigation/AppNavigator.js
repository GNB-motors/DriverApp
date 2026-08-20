import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../components/ui/SplashScreen';
import FloatingTabBar from './FloatingTabBar';
import { NAV_ICONS } from './NavIcons';

import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import LoginScreen from '../screens/LoginScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import GetStartedScreen from '../screens/onboarding/GetStartedScreen';
import OnboardingLanguageScreen from '../screens/onboarding/OnboardingLanguageScreen';
import PhoneNumberScreen from '../screens/onboarding/PhoneNumberScreen';
import OtpScreen from '../screens/onboarding/OtpScreen';
import SetPinScreen from '../screens/onboarding/SetPinScreen';
import HomeScreen from '../screens/HomeScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import RefuelDetailsScreen from '../screens/RefuelDetailsScreen';
import UploadPhotosScreen from '../screens/UploadPhotosScreen';
import PhotoPreviewScreen from '../screens/PhotoPreviewScreen';
import VehicleScreen from '../screens/VehicleScreen';
import SOSOptionsScreen from '../screens/SOSOptionsScreen';
import SOSEmergencyActiveScreen from '../screens/SOSEmergencyActiveScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChooseLanguageScreen from '../screens/ChooseLanguageScreen';
import FuelHistoryScreen from '../screens/FuelHistoryScreen';
import RepairsMenuScreen from '../screens/RepairsMenuScreen';
import AddRepairScreen from '../screens/AddRepairScreen';
import RepairLogsScreen from '../screens/RepairLogsScreen';
import RefuelSuccessScreen from '../screens/RefuelSuccessScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import TripsScreen from '../screens/TripsScreen';
import AlertsScreen from '../screens/AlertsScreen';
import MoreScreen from '../screens/MoreScreen';
import WalletScreen from '../screens/WalletScreen';
import AddBillScreen from '../screens/AddBillScreen';
import BillSentScreen from '../screens/BillSentScreen';
import MyAdvancesScreen from '../screens/MyAdvancesScreen';
import ActiveTripScreen from '../screens/ActiveTripScreen';
import TripDetailScreen from '../screens/TripDetailScreen';
import ConsignmentNoteScreen from '../screens/ConsignmentNoteScreen';
import PodScreen from '../screens/PodScreen';
import FuelCaptureScreen from '../screens/FuelCaptureScreen';
import FuelEntryDetailsScreen from '../screens/FuelEntryDetailsScreen';
import FuelSavedScreen from '../screens/FuelSavedScreen';
import FuelLogScreen from '../screens/FuelLogScreen';
import MyDocumentsScreen from '../screens/MyDocumentsScreen';
import RepairsScreen from '../screens/RepairsScreen';
import LogRepairScreen from '../screens/LogRepairScreen';
// Owner + Ops (M8)
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
import OpsHomeScreen from '../screens/owner/OpsHomeScreen';
import OpsTripsScreen from '../screens/owner/OpsTripsScreen';
import OpsTripDetailScreen from '../screens/owner/OpsTripDetailScreen';
import OpsApprovalsScreen from '../screens/owner/OpsApprovalsScreen';
import OpsLoadsScreen from '../screens/owner/OpsLoadsScreen';
import OpsCloseTripScreen from '../screens/owner/OpsCloseTripScreen';
import OpsUnloadingScreen from '../screens/owner/OpsUnloadingScreen';
import OpsDeliveryOrderScreen from '../screens/owner/OpsDeliveryOrderScreen';
import OpsPlacementsScreen from '../screens/owner/OpsPlacementsScreen';
import OpsAdvancesScreen from '../screens/owner/OpsAdvancesScreen';
import { alertCount } from '../demo/mock';

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

// Driver tabs: Home · Vehicles · [Trips FAB] · Alerts · More
function BottomTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} showFab />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Vehicles" component={VehiclesScreen} options={{ tabBarLabel: 'Vehicles' }} />
      <Tab.Screen name="Trips" component={TripsScreen} options={{ tabBarLabel: 'Trips' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarLabel: 'Alerts', tabBarBadge: alertCount || undefined }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: 'More' }} />
    </Tab.Navigator>
  );
}

// Field agent: floating bar, Home · Profile, no FAB
function FieldAgentTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('home', 'tabName') || 'Home' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('profile', 'title') || 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { language, isLoaded } = useLanguage();
  const { user, loading: authLoading, isNewLogin } = useAuth();

  if (!isLoaded || authLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="GetStarted" component={GetStartedScreen} />
          <Stack.Screen name="OnboardingLanguage" component={OnboardingLanguageScreen} />
          <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
          <Stack.Screen name="SetPin" component={SetPinScreen} />
        </>
      ) : (
        <>
          {isNewLogin && <Stack.Screen name="Welcome" component={WelcomeScreen} />}
          <Stack.Screen
            name="Main"
            component={user?.role === 'FIELD_AGENT' ? FieldAgentTabs : BottomTabs}
          />
          <Stack.Screen name="DocsScreen" component={DocumentsScreen} />
          <Stack.Screen name="MyDocuments" component={MyDocumentsScreen} />
          <Stack.Screen name="LanguageScreen" component={ChooseLanguageScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
          <Stack.Screen
            name="Vehicle"
            component={VehicleScreen}
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="RefuelDetails" component={RefuelDetailsScreen} />
          <Stack.Screen name="UploadPhotos" component={UploadPhotosScreen} />
          <Stack.Screen name="PhotoPreview" component={PhotoPreviewScreen} />
          <Stack.Screen
            name="RefuelSuccess"
            component={RefuelSuccessScreen}
            options={{ gestureEnabled: false, animation: 'fade' }}
          />
          <Stack.Screen name="FuelHistory" component={FuelHistoryScreen} />
          <Stack.Screen name="AddRepair" component={AddRepairScreen} />
          <Stack.Screen name="RepairLogs" component={RepairLogsScreen} />
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

          {/* Owner + Ops (M8) */}
          <Stack.Screen name="OwnerApprovals" component={OwnerApprovalsScreen} />
          <Stack.Screen name="OwnerBillDetail" component={OwnerBillDetailScreen} />
          <Stack.Screen name="OwnerReject" component={OwnerRejectScreen} />
          <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
          <Stack.Screen name="OwnerMoney" component={OwnerMoneyScreen} />
          <Stack.Screen name="OwnerDriver" component={OwnerDriverScreen} />
          <Stack.Screen name="OwnerSaleBills" component={OwnerSaleBillsScreen} />
          <Stack.Screen name="OwnerFleet" component={OwnerFleetScreen} />
          <Stack.Screen name="OwnerErp" component={OwnerErpScreen} />
          <Stack.Screen name="OwnerLedger" component={OwnerLedgerScreen} />
          <Stack.Screen name="OpsHome" component={OpsHomeScreen} />
          <Stack.Screen name="OpsTrips" component={OpsTripsScreen} />
          <Stack.Screen name="OpsTripDetail" component={OpsTripDetailScreen} />
          <Stack.Screen name="OpsApprovals" component={OpsApprovalsScreen} />
          <Stack.Screen name="OpsLoads" component={OpsLoadsScreen} />
          <Stack.Screen name="OpsCloseTrip" component={OpsCloseTripScreen} />
          <Stack.Screen name="OpsUnloading" component={OpsUnloadingScreen} />
          <Stack.Screen name="OpsDeliveryOrder" component={OpsDeliveryOrderScreen} />
          <Stack.Screen name="OpsPlacements" component={OpsPlacementsScreen} />
          <Stack.Screen name="OpsAdvances" component={OpsAdvancesScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
