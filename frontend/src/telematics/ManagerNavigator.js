import { Messages, Conversation, NewConversation } from './screens/OwnerCommunicationScreens';
import { UnavailableScreen, useExperienceCopy } from './experience/ExperienceUI';
import { ManagerActionHome, ActionDetail, DriverTimeline, ManagerLiveSurface, ManagerReviews, ManagerDriverDetail } from './experience/ManagerActions';
import { ManagerMoreExperience } from './experience/ExperienceHub';
import { reviewExperienceRoutes } from './experience/routes';
import { FleetCrewScreen } from "./screens/CrewScreens";
import DefLedgerScreen from './screens/DefLedgerScreen';
import TeamAccessScreen from './screens/TeamAccessScreen';
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
import FleetMapScreen from './screens/FleetMapScreen';
const Tab = createBottomTabNavigator(); const Stack = createNativeStackNavigator();
const icons = { Home: 'home-outline', Live: 'map-outline', Drivers: 'people-outline', Alerts: 'notifications-outline', More: 'grid-outline' };
function ManagerTabs() {
  const c = useExperienceCopy();
  const { data } = useManagerData();
  const unread = data?.alertFeed?.unacknowledgedCount || 0;
  return <Tab.Navigator tabBar={(props) => <CurvedTabBar {...props} />} screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} /> })}>
    <Tab.Screen name="Home" component={ManagerActionHome} options={{ tabBarLabel: c('home') }} />
    <Tab.Screen name="Live" component={ManagerLiveSurface} options={{ tabBarLabel: c('live') }} />
    <Tab.Screen name="Drivers" component={Operations.DriverRoster} options={{ tabBarLabel: c('drivers') }} />
    <Tab.Screen name="Alerts" component={Screens.Alerts} options={{ tabBarBadge: unread || undefined }} />
    <Tab.Screen name="More" component={ManagerMoreExperience} options={{ tabBarLabel: c('moreLabel') }} />
  </Tab.Navigator>;
}
export default function ManagerNavigator() {
  const { user } = useAuth();
  const orgId = typeof user.orgId === 'object' ? user.orgId?._id : user.orgId;
  const identity = `${user._id}:${orgId}:manager`;
  return <TelematicsApiProvider key={identity} identity={identity} audience="manager"><ManagerDataProvider><Stack.Navigator initialRouteName="Manager tabs" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    {Object.entries(reviewExperienceRoutes).map(([name, component]) => <Stack.Screen key={name} name={name} component={component} />)}
    <Stack.Screen name="Manager action detail" component={ActionDetail} />
    <Stack.Screen name="Driver timeline" component={DriverTimeline} />
    <Stack.Screen name="Messages" component={Messages} />
    <Stack.Screen name="Conversation" component={Conversation} />
    <Stack.Screen name="New conversation" component={NewConversation} />
    <Stack.Screen name="Driver assignments" component={Operations.DriverRoster} />
    <Stack.Screen name="Fleet overview" component={Screens.ManagerHome} />
    <Stack.Screen name="Live records" component={Screens.ManagerLive} />
    <Stack.Screen name="Fleet essentials" component={Screens.More} />
    <Stack.Screen name="Crew & driving" component={FleetCrewScreen} />
    <Stack.Screen name="Manager tabs" component={ManagerTabs} />
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
    <Stack.Screen name="Fleet trips" component={Screens.Trips} />
    <Stack.Screen name="Manager trip" component={HistoricalTripScreen} />
    <Stack.Screen name="AdBlue / DEF" component={DefLedgerScreen} />
    <Stack.Screen name="Team & access" component={TeamAccessScreen} />
    <Stack.Screen name="Manager settings" component={Screens.Settings} />
    <Stack.Screen name="SOS centre" component={UnavailableScreen} />
    <Stack.Screen name="SOS detail" component={UnavailableScreen} />
    <Stack.Screen name="Manager approvals" component={ManagerReviews} />
    <Stack.Screen name="Crew management" component={FleetCrewScreen} />
    <Stack.Screen name="Manager driver detail" component={ManagerDriverDetail} />
  </Stack.Navigator></ManagerDataProvider></TelematicsApiProvider>;
}
