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
const Tab = createBottomTabNavigator(); const Stack = createNativeStackNavigator();
const icons = { Today: 'sunny-outline', Live: 'map-outline', Fleet: 'bus-outline', Alerts: 'notifications-outline', More: 'grid-outline' };
function OwnerTabs() {
  const { data } = useManagerData();
  const unread = data?.alertFeed?.unacknowledgedCount || 0;
  return <Tab.Navigator tabBar={(props) => <CurvedTabBar {...props} />} screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} /> })}>
    <Tab.Screen name="Today" component={Owner.Today} />
    <Tab.Screen name="Live" component={Screens.ManagerLive} />
    <Tab.Screen name="Fleet" component={Screens.Fleet} />
    <Tab.Screen name="Alerts" component={Screens.Alerts} options={{ tabBarBadge: unread || undefined }} />
    <Tab.Screen name="More" component={Owner.More} />
  </Tab.Navigator>;
}
export default function OwnerNavigator() {
  const { user } = useAuth();
  const orgId = typeof user.orgId === 'object' ? user.orgId?._id : user.orgId;
  const identity = `${user._id}:${orgId}:owner`;
  return <TelematicsApiProvider key={identity} identity={identity} audience="owner"><ManagerDataProvider audience="owner"><Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="Owner tabs" component={OwnerTabs} />
    <Stack.Screen name="Fleet" component={Screens.Fleet} />
    <Stack.Screen name="Vehicle detail" component={Screens.VehicleDetail} />
    <Stack.Screen name="Driver detail" component={Screens.DriverDetail} />
    <Stack.Screen name="Duty board" component={Screens.Drivers} />
    <Stack.Screen name="Truck handover" component={Screens.Handover} />
    <Stack.Screen name="Manager alert" component={Screens.AlertDetail} />
    <Stack.Screen name="Fuel review" component={Screens.Reviews} />
    <Stack.Screen name="Maintenance" component={Screens.Reviews} />
    <Stack.Screen name="Review detail" component={Screens.ReviewDetail} />
    <Stack.Screen name="Fleet documents" component={Screens.Documents} />
    <Stack.Screen name="Manager document" component={Screens.DocumentDetail} />
    <Stack.Screen name="Fleet trips" component={Screens.Trips} />
    <Stack.Screen name="Manager trip" component={Screens.Trips} />
    <Stack.Screen name="Drivers" component={Screens.Drivers} />
    <Stack.Screen name="Digest" component={Owner.Digest} />
    <Stack.Screen name="Fuel & AdBlue" component={Owner.FuelAdblue} />
    <Stack.Screen name="Branch overview" component={Owner.BranchOverview} />
    <Stack.Screen name="Team & access" component={Owner.DeferredTeam} />
    <Stack.Screen name="Owner settings" component={Screens.Settings} />
  </Stack.Navigator></ManagerDataProvider></TelematicsApiProvider>;
}
