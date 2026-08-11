/**
 * ConsignmentsListScreen.js
 *
 * View for managers/ops to list submitted Bilty (Consignments).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchConsignments } from '../../services/erpApi';
import { AppText, Card, Badge, colors, spacing } from '../../components/ui';
import VehicleLoader from '../../components/ui/VehicleLoader';

export default function ConsignmentsListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  
  const [cns, setCns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await fetchConsignments(token);
      setCns(res.data || res.results || res || []);
    } catch (err) {
      console.warn('Failed to fetch consignments', err);
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
          CN: {item.cnNumber || 'Pending'}
        </AppText>
        <Badge tone={item.status === 'VERIFIED' ? 'valid' : 'warning'} label={item.status || 'Draft'} />
      </View>
      
      <AppText variant="h3" weight="extrabold" style={{ marginVertical: 8 }}>
        Trip LR: {item.trip?.lrNumber || 'Unknown'}
      </AppText>
      
      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <AppText variant="caption" muted>QTY</AppText>
          <AppText variant="small" weight="bold">{item.loadedQty} {item.qtyUnit}</AppText>
        </View>
        <View style={styles.metaCol}>
          <AppText variant="caption" muted>SEALS</AppText>
          <AppText variant="small" weight="bold" numberOfLines={1}>{item.sealNumbers || '—'}</AppText>
        </View>
        <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
          <AppText variant="caption" muted>DATE</AppText>
          <AppText variant="small" weight="bold">{item.cnDate ? dayjs(item.cnDate).format('DD MMM') : '—'}</AppText>
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
        <AppText variant="h2" weight="extrabold">Bilty (CN) List</AppText>
      </View>

      {loading && !refreshing ? (
        <VehicleLoader visible={true} overlay={false} />
      ) : (
        <FlatList
          data={cns}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={colors.border} />
              <AppText variant="body" weight="semibold" muted style={{ marginTop: 12 }}>No Consignments found.</AppText>
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
