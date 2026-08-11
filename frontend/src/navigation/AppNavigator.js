import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { useErp } from '../context/ErpContext';
import SplashScreen from '../components/ui/SplashScreen';
import FloatingTabBar from './FloatingTabBar';

// ── Core screens ────────────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
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

// ── Driver ERP ──────────────────────────────────────────────────────────────
// Direct imports. These were previously wrapped in try/require with a
// PlaceholderScreen fallback, which silently swallowed real import errors — a
// screen with a broken import rendered "coming soon" instead of failing loudly.
import ActiveTripScreen from '../screens/driver/ActiveTripScreen';
import CnUploadScreen from '../screens/driver/CnUploadScreen';
import PodSubmitScreen from '../screens/driver/PodSubmitScreen';
import MyTripsScreen from '../screens/driver/MyTripsScreen';
import MyAdvancesScreen from '../screens/driver/MyAdvancesScreen';
import MyKhataScreen from '../screens/driver/MyKhataScreen';
import AddExpenseScreen from '../screens/driver/AddExpenseScreen';

// ── Manager / Ops ERP ───────────────────────────────────────────────────────
import ManagerHomeScreen from '../screens/manager/ManagerHomeScreen';
import TripListScreen from '../screens/manager/TripListScreen';
import TripDetailScreen from '../screens/manager/TripDetailScreen';
import TripCloseScreen from '../screens/manager/TripCloseScreen';
import ApprovalsScreen from '../screens/manager/ApprovalsScreen';
import PlacementsScreen from '../screens/manager/PlacementsScreen';
import PlacementDetailScreen from '../screens/manager/PlacementDetailScreen';
import DeliveryOrdersScreen from '../screens/manager/DeliveryOrdersScreen';
import AdvancesScreen from '../screens/manager/AdvancesScreen';
import ConsignmentsListScreen from '../screens/manager/ConsignmentsListScreen';
import PodsScreen from '../screens/manager/PodsScreen';
import UnloadingScreen from '../screens/manager/UnloadingScreen';
import UnloadingFormScreen from '../screens/manager/UnloadingFormScreen';

// ── Owner ERP ───────────────────────────────────────────────────────────────
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import FinanceScreen from '../screens/owner/FinanceScreen';
import ErpOverviewScreen from '../screens/owner/ErpOverviewScreen';
import SaleBillsScreen from '../screens/owner/SaleBillsScreen';
import LedgerScreen from '../screens/owner/LedgerScreen';

// ── Shared ──────────────────────────────────────────────────────────────────
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import UnsupportedRoleScreen from '../screens/shared/UnsupportedRoleScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab icons ───────────────────────────────────────────────────────────────
const ICONS = {
  Home:      ['home', 'home-outline'],
  Repairs:   ['build', 'build-outline'],
  Documents: ['document-text', 'document-text-outline'],
  Profile:   ['person', 'person-outline'],
  Trips:     ['map', 'map-outline'],
  Approvals: ['checkmark-done', 'checkmark-done-outline'],
  Dashboard: ['speedometer', 'speedometer-outline'],
  Finance:   ['wallet', 'wallet-outline'],
  ERP:       ['layers', 'layers-outline'],
};

const tabIcon = (routeName) => ({ focused, color, size }) => {
  const [on, off] = ICONS[routeName] || ['ellipse', 'ellipse-outline'];
  return <Ionicons name={focused ? on : off} size={size} color={color} />;
};

const tabScreenOptions = ({ route }) => ({
  headerShown: false,
  tabBarIcon: tabIcon(route.name),
});

