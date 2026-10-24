import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../components/ui';
import CurvedTabBar from '../navigation/CurvedTabBar';
import { QuickAddIcon } from '../navigation/NavIcons';
import { useAuth } from '../context/AuthContext';
import { TelematicsDemoProvider } from './context/TelematicsDemoContext';
import { DriverDataProvider, useDriverData } from './context/DriverDataContext';
import * as Screens from './screens/DriverScreens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const icons = { Home: 'home-outline', Trips: 'navigate-outline', Inbox: 'notifications-outline', More: 'grid-outline' };
function DriverTabBar(props) {
  const { data } = useDriverData();
  const unread = data?.alerts.filter((alert) => !alert.acknowledged).length || 0;
  return <CurvedTabBar {...props} badges={{ Inbox: unread }} centerAction={{ label: 'Add', onPress: () => props.navigation.getParent().navigate('Quick add'), icon: <QuickAddIcon /> }} />;
}
function DriverTabs() {
  return <Tab.Navigator tabBar={(props) => <DriverTabBar {...props} />} screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} /> })}>
    <Tab.Screen name="Home" component={Screens.DriverHome} />
    <Tab.Screen name="Trips" component={Screens.DriverTrips} />
    <Tab.Screen name="Inbox" component={Screens.DriverInbox} />
    <Tab.Screen name="More" component={Screens.DriverMore} />
  </Tab.Navigator>;
}
export default function DriverNavigator() {
  const { user } = useAuth();
  const orgId = typeof user.orgId === 'object' ? user.orgId?._id : user.orgId;
  const identity = `${user._id}:${orgId}`;
  return <TelematicsDemoProvider key={identity} identity={identity}><DriverDataProvider><Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="Driver tabs" component={DriverTabs} />
    <Stack.Screen name="Quick add" component={Screens.QuickAdd} options={{ presentation: 'modal' }} />
    <Stack.Screen name="My truck" component={Screens.MyTruck} />
    <Stack.Screen name="Change truck" component={Screens.ChangeTruck} />
    <Stack.Screen name="Trip detail" component={Screens.TripDetail} />
    <Stack.Screen name="Alert detail" component={Screens.AlertDetail} />
    {['Add fuel', 'Report issue', 'Workshop bill', 'Explain a stop', 'Support'].map((name) => <Stack.Screen key={name} name={name} component={Screens.CaptureForm} />)}
    {['Fuel history', 'My issues', 'Workshop bills'].map((name) => <Stack.Screen key={name} name={name} component={Screens.RecordsScreen} />)}
    <Stack.Screen name="Documents" component={Screens.Documents} />
    <Stack.Screen name="Document detail" component={Screens.DocumentDetail} />
    <Stack.Screen name="Location sharing" component={Screens.LocationSharing} />
    <Stack.Screen name="Profile" component={Screens.Profile} />
    {__DEV__ && <Stack.Screen name="Demo scenarios" component={Screens.DemoScenarios} />}
    <Stack.Screen name="SOS" component={Screens.SosSimulation} options={{ presentation: 'modal' }} />
  </Stack.Navigator></DriverDataProvider></TelematicsDemoProvider>;
}
