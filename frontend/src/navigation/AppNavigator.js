import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../components/ui/SplashScreen';
import FloatingTabBar from './FloatingTabBar';

// ── Existing screens ────────────────────────────────────────────────────────
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
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

// ── Driver ERP screens (Phase 2) ────────────────────────────────────────────
// Lazy-imported so they don't bloat the initial bundle for non-driver roles.
// Replace with real imports once files exist.
let ActiveTripScreen, CnUploadScreen, PodSubmitScreen;
try { ActiveTripScreen = require('../screens/driver/ActiveTripScreen').default; } catch { ActiveTripScreen = null; }
try { CnUploadScreen = require('../screens/driver/CnUploadScreen').default; } catch { CnUploadScreen = null; }
try { PodSubmitScreen = require('../screens/driver/PodSubmitScreen').default; } catch { PodSubmitScreen = null; }

// ── Manager/Ops ERP screens (Phase 3 & 4) ──────────────────────────────────
let ManagerHomeScreen, TripListScreen, TripDetailScreen, TripCloseScreen,
    ApprovalsScreen, PlacementsScreen, PlacementDetailScreen,
    DeliveryOrdersScreen, AdvancesScreen, ConsignmentsScreen,
    PodsScreen, UnloadingScreen, UnloadingFormScreen;
try { ManagerHomeScreen = require('../screens/manager/ManagerHomeScreen').default; } catch { ManagerHomeScreen = null; }
try { TripListScreen = require('../screens/manager/TripListScreen').default; } catch { TripListScreen = null; }
try { TripDetailScreen = require('../screens/manager/TripDetailScreen').default; } catch { TripDetailScreen = null; }
try { TripCloseScreen = require('../screens/manager/TripCloseScreen').default; } catch { TripCloseScreen = null; }
try { ApprovalsScreen = require('../screens/manager/ApprovalsScreen').default; } catch { ApprovalsScreen = null; }
try { PlacementsScreen = require('../screens/manager/PlacementsScreen').default; } catch { PlacementsScreen = null; }
try { PlacementDetailScreen = require('../screens/manager/PlacementDetailScreen').default; } catch { PlacementDetailScreen = null; }
try { DeliveryOrdersScreen = require('../screens/manager/DeliveryOrdersScreen').default; } catch { DeliveryOrdersScreen = null; }
try { AdvancesScreen = require('../screens/manager/AdvancesScreen').default; } catch { AdvancesScreen = null; }
try { ConsignmentsScreen = require('../screens/manager/ConsignmentsListScreen').default; } catch { ConsignmentsScreen = null; }
try { PodsScreen = require('../screens/manager/PodsScreen').default; } catch { PodsScreen = null; }
try { UnloadingScreen = require('../screens/manager/UnloadingScreen').default; } catch { UnloadingScreen = null; }
try { UnloadingFormScreen = require('../screens/manager/UnloadingFormScreen').default; } catch { UnloadingFormScreen = null; }

// ── Owner ERP screens (Phase 5) ─────────────────────────────────────────────
let OwnerDashboardScreen, FinanceScreen, ErpOverviewScreen,
    DeliveryOrderFormScreen, PlacementFormScreen, SaleBillsScreen, LedgerScreen;
try { OwnerDashboardScreen = require('../screens/owner/OwnerDashboardScreen').default; } catch { OwnerDashboardScreen = null; }
try { FinanceScreen = require('../screens/owner/FinanceScreen').default; } catch { FinanceScreen = null; }
try { ErpOverviewScreen = require('../screens/owner/ErpOverviewScreen').default; } catch { ErpOverviewScreen = null; }
try { DeliveryOrderFormScreen = require('../screens/owner/DeliveryOrderFormScreen').default; } catch { DeliveryOrderFormScreen = null; }
try { PlacementFormScreen = require('../screens/owner/PlacementFormScreen').default; } catch { PlacementFormScreen = null; }
try { SaleBillsScreen = require('../screens/owner/SaleBillsScreen').default; } catch { SaleBillsScreen = null; }
try { LedgerScreen = require('../screens/owner/LedgerScreen').default; } catch { LedgerScreen = null; }

// ── Shared screens (Phase 6) ────────────────────────────────────────────────
let NotificationsScreen;
try { NotificationsScreen = require('../screens/shared/NotificationsScreen').default; } catch { NotificationsScreen = null; }

// ── Placeholder for screens not yet built ───────────────────────────────────
import { View, Text } from 'react-native';
function PlaceholderScreen({ route }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F5' }}>
      <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: '#61716C' }}>
        {route?.name || 'Screen'} — coming soon
      </Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Shared tab icon resolver ─────────────────────────────────────────────────
const tabIcon = (routeName) => ({ focused, color, size }) => {
  const map = {
    Home:       focused ? 'home'            : 'home-outline',
    Repairs:    focused ? 'build'           : 'build-outline',
    Documents:  focused ? 'document-text'   : 'document-text-outline',
    Profile:    focused ? 'person'          : 'person-outline',
    // Manager tabs
    Trips:      focused ? 'map'             : 'map-outline',
    Approvals:  focused ? 'checkmark-done'  : 'checkmark-done-outline',
    More:       focused ? 'grid'            : 'grid-outline',
    // Owner tabs
    Dashboard:  focused ? 'speedometer'     : 'speedometer-outline',
    Finance:    focused ? 'wallet'          : 'wallet-outline',
    Fleet:      focused ? 'car'             : 'car-outline',
    ERP:        focused ? 'layers'          : 'layers-outline',
  };
  return <Ionicons name={map[routeName] || 'ellipse-outline'} size={size} color={color} />;
};

