import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, colors, radius } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { TelematicsDemoProvider } from './context/TelematicsDemoContext';
import { DriverDataProvider, useDriverData } from './context/DriverDataContext';
import * as Screens from './screens/DriverScreens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const icons = { Home: 'home-outline', Trips: 'navigate-outline', Inbox: 'notifications-outline', More: 'grid-outline' };
function DriverTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { data } = useDriverData();
  const unread = data?.alerts.filter((alert) => !alert.acknowledged).length || 0;
  const tabs = [...state.routes.slice(0, 2), { name: 'Quick add', key: 'quick-add' }, ...state.routes.slice(2)];
  return <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>{tabs.map((route) => {
    const isQuick = route.name === 'Quick add';
    const focused = !isQuick && state.routes[state.index].key === route.key;
    return <Pressable key={route.key} accessibilityRole="button" accessibilityLabel={route.name === 'Inbox' && unread ? `Inbox, ${unread} unread` : route.name} accessibilityState={{ selected: focused }} onPress={() => {
      if (isQuick) { navigation.getParent().navigate('Quick add'); return; }
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    }} style={s.tab}>
      <View style={[s.icon, focused && s.active, isQuick && s.add]}><Ionicons name={isQuick ? 'add' : icons[route.name]} size={isQuick ? 27 : 22} color={isQuick ? colors.white : focused ? colors.primary : colors.textMuted} />{route.name === 'Inbox' && unread > 0 && <View style={s.dot} />}</View><AppText variant="caption" weight={focused ? 'semibold' : 'regular'} color={focused ? colors.primary : colors.textMuted}>{isQuick ? 'Add' : route.name}</AppText>
    </Pressable>;
  })}</View>;
}
function DriverTabs() {
  return <Tab.Navigator tabBar={(props) => <DriverTabBar {...props} />} screenOptions={{ headerShown: false }}>
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
const s = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 10, paddingHorizontal: 12, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 60 }, icon: { minWidth: 48, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }, active: { backgroundColor: colors.blueTint }, add: { width: 52, height: 48, backgroundColor: colors.primary, marginTop: -18, borderRadius: radius.lg, shadowColor: colors.primaryDeep, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }, dot: { position: 'absolute', right: 9, top: 3, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.error, borderWidth: 1, borderColor: colors.surface },
});
