import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../theme/theme';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#429690',
        tabBarInactiveTintColor: '#B6BFC9',
        headerShown: false,
        tabBarStyle: {
          height: 90,
          paddingTop: 10,
          paddingBottom: 30,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.05,
          shadowRadius: 20,
          elevation: 10,
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 5,
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { language, isLoaded } = useLanguage();
  const { user, loading: authLoading, isNewLogin } = useAuth();

  if (!isLoaded || authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          {isNewLogin && <Stack.Screen name="Welcome" component={WelcomeScreen} />}
          <Stack.Screen name="Main" component={BottomTabs} />
          <Stack.Screen name="DocsScreen" component={DocumentsScreen} />
          <Stack.Screen name="LanguageScreen" component={ChooseLanguageScreen} />
          <Stack.Screen name="Vehicle" component={VehicleScreen} />
          <Stack.Screen name="RefuelDetails" component={RefuelDetailsScreen} />
          <Stack.Screen name="UploadPhotos" component={UploadPhotosScreen} />
          <Stack.Screen name="PhotoPreview" component={PhotoPreviewScreen} />
          <Stack.Screen name="FuelHistory" component={FuelHistoryScreen} />
          <Stack.Screen name="SOSOptions" component={SOSOptionsScreen} options={{ presentation: 'transparentModal' }} />
          <Stack.Screen name="SOSEmergencyActive" component={SOSEmergencyActiveScreen} options={{ presentation: 'fullScreenModal' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
