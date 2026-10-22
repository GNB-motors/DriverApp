/**
 * DeliveryOrdersScreen.js
 *
 * View for managers to list all Delivery Orders.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchDeliveryOrders } from '../../services/erpApi';
import { AppText, Card, Badge, colors, spacing } from '../../components/ui';
import VehicleLoader from '../../components/ui/VehicleLoader';

export default function DeliveryOrdersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  
  const [dos, setDos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await fetchDeliveryOrders(token);
      setDos(res.data || res.results || res || []);
    } catch (err) {
      console.warn('Failed to fetch DOs', err);
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
        <AppText variant="small" weight="bold" color={colors.primary}>
          DO: {item.doNumber || 'Pending'}
        </AppText>
        <Badge tone={item.status === 'COMPLETED' ? 'valid' : 'info'} label={item.status || 'Active'} />
      </View>
      
      <AppText variant="h3" weight="extrabold" style={{ marginVertical: 8 }}>
        Party: {item.party?.name || 'Unknown'}
      </AppText>
      
      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <AppText variant="caption" muted>QTY / UNIT</AppText>
          <AppText variant="small" weight="bold">
            {item.totalQty || 0} {item.qtyUnit || 'TONS'}
          </AppText>
        </View>
        <View style={styles.metaCol}>
          <AppText variant="caption" muted>SALE FREIGHT</AppText>
          <AppText variant="small" weight="bold">
            {item.saleFreight ? `₹${item.saleFreight.toLocaleString()}` : '—'}
          </AppText>
        </View>
        <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
          <AppText variant="caption" muted>DATE</AppText>
          <AppText variant="small" weight="bold">{item.doDate ? dayjs(item.doDate).format('DD MMM') : '—'}</AppText>
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
        <AppText variant="h2" weight="extrabold">Delivery Orders</AppText>
      </View>

      {loading && !refreshing ? (
        <VehicleLoader visible={true} overlay={false} />
      ) : (
        <FlatList
          data={dos}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.border} />
              <AppText variant="body" weight="semibold" muted style={{ marginTop: 12 }}>No Delivery Orders found.</AppText>
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
