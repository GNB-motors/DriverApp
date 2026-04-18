import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchMyFuelLogs } from '../services/api';
import styles, { COLORS } from '../styles/FuelHistoryScreen.styles';

export default function FuelHistoryScreen({ navigation }) {
  const { token, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user?._id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetchMyFuelLogs(token, user._id, 1, 50);
      setLogs(res?.data || []);
    } catch (err) {
      console.warn('[FuelHistory] fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderLogCard = ({ item }) => {
    // item is a VehicleMileageInterval
    const isCompleted = item.status === 'COMPLETED';
    return (
      <View style={[styles.logCard, isCompleted && { borderLeftColor: COLORS.success, borderLeftWidth: 3 }]}>
        {/* Header: status badge + date */}
        <View style={styles.logHeader}>
          <Text style={styles.dateText}>{formatDate(item.startDate)}</Text>
          <View style={[styles.typeBadge, { backgroundColor: isCompleted ? COLORS.success : COLORS.primary }]}>
            <Text style={styles.typeBadgeText}>{item.status === 'COMPLETED' ? 'DONE' : 'ONGOING'}</Text>
          </View>
        </View>

        {/* Vehicle */}
        {item.vehicleId?.registrationNumber && (
          <View style={styles.logRow}>
            <Ionicons name="car-sport-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Vehicle</Text>
            <Text style={styles.logRowValue}>{item.vehicleId.registrationNumber}</Text>
          </View>
        )}

        {/* Odometer range */}
        {item.startOdometer != null && (
          <View style={styles.logRow}>
            <Ionicons name="speedometer-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Odometer</Text>
            <Text style={styles.logRowValue}>
              {item.startOdometer} km
              {item.endOdometer != null ? ` → ${item.endOdometer} km` : ' (open)'}
            </Text>
          </View>
        )}

        {/* Distance covered */}
        {item.distanceKm != null && (
          <View style={styles.logRow}>
            <Ionicons name="navigate-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Distance</Text>
            <Text style={styles.logRowValue}>{item.distanceKm.toFixed(1)} km</Text>
          </View>
        )}

        {/* Fuel consumed */}
        {item.fuelConsumedLiters != null && (
          <View style={styles.logRow}>
            <Ionicons name="water-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Fuel Used</Text>
            <Text style={styles.logRowValue}>{item.fuelConsumedLiters.toFixed(2)} L</Text>
          </View>
        )}

        {/* Mileage (km/L) — only on completed intervals */}
        {isCompleted && item.mileageKmPerL != null && (
          <View style={[styles.logRow, { marginTop: 4 }]}>
            <Ionicons name="analytics-outline" size={16} color={COLORS.primary} />
            <Text style={[styles.logRowLabel, { color: COLORS.primary, fontWeight: '700' }]}>Mileage</Text>
            <Text style={[styles.logRowValue, { color: COLORS.primary, fontWeight: '700' }]}>
              {item.mileageKmPerL.toFixed(2)} km/L
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Mileage History</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          renderItem={renderLogCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="list-circle-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No mileage records found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
