import { FleetCrewScreen } from "./screens/CrewScreens";
import { OwnerCaptures } from "./screens/OwnerReportScreens";
import TeamAccessScreen from './screens/TeamAccessScreen';
import { OwnerReportSection, OwnerReport, OwnerReportRows, OwnerRecord, OwnerFinance, OwnerTrends, ReportSettings, OwnerEscalations, OwnerEscalation, OwnerCalls, OwnerTripList } from './screens/OwnerReportScreens';
import { Messages, NewConversation, Conversation } from './screens/OwnerCommunicationScreens';
import useOwnerRequest from './hooks/useOwnerRequest';
import DefLedgerScreen from './screens/DefLedgerScreen';
import HistoricalTripScreen from './screens/HistoricalTripScreen';
import * as Operations from './workflows/FleetOperationalScreens';
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../components/ui';
import CurvedTabBar from '../navigation/CurvedTabBar';
import { useAuth } from '../context/AuthContext';
import { TelematicsApiProvider } from './context/TelematicsApiContext';
import { ManagerDataProvider, useManagerData } from './context/ManagerDataContext';
import * as Screens from './screens/ManagerScreens';
import * as Owner from './screens/OwnerScreens';
import FleetMapScreen from './screens/FleetMapScreen';
const Tab = createBottomTabNavigator(); const Stack = createNativeStackNavigator();
const icons = { Today: 'sunny-outline', Live: 'map-outline', Fleet: 'bus-outline', Alerts: 'notifications-outline', More: 'grid-outline' };
function OwnerTabs() {
  const { service, branchId } = useManagerData();
  const inbox = useOwnerRequest(`owner-tab-inbox:${branchId}`, () => service.ownerEscalations(branchId === 'all' ? undefined : branchId), 60000);
  const unread = inbox.data?.activeCount;
  return <Tab.Navigator tabBar={(props) => <CurvedTabBar {...props} />} screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} /> })}>
    <Tab.Screen name="Today" component={OwnerReport} />
    <Tab.Screen name="Live" component={Screens.ManagerLive} />
    <Tab.Screen name="Fleet" component={Screens.Fleet} />
    <Tab.Screen name="Alerts" component={OwnerEscalations} options={{ tabBarBadge: unread || undefined }} />
    <Tab.Screen name="More" component={Owner.More} />
  </Tab.Navigator>;
}
export default function OwnerNavigator() {
  const { user } = useAuth();
  const orgId = typeof user.orgId === 'object' ? user.orgId?._id : user.orgId;
  const identity = `${user._id}:${orgId}:owner`;
  return <TelematicsApiProvider key={identity} identity={identity} audience="owner"><ManagerDataProvider audience="owner"><Stack.Navigator initialRouteName="Owner tabs" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="Crew & driving" component={FleetCrewScreen} />
    <Stack.Screen name="Owner tabs" component={OwnerTabs} />
    <Stack.Screen name="Fleet" component={Screens.Fleet} />
    <Stack.Screen name="Fleet map" component={FleetMapScreen} options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    <Stack.Screen name="Vehicle detail" component={Screens.VehicleDetail} />
    <Stack.Screen name="Driver detail" component={Screens.DriverDetail} />
    <Stack.Screen name="Duty board" component={Operations.DriverRoster} />
    <Stack.Screen name="Truck handover" component={Operations.Handover} />
    <Stack.Screen name="Manager alert" component={Screens.AlertDetail} />
    <Stack.Screen name="Fuel review" component={Operations.FleetRecords} />
    <Stack.Screen name="Maintenance" component={Operations.FleetRecords} />
    <Stack.Screen name="New maintenance record" component={Operations.NewMaintenance} />
    <Stack.Screen name="Review detail" component={Operations.FleetRecordDetail} />
    <Stack.Screen name="Fleet documents" component={Operations.FleetRecords} />
    <Stack.Screen name="Manager document" component={Operations.FleetRecordDetail} />
    <Stack.Screen name="Fleet trips" component={OwnerTripList} />
    <Stack.Screen name="Manager trip" component={HistoricalTripScreen} />
    <Stack.Screen name="Drivers" component={Operations.DriverRoster} />
    <Stack.Screen name="Digest" component={OwnerReport} />
    <Stack.Screen name="Owner report" component={OwnerReport} />
    <Stack.Screen name="Owner report section" component={OwnerReportSection} />
    <Stack.Screen name="Owner report rows" component={OwnerReportRows} />
    <Stack.Screen name="Owner record" component={OwnerRecord} />
    <Stack.Screen name="Owner finance" component={OwnerFinance} />
    <Stack.Screen name="Owner trends" component={OwnerTrends} />
    <Stack.Screen name="Report settings" component={ReportSettings} />
    <Stack.Screen name="Owner escalations" component={OwnerEscalations} />
    <Stack.Screen name="Owner escalation" component={OwnerEscalation} />
    <Stack.Screen name="Owner calls" component={OwnerCalls} />
    <Stack.Screen name="Messages" component={Messages} />
    <Stack.Screen name="New conversation" component={NewConversation} />
    <Stack.Screen name="Conversation" component={Conversation} />
    <Stack.Screen name="Fuel & AdBlue" component={DefLedgerScreen} />
    <Stack.Screen name="Branch overview" component={Owner.BranchOverview} />
    <Stack.Screen name="Capture reviews" component={OwnerCaptures} />
    <Stack.Screen name="Team & access" component={TeamAccessScreen} />
    <Stack.Screen name="Owner settings" component={Screens.Settings} />
  </Stack.Navigator></ManagerDataProvider></TelematicsApiProvider>;
}
