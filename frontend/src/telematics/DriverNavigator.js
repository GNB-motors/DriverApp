import { UnavailableScreen, useExperienceCopy } from './experience/ExperienceUI';
import { NavigateScreen, CaptureScreen } from './experience/DriverNavigation';
import { DriverMoreExperience, DriverTripsExperience } from './experience/ExperienceHub';
import { ExperienceInbox } from './experience/ExperienceExtras';
import { driverExperienceRoutes } from './experience/routes';
import { DriverCrewScreen } from "./screens/CrewScreens";
import { ErpTripsScreen, ErpTripScreen } from './screens/ErpTripsScreen';
import StopReasonsScreen from './screens/StopReasonsScreen';
import { Messages, Conversation } from './screens/OwnerCommunicationScreens';
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../components/ui';
import CurvedTabBar from '../navigation/CurvedTabBar';
import { QuickAddIcon } from '../navigation/NavIcons';
import { useAuth } from '../context/AuthContext';
import { TelematicsApiProvider } from './context/TelematicsApiContext';
import { DriverDataProvider, useDriverData } from './context/DriverDataContext';
import * as Screens from './screens/DriverScreens';
import * as Operations from './workflows/OperationalScreens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const icons = { Navigate: 'navigate-circle-outline', Trips: 'navigate-outline', Inbox: 'notifications-outline', More: 'grid-outline' };
function DriverTabBar(props) {
  const c = useExperienceCopy();
  const { data } = useDriverData();
  const unread = data?.unreadCount || 0;
  return <CurvedTabBar {...props} badges={{ Inbox: unread }} centerAction={{ label: c('captureLabel'), onPress: () => props.navigation.getParent().navigate('Capture'), icon: <QuickAddIcon /> }} />;
}
function DriverTabs() {
  const c = useExperienceCopy();
  return <Tab.Navigator tabBar={(props) => <DriverTabBar {...props} />} screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} /> })}>
    <Tab.Screen name="Navigate" component={NavigateScreen} options={{ tabBarLabel: c('navigationLabel') }} />
    <Tab.Screen name="Trips" component={DriverTripsExperience} options={{ tabBarLabel: c('trips') }} />
    <Tab.Screen name="Inbox" component={ExperienceInbox} options={{ tabBarLabel: c('inboxLabel') }} />
    <Tab.Screen name="More" component={DriverMoreExperience} options={{ tabBarLabel: c('moreLabel') }} />
  </Tab.Navigator>;
}
export default function DriverNavigator() {
  const { user } = useAuth();
  const orgId = typeof user.orgId === 'object' ? user.orgId?._id : user.orgId;
  const identity = `${user._id}:${orgId}`;
  return <TelematicsApiProvider key={identity} identity={identity}><DriverDataProvider><Stack.Navigator initialRouteName="Driver tabs" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    {Object.entries(driverExperienceRoutes).filter(([name]) => name !== 'Experience inbox').map(([name, component]) => <Stack.Screen key={name} name={name} component={component} />)}
    <Stack.Screen name="Capture" component={CaptureScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="Helpful cards" component={UnavailableScreen} />
    <Stack.Screen name="Manager action detail" component={UnavailableScreen} />
    <Stack.Screen name="Recorded trips" component={Screens.DriverTrips} />
    <Stack.Screen name="Existing tools" component={Screens.DriverMore} />
    <Stack.Screen name="Existing alerts" component={Screens.DriverInbox} />
    <Stack.Screen name="Home" component={Screens.DriverHome} />
    <Stack.Screen name="Crew & driving" component={DriverCrewScreen} />
    <Stack.Screen name="Driver tabs" component={DriverTabs} />
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
    <Stack.Screen name="Documents" component={Operations.RecordList} initialParams={{ kind: 'documents' }} />
    <Stack.Screen name="My papers" component={Operations.RecordList} initialParams={{ kind: 'documents' }} />
    <Stack.Screen name="Document detail" component={Operations.RecordDetail} />
    <Stack.Screen name="Location sharing" component={Screens.LocationSharing} />
    <Stack.Screen name="Profile" component={Screens.Profile} />
    <Stack.Screen name="SOS" component={Screens.SosUnavailable} options={{ presentation: 'modal' }} />
    <Stack.Screen name="Site card" component={UnavailableScreen} />
    <Stack.Screen name="At-wheel handover" component={DriverCrewScreen} />
  </Stack.Navigator></DriverDataProvider></TelematicsApiProvider>;
}