// ── DRIVER: Home · Repairs · [Refuel FAB] · Docs · Profile ──────────────────
function DriverTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} showFab />}
      screenOptions={tabScreenOptions}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('home', 'tabName') || 'Home' }} />
      <Tab.Screen name="Repairs" component={RepairsMenuScreen} options={{ tabBarLabel: t('repairs', 'tabName') || 'Repairs' }} />
      <Tab.Screen
        name="Documents"
        component={DocumentsScreen}
        initialParams={{ docType: 'PERSONAL' }}
        options={{ tabBarLabel: 'Docs' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('profile', 'title') || 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── FIELD AGENT: Home · Profile ─────────────────────────────────────────────
function FieldAgentTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('home', 'tabName') || 'Home' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('profile', 'title') || 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── MANAGER / OPS_EXECUTIVE: Home · Trips · Approvals · Profile ─────────────
function ManagerTabs() {
  const { can } = useAccess();
  const { pendingApprovalsCount } = useErp();

  return (
    <Tab.Navigator tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={ManagerHomeScreen} options={{ tabBarLabel: 'Home' }} />
      {can('trips.view') && (
        <Tab.Screen name="Trips" component={TripListScreen} options={{ tabBarLabel: 'Trips' }} />
      )}
      {can('approvals.view') && (
        <Tab.Screen
          name="Approvals"
          component={ApprovalsScreen}
          options={{
            tabBarLabel: 'Approvals',
            // Badge count comes from ErpContext's poll. Undefined hides it.
            tabBarBadge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
          }}
        />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── OWNER: Dashboard · Finance · Operations · Profile ───────────────────────
// The old "Fleet" tab pointed at a PlaceholderScreen — an empty promise in the
// primary nav. It is dropped until the fleet screens exist (see plan phase 7);
// Operations covers what the app can actually do today.
function OwnerTabs() {
  const { can } = useAccess();
  const { pendingApprovalsCount } = useErp();

  return (
    <Tab.Navigator tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      {can('finance.view') && (
        <Tab.Screen name="Finance" component={FinanceScreen} options={{ tabBarLabel: 'Finance' }} />
      )}
      <Tab.Screen name="ERP" component={ErpOverviewScreen} options={{ tabBarLabel: 'Operations' }} />
      {can('approvals.view') && (
        <Tab.Screen
          name="Approvals"
          component={ApprovalsScreen}
          options={{
            tabBarLabel: 'Approvals',
            tabBarBadge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
          }}
        />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── APPROVER: Approvals · Profile ───────────────────────────────────────────
// APPROVER exists purely to decide approval requests, so that is the whole app
// for them. Previously they fell through to the driver tabs.
function ApproverTabs() {
  const { pendingApprovalsCount } = useErp();
  return (
    <Tab.Navigator tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Approvals"
        component={ApprovalsScreen}
        options={{
          tabBarLabel: 'Approvals',
          tabBarBadge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── ACCOUNTS: Finance · Trips · Profile ─────────────────────────────────────
function AccountsTabs() {
  const { can } = useAccess();
  return (
    <Tab.Navigator tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={tabScreenOptions}>
      {can('finance.view') && (
        <Tab.Screen name="Finance" component={FinanceScreen} options={{ tabBarLabel: 'Finance' }} />
      )}
      {can('trips.view') && (
        <Tab.Screen name="Trips" component={TripListScreen} options={{ tabBarLabel: 'Trips' }} />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── Roles with no mobile experience yet ─────────────────────────────────────
// KAM's call-planning screens are not built (plan phase 6). Falling through to
// the driver tabs, as this used to, showed them a refuel FAB and a repairs tab —
// worse than saying plainly that the app has nothing for them.
function UnsupportedTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={UnsupportedRoleScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function resolveMainTabs(role) {
  switch (role) {
    case 'OWNER':
    case 'SUPER_ADMIN':
      return OwnerTabs;
    case 'MANAGER':
    case 'OPS_EXECUTIVE':
      return ManagerTabs;
    case 'ACCOUNTS':
      return AccountsTabs;
    case 'APPROVER':
      return ApproverTabs;
    case 'FIELD_AGENT':
      return FieldAgentTabs;
    case 'DRIVER':
      return DriverTabs;
    default:
      // An unrecognised role must not silently inherit the driver app.
      return role ? UnsupportedTabs : DriverTabs;
  }
}

export default function AppNavigator() {
  const { isLoaded } = useLanguage();
  const { user, loading: authLoading, isNewLogin } = useAuth();
  const { loading: accessLoading, resolved } = useAccess();

  // Wait for access to resolve before choosing tabs — otherwise a capability-gated
  // tab mounts, then disappears a moment later as flags arrive.
  if (!isLoaded || authLoading || (user && !resolved && accessLoading)) {
    return <SplashScreen />;
  }

  const MainTabs = resolveMainTabs(user?.role);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          {isNewLogin && <Stack.Screen name="Welcome" component={WelcomeScreen} />}

          <Stack.Screen name="Main" component={MainTabs} />

          {/* ── Shared ── */}
          <Stack.Screen name="LanguageScreen" component={ChooseLanguageScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />

          {/* ── Driver core ── */}
          <Stack.Screen name="DocsScreen" component={DocumentsScreen} />
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
          <Stack.Screen
            name="SOSOptions"
            component={SOSOptionsScreen}
            options={{ presentation: 'transparentModal' }}
          />
          <Stack.Screen
            name="SOSEmergencyActive"
            component={SOSEmergencyActiveScreen}
            options={{ presentation: 'fullScreenModal' }}
          />

          {/* ── Driver ERP ── */}
          <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
          <Stack.Screen name="CnUpload" component={CnUploadScreen} />
          <Stack.Screen name="PodSubmit" component={PodSubmitScreen} />
          <Stack.Screen name="MyTrips" component={MyTripsScreen} />
          <Stack.Screen name="MyAdvances" component={MyAdvancesScreen} />
          <Stack.Screen name="MyKhata" component={MyKhataScreen} />
          <Stack.Screen name="AddExpense" component={AddExpenseScreen} />

          {/* ── Manager / Ops ERP ──
                 `TripList` is the stack copy of the trip board. Manager and Ops
                 reach the board as a tab ("Trips"); Owner and Accounts reach it
                 from a list row, and a tab name is not navigable from outside its
                 own navigator — hence both registrations. */}
          <Stack.Screen name="TripList" component={TripListScreen} />
          <Stack.Screen name="TripDetail" component={TripDetailScreen} />
          <Stack.Screen name="TripClose" component={TripCloseScreen} />
          <Stack.Screen name="PlacementsAll" component={PlacementsScreen} />
          <Stack.Screen name="PlacementDetail" component={PlacementDetailScreen} />
          <Stack.Screen name="DeliveryOrders" component={DeliveryOrdersScreen} />
          <Stack.Screen name="Advances" component={AdvancesScreen} />
          <Stack.Screen name="Consignments" component={ConsignmentsListScreen} />
          <Stack.Screen name="Pods" component={PodsScreen} />
          <Stack.Screen name="UnloadingList" component={UnloadingScreen} />
          <Stack.Screen name="UnloadingForm" component={UnloadingFormScreen} />

          {/* ── Finance / billing. Also reachable as Owner tabs; registering them
                 here too lets Manager and Accounts open them from a list. ── */}
          <Stack.Screen name="SaleBills" component={SaleBillsScreen} />
          <Stack.Screen name="Ledger" component={LedgerScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
