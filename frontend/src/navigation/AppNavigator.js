import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../components/ui/SplashScreen';
import FloatingTabBar from './FloatingTabBar';

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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIcon = (routeName) => ({ focused, color, size }) => {
  let iconName;
  if (routeName === 'Home') iconName = focused ? 'home' : 'home-outline';
  else if (routeName === 'Repairs') iconName = focused ? 'build' : 'build-outline';
  else if (routeName === 'Documents') iconName = focused ? 'document-text' : 'document-text-outline';
  else if (routeName === 'Profile') iconName = focused ? 'person' : 'person-outline';
  return <Ionicons name={iconName} size={size} color={color} />;
};

// Driver: Home · Repairs · [Refuel FAB] · Docs · Profile
function BottomTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} showFab />}
      screenOptions={({ route }) => ({ headerShown: false, tabBarIcon: tabIcon(route.name) })}
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
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          {isNewLogin && <Stack.Screen name="Welcome" component={WelcomeScreen} />}
          <Stack.Screen
            name="Main"
            component={user?.role === 'FIELD_AGENT' ? FieldAgentTabs : BottomTabs}
          />
          <Stack.Screen name="DocsScreen" component={DocumentsScreen} />
          <Stack.Screen name="LanguageScreen" component={ChooseLanguageScreen} />
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
        </>
      )}
    </Stack.Navigator>
  );
}
