/**
 * TripListScreen.js
 *
 * Board for managers/owners to view all active and historical trips.
 * Integrates with erpApi.js fetchErpTrips() and provides basic filtering (State).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchErpTrips } from '../../services/erpApi';
import { AppText, Card, Badge, colors, spacing, radius } from '../../components/ui';
import VehicleLoader from '../../components/ui/VehicleLoader';

const TABS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'All', value: 'ALL' },
];

export default function TripListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrips = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      // If 'ALL', we don't send a state filter. Else send ACTIVE or CLOSED.
      const query = filter === 'ALL' ? {} : { state: filter };
      const res = await fetchErpTrips(token, query);
      // Ensure we extract the array properly based on backend response shape
      const results = res.data?.results || res.results || res.data || [];
      setTrips(Array.isArray(results) ? results : []);
    } catch (err) {
      console.warn('Failed to fetch trips', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, filter]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const renderTrip = ({ item }) => {
    const isClosed = item.pipelineStage >= 8 || item.status === 'CLOSED';
    return (
      <Pressable onPress={() => navigation.navigate('TripDetail', { tripId: item._id })}>
        <Card elevated="sm" padding={16} style={{ marginBottom: 12 }}>
          <View style={styles.cardHeader}>
            <AppText variant="small" weight="bold" color={colors.primary}>
              LR: {item.lrNumber || 'Pending'}
            </AppText>
            <Badge 
              tone={isClosed ? 'info' : 'valid'} 
              label={isClosed ? 'Closed' : `Stage ${item.pipelineStage || 1}`} 
            />
          </View>
          
          <AppText variant="h3" weight="extrabold" style={{ marginVertical: 8 }}>
            {item.source}  <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />  {item.destination}
          </AppText>
          
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <AppText variant="caption" muted>VEHICLE</AppText>
              <AppText variant="small" weight="bold">{item.vehicle?.registrationNumber || 'N/A'}</AppText>
            </View>
            <View style={styles.metaCol}>
              <AppText variant="caption" muted>DRIVER</AppText>
              <AppText variant="small" weight="bold">{item.driver?.firstName || 'Pending'}</AppText>
            </View>
            <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
              <AppText variant="caption" muted>CREATED</AppText>
              <AppText variant="small" weight="bold">{dayjs(item.createdAt).format('DD MMM')}</AppText>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" weight="extrabold">Trips Board</AppText>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map(tab => {
          const isActive = filter === tab.value;
          return (
            <Pressable
              key={tab.value}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setFilter(tab.value)}
            >
              <AppText variant="small" weight="bold" color={isActive ? colors.white : colors.textMuted}>
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <VehicleLoader visible={true} overlay={false} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={t => t._id}
          contentContainerStyle={styles.list}
          renderItem={renderTrip}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTrips(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={48} color={colors.border} />
              <AppText variant="body" weight="semibold" muted style={{ marginTop: 12 }}>No trips found.</AppText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingBottom: 16, backgroundColor: colors.surface },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 22, paddingVertical: 12, gap: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background },
  tabActive: { backgroundColor: colors.primaryDeep },
  list: { padding: 22, paddingBottom: 80 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  metaCol: { flex: 1 },
  empty: { paddingVertical: 60, alignItems: 'center' },
});
