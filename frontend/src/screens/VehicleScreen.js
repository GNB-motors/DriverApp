import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { fetchVehicles } from '../services/api';
import styles, { COLORS } from '../styles/VehicleScreen.styles';

export const SELECTED_VEHICLE_KEY = 'fleetedge_selected_vehicle';

export default function VehicleScreen({ navigation }) {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    // Load current saved vehicle
    AsyncStorage.getItem(SELECTED_VEHICLE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          setSelectedId(saved._id);
        }
      })
      .catch(() => {});

    // Fetch vehicle list
    fetchVehicles(token)
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.vehicles || []);
        setVehicles(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const selectVehicle = useCallback(async (vehicle) => {
    setSelectedId(vehicle._id);
    await AsyncStorage.setItem(
      SELECTED_VEHICLE_KEY,
      JSON.stringify({ _id: vehicle._id, registrationNumber: vehicle.registrationNumber }),
    );
    // Go back so HomeScreen (via useFocusEffect) picks up the change
    navigation.goBack();
  }, [navigation]);

  const renderVehicle = ({ item }) => {
    const isSelected = item._id === selectedId;
    return (
      <TouchableOpacity
        style={[styles.vehicleItem, isSelected && styles.vehicleItemSelected]}
        onPress={() => selectVehicle(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.vehicleIconContainer, isSelected && styles.vehicleIconContainerSelected]}>
          <Ionicons
            name="car-sport"
            size={22}
            color={isSelected ? COLORS.primaryDark : COLORS.primary}
          />
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={[styles.vehicleRegNumber, isSelected && styles.vehicleRegNumberSelected]}>
            {item.registrationNumber}
          </Text>
          {item.vehicleType ? (
            <Text style={styles.vehicleType}>{item.vehicleType}</Text>
          ) : null}
        </View>
        {isSelected && (
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={16} color={COLORS.white} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topSection}>
        <View style={styles.circleOne} />
        <View style={styles.circleTwo} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>My Vehicle</Text>
            <Text style={styles.headerSubtitle}>Tap a vehicle to set it as your default</Text>
          </View>
        </View>

        <View style={styles.contentSheet}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : vehicles.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="car-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No vehicles found for your organization.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Select Your Vehicle</Text>
              <FlatList
                data={vehicles}
                keyExtractor={(item) => String(item._id)}
                renderItem={renderVehicle}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
