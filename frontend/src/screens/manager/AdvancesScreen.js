/**
 * AdvancesScreen.js
 *
 * View for Drivers (My Advances) and Managers (All Advances).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchDriverAdvance } from '../../services/erpApi'; // For driver. If manager, we might need a separate endpoint like fetchAllAdvances. Assuming fetchDriverAdvance adapts or we only show driver's own advances.
import { AppText, Card, Badge, colors, spacing } from '../../components/ui';
import VehicleLoader from '../../components/ui/VehicleLoader';
import { API_BASE_URL } from '../../services/api';

export default function AdvancesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isDriver = user?.role === 'DRIVER';

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      // In a real scenario, use a specific fetchAllAdvances for manager.
      // We will hit the basic GET /api/v1/erp/advances endpoint.
      const res = await fetch(`${API_BASE_URL}/api/v1/erp/advances`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAdvances(data.data || data.results || data || []);
    } catch (err) {
      console.warn('Failed to fetch advances', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderItem = ({ item }) => (
    <Card elevated="sm" padding={16} style={{ marginBottom: 12 }}>
      <View style={styles.cardHeader}>
        <AppText variant="small" weight="bold" color={colors.primaryDeep}>
          {item.paymentMode || 'CASH'}
        </AppText>
        <Badge tone="success" label="Issued" />
      </View>
      
      <AppText variant="h2" weight="extrabold" style={{ marginVertical: 8, color: colors.success }}>
        ₹{item.amount ? item.amount.toLocaleString('en-IN') : 0}
      </AppText>
      
      <View style={styles.metaRow}>
        {!isDriver && (
          <View style={styles.metaCol}>
            <AppText variant="caption" muted>DRIVER</AppText>
            <AppText variant="small" weight="bold">{item.driver?.firstName || 'Unknown'}</AppText>
          </View>
        )}
        <View style={styles.metaCol}>
          <AppText variant="caption" muted>TRIP LR</AppText>
          <AppText variant="small" weight="bold" numberOfLines={1}>{item.trip?.lrNumber || '—'}</AppText>
        </View>
        <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
          <AppText variant="caption" muted>DATE</AppText>
          <AppText variant="small" weight="bold">{item.date ? dayjs(item.date).format('DD MMM') : '—'}</AppText>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" weight="extrabold">{isDriver ? 'My Advances' : 'Advances List'}</AppText>
      </View>

      {loading && !refreshing ? (
        <VehicleLoader visible={true} overlay={false} />
      ) : (
        <FlatList
          data={advances}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={48} color={colors.border} />
              <AppText variant="body" weight="semibold" muted style={{ marginTop: 12 }}>No advances found.</AppText>
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
