import { UnavailableScreen } from './experience/ExperienceUI';
import { CaptureScreen } from './experience/DriverNavigation';
import { driverExperienceRoutes } from './experience/routes';
import { SiteCard, HelpfulCards } from './screens/DriverServices';
import { DriverCrewScreen } from "./screens/CrewScreens";
import { ErpTripsScreen, ErpTripScreen } from './screens/ErpTripsScreen';
import StopReasonsScreen from './screens/StopReasonsScreen';
import { Messages, Conversation } from './screens/OwnerCommunicationScreens';
import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { TelematicsApiProvider } from './context/TelematicsApiContext';
import { DriverDataProvider, useDriverData } from './context/DriverDataContext';
import * as Screens from './screens/DriverScreens';
import * as Operations from './workflows/OperationalScreens';
import { DriverWallet, DriverBillForm, DriverBillSent, DriverAdvances } from './screens/DriverWalletScreens';
import { BreakPlanner, NearbyReports, DriverQuestions, CapturePages, MyCaptures, CaptureDetail } from './screens/DriverIntegrationScreens';
import SplashScreen from '../components/ui/SplashScreen';
import { c } from '../driverUi/theme';
import { DriverTabBar } from '../driverUi/shell';
import { DriverSetupProvider, useDriverSetup } from '../driverUi/permissions';
import HomeScreen from '../driverUi/screens/HomeScreen';
import { MoreScreen, ProfileScreen, DocumentsScreen, NavigateSoonScreen } from '../driverUi/screens/MoreScreens';
import { LocationSetupScreen, LocationGuideScreen, LocationReadyScreen, PermissionLostScreen } from '../driverUi/screens/SetupScreens';
import { ReceiptSheet, SosSheet } from '../driverUi/screens/Sheets';
import { LanguageScreen } from '../driverUi/screens/OnboardingScreens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const SHEET = { presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } };

/**
 * Three tabs only: Home · Navigate · More (design "App shell"). After setup,
 * a failed permission check replaces the tabs with screen 08 until fixed.
 */
function DriverTabs({ navigation }) {
  const setup = useDriverSetup();
  if (setup.done && setup.status.checked && !setup.status.ok) return <PermissionLostScreen navigation={navigation} />;
  return <Tab.Navigator tabBar={(props) => <DriverTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Navigate" component={NavigateSoonScreen} />
    <Tab.Screen name="More" component={MoreScreen} />
  </Tab.Navigator>;
}

/**
 * Trips record by themselves (design 05/07), so once setup is done and every
 * check passes, sharing starts if it is not already running. One attempt per
 * permission check — each foreground re-check — so a failing start never loops.
 */
function TrackingKeeper() {
  const setup = useDriverSetup();
  const { tracking } = useDriverData();
  const tried = useRef(null);
  const { status, done } = setup;
  useEffect(() => {
    if (!done || !status.ok || tracking.mode !== 'off' || tracking.busy || tried.current === status) return undefined;
    // Let the sharing hook restore a saved mode first.
    const timer = setTimeout(() => {
      if (AppState.currentState !== 'active') return;
      tried.current = status;
      tracking.start(tracking.canBackground ? 'background' : 'foreground', false).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [done, status, tracking]);
  return null;
}

function DriverStack() {
  const setup = useDriverSetup();
  if (!setup.loaded) return <SplashScreen />;
  return <>
    <TrackingKeeper />
    <Stack.Navigator initialRouteName={setup.done ? 'Driver tabs' : 'Location setup'} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="Driver tabs" component={DriverTabs} />
      <Stack.Screen name="Location setup" component={LocationSetupScreen} />
      <Stack.Screen name="Location guide" component={LocationGuideScreen} />
      <Stack.Screen name="Location ready" component={LocationReadyScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Fuel receipt" component={ReceiptSheet} options={SHEET} />
      <Stack.Screen name="SOS" component={SosSheet} options={SHEET} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="App language" component={LanguageScreen} />
      {Object.entries(driverExperienceRoutes).filter(([name]) => name !== 'Experience inbox').map(([name, component]) => <Stack.Screen key={name} name={name} component={component} />)}
      <Stack.Screen name="Capture" component={CaptureScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Wallet" component={DriverWallet} />
      <Stack.Screen name="AddBill" component={DriverBillForm} />
      <Stack.Screen name="BillSent" component={DriverBillSent} />
      <Stack.Screen name="Advances" component={DriverAdvances} />
      <Stack.Screen name="Break planner" component={BreakPlanner} />
      <Stack.Screen name="Nearby reports" component={NearbyReports} />
      <Stack.Screen name="Driver questions" component={DriverQuestions} />
      <Stack.Screen name="Photo any paper" component={CapturePages} />
      <Stack.Screen name="My captures" component={MyCaptures} />
      <Stack.Screen name="Capture detail" component={CaptureDetail} />
      <Stack.Screen name="Helpful cards" component={HelpfulCards} />
      <Stack.Screen name="Manager action detail" component={UnavailableScreen} />
      <Stack.Screen name="Recorded trips" component={Screens.DriverTrips} />
      <Stack.Screen name="Existing tools" component={Screens.DriverMore} />
      <Stack.Screen name="Existing alerts" component={Screens.DriverInbox} />
      <Stack.Screen name="Home" component={Screens.DriverHome} />
      <Stack.Screen name="Crew & driving" component={DriverCrewScreen} />
      <Stack.Screen name="Messages" component={Messages} />
      <Stack.Screen name="Conversation" component={Conversation} />
      <Stack.Screen name="Quick add" component={Screens.QuickAdd} options={{ presentation: 'modal' }} />
      <Stack.Screen name="My truck" component={Screens.MyTruck} />
      <Stack.Screen name="Change truck" component={Screens.ChangeTruck} />
      <Stack.Screen name="ERP trips" component={ErpTripsScreen} />
      <Stack.Screen name="ERP trip" component={ErpTripScreen} />
      <Stack.Screen name="Trip detail" component={Screens.TripDetail} />
      <Stack.Screen name="Alert detail" component={Screens.AlertDetail} />
      {['Add fuel', 'Report issue', 'Workshop bill', 'Upload document', 'New support ticket', 'Reply to support'].map((name) => <Stack.Screen key={name} name={name} component={Operations.OperationalForm} />)}
      <Stack.Screen name="Explain a stop" component={StopReasonsScreen} />
      <Stack.Screen name="Operation detail" component={Operations.RecordDetail} />
      <Stack.Screen name="Support" component={Operations.RecordList} />
      {['Fuel history', 'My issues', 'Workshop bills'].map((name) => <Stack.Screen key={name} name={name} component={Operations.RecordList} />)}
      <Stack.Screen name="My papers" component={Operations.RecordList} initialParams={{ kind: 'documents' }} />
      <Stack.Screen name="Document detail" component={Operations.RecordDetail} />
      <Stack.Screen name="Location sharing" component={Screens.LocationSharing} />
      <Stack.Screen name="Site card" component={SiteCard} />
      <Stack.Screen name="At-wheel handover" component={DriverCrewScreen} />
    </Stack.Navigator>
  </>;
}

export default function DriverNavigator() {
  const { user } = useAuth();
  const orgId = typeof user.orgId === 'object' ? user.orgId?._id : user.orgId;
  const identity = `${user._id}:${orgId}`;
  return <TelematicsApiProvider key={identity} identity={identity}><DriverDataProvider><DriverSetupProvider userId={user._id}>
    <DriverStack />
  </DriverSetupProvider></DriverDataProvider></TelematicsApiProvider>;
}
