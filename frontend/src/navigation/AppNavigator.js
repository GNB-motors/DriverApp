import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../theme/theme';
import { useLanguage } from '../context/LanguageContext';

import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import RefuelDetailsScreen from '../screens/RefuelDetailsScreen';
import UploadPhotosScreen from '../screens/UploadPhotosScreen';
import PhotoPreviewScreen from '../screens/PhotoPreviewScreen';
import VehicleScreen from '../screens/VehicleScreen';
import SOSOptionsScreen from '../screens/SOSOptionsScreen';
import SOSEmergencyActiveScreen from '../screens/SOSEmergencyActiveScreen';

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
          else if (route.name === 'Docs') iconName = focused ? 'document-text' : 'document-text-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('home', 'greeting').split(',')[0] || 'Home' }} />
      <Tab.Screen name="Docs" component={DocumentsScreen} options={{ title: t('docs', 'title') || 'Docs' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { language, isLoaded } = useLanguage();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // If no language is selected, force the user to pick one
  if (!language) {
    return <LanguageSelectionScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={BottomTabs} />
      <Stack.Screen name="Vehicle" component={VehicleScreen} />
      <Stack.Screen name="RefuelDetails" component={RefuelDetailsScreen} />
      <Stack.Screen name="UploadPhotos" component={UploadPhotosScreen} />
      <Stack.Screen name="PhotoPreview" component={PhotoPreviewScreen} />
      <Stack.Screen name="SOSOptions" component={SOSOptionsScreen} options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="SOSEmergencyActive" component={SOSEmergencyActiveScreen} options={{ presentation: 'fullScreenModal' }} />
    </Stack.Navigator>
  );
}
