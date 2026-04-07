import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import styles, { COLORS } from '../styles/HomeScreen.styles';
import { SELECTED_VEHICLE_KEY } from './VehicleScreen';

export default function HomeScreen({ navigation }) {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [savedVehicle, setSavedVehicle] = useState(null); // { _id, registrationNumber }

  // Re-read saved vehicle every time this screen comes into focus
  // (so it updates immediately after returning from VehicleScreen)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(SELECTED_VEHICLE_KEY)
        .then((raw) => setSavedVehicle(raw ? JSON.parse(raw) : null))
        .catch(() => setSavedVehicle(null));
    }, []),
  );

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
      </View>
    </View>
  );
}
