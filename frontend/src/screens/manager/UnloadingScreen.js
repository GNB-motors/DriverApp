/**
 * UnloadingScreen.js
 *
 * View for managers/ops to list trips that are waiting to be unloaded or closed.
 * Filters trips where pipelineStage >= 4 and pipelineStage < 8
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchErpTrips } from '../../services/erpApi';
import { AppText, Card, Badge, colors, spacing } from '../../components/ui';
import VehicleLoader from '../../components/ui/VehicleLoader';

export default function UnloadingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await fetchErpTrips(token, { state: 'ACTIVE' });
      let results = res.data?.results || res.results || res.data || [];
      // Filter for active trips that are past Bilty stage but not yet fully closed (Stage 4 to 7)
      results = results.filter(t => t.pipelineStage >= 4 && t.pipelineStage < 8);
      setTrips(Array.isArray(results) ? results : []);
    } catch (err) {
      console.warn('Failed to fetch unloading trips', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderItem = ({ item }) => (
    <Pressable onPress={() => navigation.navigate('TripDetail', { tripId: item._id })}>
      <Card elevated="sm" padding={16} style={{ marginBottom: 12 }}>
        <View style={styles.cardHeader}>
          <AppText variant="small" weight="bold" color={colors.primary}>
            LR: {item.lrNumber || 'Pending'}
          </AppText>
          <Badge tone="warning" label={`Stage ${item.pipelineStage}`} />
        </View>
        
        <AppText variant="h3" weight="extrabold" style={{ marginVertical: 8 }}>
          {item.source}  <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />  {item.destination}
        </AppText>
        
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <AppText variant="caption" muted>VEHICLE</AppText>
            <AppText variant="small" weight="bold">{item.vehicle?.registrationNumber || 'N/A'}</AppText>
          </View>
          <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
            <AppText variant="caption" muted>DISPATCHED</AppText>
            <AppText variant="small" weight="bold">{dayjs(item.createdAt).format('DD MMM')}</AppText>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" weight="extrabold">Unloading Board</AppText>
      </View>

      {loading && !refreshing ? (
        <VehicleLoader visible={true} overlay={false} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="flag-outline" size={48} color={colors.border} />
              <AppText variant="body" weight="semibold" muted style={{ marginTop: 12 }}>No trips awaiting unloading.</AppText>
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
  list: { padding: 22, paddingBottom: 80 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  metaCol: { flex: 1 },
  empty: { paddingVertical: 60, alignItems: 'center' },
});
