import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import styles, { COLORS } from '../styles/HomeScreen.styles';
import { SELECTED_VEHICLE_KEY } from './VehicleScreen';
import { startLocationTracking, stopLocationTracking, isTracking } from '../services/locationTracker';

const LOCATION_SHARING_PREFERENCE_KEY = 'driverLocationSharingPreference';

export default function HomeScreen({ navigation }) {
  const { t } = useLanguage();
  const { user, token, logout } = useAuth();
  const [savedVehicle, setSavedVehicle] = useState(null); // { _id, registrationNumber }
  const [onDuty, setOnDuty] = useState(isTracking());

  // Re-read saved vehicle every time this screen comes into focus
  // (so it updates immediately after returning from VehicleScreen)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(SELECTED_VEHICLE_KEY)
        .then((raw) => setSavedVehicle(raw ? JSON.parse(raw) : null))
        .catch(() => setSavedVehicle(null));
    }, []),
  );

  const requestForegroundLocationPermission = async () => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === 'granted') return true;

    if (!current.canAskAgain) {
      Alert.alert(
        'Location Permission Blocked',
        'Please enable location access in your phone settings to go On Duty.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }

    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.status === 'granted') return true;

    Alert.alert('Permission Required', 'Location permission is needed to go On Duty.');
    return false;
  };

  const requestAlwaysLocationPermission = async () => {
    const hasForegroundPermission = await requestForegroundLocationPermission();
    if (!hasForegroundPermission) return false;

    const currentBackground = await Location.getBackgroundPermissionsAsync();
    if (currentBackground.status === 'granted') return true;

    if (!currentBackground.canAskAgain) {
      Alert.alert(
        'Always Location Blocked',
        'Please enable Always Allow location access in your phone settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }

    const requestedBackground = await Location.requestBackgroundPermissionsAsync();
    if (requestedBackground.status === 'granted') return true;

    Alert.alert(
      'Always Location Not Enabled',
      'You can still share location while using the app. To share in the background, enable Always Allow in settings.',
    );
    return true;
  };

  const askLocationSharingChoice = () =>
    new Promise((resolve) => {
      Alert.alert(
        'Share Location',
        'Choose how you want to share your location while on duty.',
        [
          { text: "Don't Share", style: 'cancel', onPress: () => resolve('none') },
          { text: 'While Using App', onPress: () => resolve('foreground') },
          { text: 'Always', onPress: () => resolve('always') },
        ],
      );
    });

  const getLocationSharingChoice = async () => {
    const savedChoice = await AsyncStorage.getItem(LOCATION_SHARING_PREFERENCE_KEY);
    if (savedChoice === 'foreground' || savedChoice === 'always') return savedChoice;

    const choice = await askLocationSharingChoice();
    if (choice === 'foreground' || choice === 'always') {
      await AsyncStorage.setItem(LOCATION_SHARING_PREFERENCE_KEY, choice);
    }
    return choice;
  };

  const toggleDuty = async () => {
    if (onDuty) {
      stopLocationTracking();
      setOnDuty(false);
      return;
    }

    const choice = await getLocationSharingChoice();
    if (choice === 'none') return;

    const hasPermission = choice === 'always'
      ? await requestAlwaysLocationPermission()
      : await requestForegroundLocationPermission();
    if (!hasPermission) return;

    startLocationTracking(token);
    setOnDuty(true);
  };

  const startRefuel = () => {
    navigation.navigate('RefuelDetails', {
      vehicleId: savedVehicle?._id || null,
      vehicleLabel: savedVehicle?.registrationNumber || null,
      vehicleAssigned: !!savedVehicle,
    });
  };

  const driverName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Driver';

  return (
    <View style={styles.container}>
      {/* Decorative Background Circles from Figma */}
      <View style={styles.circleOne} />
      <View style={styles.circleTwo} />
      <View style={styles.circleThree} />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.greetingText}>Welcome!</Text>
            <Text style={styles.nameText}>{driverName}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* On Duty Toggle */}
        <TouchableOpacity
          style={[styles.dutyCard, onDuty && styles.dutyCardActive]}
          onPress={toggleDuty}
          activeOpacity={0.75}
        >
          <View style={[styles.dutyCardIcon, onDuty && styles.dutyCardIconActive]}>
            <Ionicons name={onDuty ? 'location' : 'location-outline'} size={22} color={onDuty ? COLORS.white : COLORS.primary} />
          </View>
          <View style={styles.dutyCardInfo}>
            <Text style={[styles.dutyCardLabel, onDuty && styles.dutyCardLabelActive]}>
              {onDuty ? 'ON DUTY' : 'OFF DUTY'}
            </Text>
            <Text style={[styles.dutyCardSubtitle, onDuty && styles.dutyCardSubtitleActive]}>
              {onDuty ? 'Sharing location every 2 min' : 'Tap to start sharing location'}
            </Text>
          </View>
          <View style={[styles.dutyToggle, onDuty && styles.dutyToggleActive]}>
            <View style={[styles.dutyToggleKnob, onDuty && styles.dutyToggleKnobActive]} />
          </View>
        </TouchableOpacity>

        {/* Start Refuel Card */}
        <View style={styles.refuelCard}>
          <View>
            <View style={styles.refuelCardHeader}>
              <Text style={styles.refuelTitle}>{t('home', 'startRefuel')}</Text>
              <Ionicons name="water" size={32} color={COLORS.white} />
            </View>
            <Text style={styles.refuelSubtitle}>Record your latest diesel fill-up</Text>
          </View>

          <TouchableOpacity style={styles.refuelAction} onPress={startRefuel}>
            <Ionicons name="add-circle" size={24} color={COLORS.primaryDark} />
            <Text style={styles.refuelActionText}>Tap to Start</Text>
          </TouchableOpacity>
        </View>

        {/* My Vehicle Card */}
        <TouchableOpacity
          style={styles.vehicleCard}
          onPress={() => navigation.navigate('Vehicle')}
          activeOpacity={0.75}
        >
          <View style={styles.vehicleCardIcon}>
            <Ionicons name="car-sport" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.vehicleCardInfo}>
            <Text style={styles.vehicleCardLabel}>MY VEHICLE</Text>
            {savedVehicle ? (
              <Text style={styles.vehicleCardValue}>{savedVehicle.registrationNumber}</Text>
            ) : (
              <Text style={styles.vehicleCardEmpty}>Set your vehicle →</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Fuel Logs History Card */}
        <TouchableOpacity
          style={styles.historyCard}
          onPress={() => navigation.navigate('FuelHistory')}
          activeOpacity={0.75}
        >
          <View style={styles.historyCardIcon}>
            <Ionicons name="list" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.historyCardInfo}>
            <Text style={styles.historyCardLabel}>Fuel History</Text>
            <Text style={styles.historyCardSubtitle}>View past logs</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
