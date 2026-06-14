import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchVehicles } from '../services/api';
import { AppText, colors, spacing } from '../components/ui';

export const SELECTED_VEHICLE_KEY = 'fleetedge_selected_vehicle';

export default function VehicleScreen({ navigation }) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    // Load current saved vehicle
    storage.getItem(SELECTED_VEHICLE_KEY)
      .then((saved) => {
        if (saved) {
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
    await storage.setItem(
      SELECTED_VEHICLE_KEY,
      { _id: vehicle._id, registrationNumber: vehicle.registrationNumber }
    );
    // Go back so HomeScreen (via useFocusEffect) picks up the change
    navigation.goBack();
  }, [navigation]);

  const renderVehicle = ({ item }) => {
    const isSelected = item._id === selectedId;
    return (
      <Pressable
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => selectVehicle(item)}
      >
        <View style={[styles.iconTile, isSelected && styles.iconTileSelected]}>
          <Ionicons name="car-sport" size={19} color={isSelected ? colors.white : colors.textMuted} />
        </View>
        <View style={styles.info}>
          <AppText mono weight="semibold" color={isSelected ? colors.primary : colors.text} style={styles.reg}>
            {item.registrationNumber}
          </AppText>
          {isSelected ? (
            <AppText variant="caption" weight="semibold" color={colors.validText}>
              Currently assigned
            </AppText>
          ) : item.vehicleType ? (
            <AppText variant="caption" weight="medium" muted>{item.vehicleType}</AppText>
          ) : null}
        </View>
        {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Dimmed backdrop — tap to dismiss */}
      <Pressable style={styles.backdrop} onPress={() => navigation.goBack()} />

      {/* Bottom sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <AppText variant="h3" weight="extrabold">{t('vehicle', 'selectVehicle') || 'Select Vehicle'}</AppText>
          <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="car-outline" size={48} color={colors.border} />
            <AppText muted center style={{ marginTop: spacing.md }}>{t('vehicle', 'noVehicles')}</AppText>
          </View>
        ) : (
          <FlatList
            data={vehicles}
            keyExtractor={(item) => String(item._id)}
            renderItem={renderVehicle}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,40,36,0.55)' },

  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
    maxHeight: '80%',
  },
  grabber: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E0E6E3',
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowSelected: { backgroundColor: colors.tealTint, borderColor: colors.primary },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileSelected: { backgroundColor: colors.primary },
  info: { flex: 1 },
  reg: { fontSize: 16, marginBottom: 2 },
});
