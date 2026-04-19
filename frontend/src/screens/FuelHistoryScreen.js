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
    const isFull = item.fillingType === 'FULL_TANK';
    return (
      <View style={[styles.logCard, isFull && { borderLeftColor: COLORS.success, borderLeftWidth: 3 }]}>
        <View style={styles.logHeader}>
          <Text style={styles.dateText}>{formatDate(item.refuelTime)}</Text>
          <View style={[styles.typeBadge, { backgroundColor: isFull ? COLORS.success : COLORS.primary }]}>
            <Text style={styles.typeBadgeText}>{isFull ? 'FULL' : 'PARTIAL'}</Text>
          </View>
        </View>

        {item.vehicleId?.registrationNumber && (
          <View style={styles.logRow}>
            <Ionicons name="car-sport-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Vehicle</Text>
            <Text style={styles.logRowValue}>{item.vehicleId.registrationNumber}</Text>
          </View>
        )}

        {item.litres != null && (
          <View style={styles.logRow}>
            <Ionicons name="water-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Litres</Text>
            <Text style={styles.logRowValue}>{item.litres.toFixed(2)} L</Text>
          </View>
        )}

        {item.rate != null && (
          <View style={styles.logRow}>
            <Ionicons name="pricetag-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Rate</Text>
            <Text style={styles.logRowValue}>₹{item.rate.toFixed(2)}/L</Text>
          </View>
        )}

        {item.totalAmount != null && (
          <View style={styles.logRow}>
            <Ionicons name="receipt-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Total</Text>
            <Text style={styles.logRowValue}>₹{item.totalAmount.toFixed(2)}</Text>
          </View>
        )}

        {item.odometerReading != null && (
          <View style={styles.logRow}>
            <Ionicons name="speedometer-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Odometer</Text>
            <Text style={styles.logRowValue}>{item.odometerReading} km</Text>
          </View>
        )}

        {item.location && (
          <View style={styles.logRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.logRowLabel}>Location</Text>
            <Text style={styles.logRowValue}>{item.location}</Text>
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
          keyExtractor={(item) => String(item._id)}
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
