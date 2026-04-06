import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import styles, { COLORS } from '../styles/HomeScreen.styles';

export default function HomeScreen({ navigation }) {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [vehicleAssigned, setVehicleAssigned] = useState(false);

  const startRefuel = () => {
    navigation.navigate('RefuelDetails', { vehicleAssigned });
  };

  // Mocked name for now as per Figma - later we can get it from user API
  const driverName = user?.name || 'Alfredo Curtis';

  return (
    <View style={styles.container}>
      {/* Decorative Background Circles from Figma */}
      <View style={styles.circleOne} />
      <View style={styles.circleTwo} />
      <View style={styles.circleThree} />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          {/* Avatar Placeholder */}
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.greetingText}>Welcome!</Text>
            <Text style={styles.nameText}>{driverName}</Text>
          </View>
        </View>

        {/* Notification Button */}
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
          {/* Unread indicator dot */}
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
      </View>
    </View>
  );
}