// ── DRIVER tabs: Home · Repairs · [Refuel FAB] · Docs · Profile ─────────────
function BottomTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} showFab />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}       options={{ tabBarLabel: t('home', 'tabName') || 'Home' }} />
      <Tab.Screen name="Repairs"   component={RepairsMenuScreen} options={{ tabBarLabel: t('repairs', 'tabName') || 'Repairs' }} />
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

// ── FIELD AGENT tabs: Home · Profile ────────────────────────────────────────
function FieldAgentTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ tabBarLabel: t('home', 'tabName') || 'Home' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('profile', 'title') || 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── MANAGER / OPS_EXECUTIVE tabs: Home · Trips · Approvals · More ────────────
// Both MANAGER and OPS_EXECUTIVE roles share this exact navigator.
function ManagerTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
    >
      <Tab.Screen
        name="Home"
        component={ManagerHomeScreen || PlaceholderScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Trips"
        component={TripListScreen || PlaceholderScreen}
        options={{ tabBarLabel: 'Trips' }}
      />
      <Tab.Screen
        name="Approvals"
        component={ApprovalsScreen || PlaceholderScreen}
        options={{ tabBarLabel: 'Approvals' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// ── OWNER tabs: Dashboard · Finance · Fleet · ERP · Profile ─────────────────
function OwnerTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
    >
      <Tab.Screen
        name="Dashboard"
        component={OwnerDashboardScreen || PlaceholderScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceScreen || PlaceholderScreen}
        options={{ tabBarLabel: 'Finance' }}
      />
      <Tab.Screen
        name="Fleet"
        component={PlaceholderScreen}
        options={{ tabBarLabel: 'Fleet' }}
      />
      <Tab.Screen
        name="ERP"
        component={ErpOverviewScreen || PlaceholderScreen}
        options={{ tabBarLabel: 'ERP' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// ── Role → Tab Navigator mapping ─────────────────────────────────────────────
function resolveMainTabs(role) {
  if (role === 'OWNER')                              return OwnerTabs;
  if (role === 'MANAGER' || role === 'OPS_EXECUTIVE') return ManagerTabs;
  if (role === 'FIELD_AGENT')                         return FieldAgentTabs;
  return BottomTabs; // DRIVER and fallback
}

// ── Root Navigator ───────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isLoaded } = useLanguage();
  const { user, loading: authLoading, isNewLogin } = useAuth();

  if (!isLoaded || authLoading) {
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

          {/* ── Main tab navigator (role-resolved) ── */}
          <Stack.Screen name="Main" component={MainTabs} />

          {/* ── Shared stack screens ── */}
          <Stack.Screen name="LanguageScreen"    component={ChooseLanguageScreen} />
          <Stack.Screen name="Notifications"     component={NotificationsScreen || PlaceholderScreen} />

          {/* ── Driver screens ── */}
          <Stack.Screen name="DocsScreen"        component={DocumentsScreen} />
          <Stack.Screen name="Vehicle"           component={VehicleScreen}           options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="RefuelDetails"     component={RefuelDetailsScreen} />
          <Stack.Screen name="UploadPhotos"      component={UploadPhotosScreen} />
          <Stack.Screen name="PhotoPreview"      component={PhotoPreviewScreen} />
          <Stack.Screen name="RefuelSuccess"     component={RefuelSuccessScreen}     options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="FuelHistory"       component={FuelHistoryScreen} />
          <Stack.Screen name="AddRepair"         component={AddRepairScreen} />
          <Stack.Screen name="RepairLogs"        component={RepairLogsScreen} />
          <Stack.Screen name="SOSOptions"        component={SOSOptionsScreen}        options={{ presentation: 'transparentModal' }} />
          <Stack.Screen name="SOSEmergencyActive" component={SOSEmergencyActiveScreen} options={{ presentation: 'fullScreenModal' }} />

          {/* ── Driver ERP screens (Phase 2) ── */}
          <Stack.Screen name="ActiveTrip"        component={ActiveTripScreen  || PlaceholderScreen} />
          <Stack.Screen name="CnUpload"          component={CnUploadScreen    || PlaceholderScreen} />
          <Stack.Screen name="PodSubmit"         component={PodSubmitScreen   || PlaceholderScreen} />

          {/* ── Manager/Ops ERP screens (Phase 3 & 4) ── */}
          <Stack.Screen name="TripDetail"        component={TripDetailScreen       || PlaceholderScreen} />
          <Stack.Screen name="TripClose"         component={TripCloseScreen        || PlaceholderScreen} />
          <Stack.Screen name="PlacementDetail"   component={PlacementDetailScreen  || PlaceholderScreen} />
          <Stack.Screen name="PlacementsAll"     component={PlacementsScreen       || PlaceholderScreen} />
          <Stack.Screen name="DeliveryOrders"    component={DeliveryOrdersScreen   || PlaceholderScreen} />
          <Stack.Screen name="Advances"          component={AdvancesScreen         || PlaceholderScreen} />
          <Stack.Screen name="Consignments"      component={ConsignmentsScreen     || PlaceholderScreen} />
          <Stack.Screen name="Pods"              component={PodsScreen             || PlaceholderScreen} />
          <Stack.Screen name="UnloadingList"     component={UnloadingScreen        || PlaceholderScreen} />
          <Stack.Screen name="UnloadingForm"     component={UnloadingFormScreen    || PlaceholderScreen} />

          {/* ── Owner ERP screens (Phase 5) ── */}
          <Stack.Screen name="SaleBills"         component={SaleBillsScreen        || PlaceholderScreen} />
          <Stack.Screen name="Ledger"            component={LedgerScreen           || PlaceholderScreen} />
          <Stack.Screen name="DoForm"            component={DeliveryOrderFormScreen || PlaceholderScreen} />
          <Stack.Screen name="PlacementForm"     component={PlacementFormScreen    || PlaceholderScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
