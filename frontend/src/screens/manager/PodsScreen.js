/**
 * PodsScreen.js
 *
 * View for managers/ops to list submitted Proofs of Delivery (PODs).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchPods } from '../../services/erpApi';
import { AppText, Card, Badge, colors, spacing } from '../../components/ui';
import VehicleLoader from '../../components/ui/VehicleLoader';

export default function PodsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await fetchPods(token);
      setPods(res.data || res.results || res || []);
    } catch (err) {
      console.warn('Failed to fetch PODs', err);
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
          POD via {item.receivedVia || 'APP'}
        </AppText>
        <Badge tone={item.status === 'VERIFIED' ? 'valid' : 'warning'} label={item.status || 'Submitted'} />
      </View>
      
      <AppText variant="h3" weight="extrabold" style={{ marginVertical: 8 }}>
        Trip LR: {item.trip?.lrNumber || 'Unknown'}
      </AppText>
      
      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <AppText variant="caption" muted>COPY TYPE</AppText>
          <AppText variant="small" weight="bold">{item.copyType || 'ORIGINAL'}</AppText>
        </View>
        <View style={[styles.metaCol, { flex: 1.5 }]}>
          <AppText variant="caption" muted>REMARKS</AppText>
          <AppText variant="small" weight="bold" numberOfLines={1}>{item.remarks || 'None'}</AppText>
        </View>
        <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
          <AppText variant="caption" muted>RCV DATE</AppText>
          <AppText variant="small" weight="bold">{item.receivedDate ? dayjs(item.receivedDate).format('DD MMM') : '—'}</AppText>
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
        <AppText variant="h2" weight="extrabold">PODs List</AppText>
      </View>

      {loading && !refreshing ? (
        <VehicleLoader visible={true} overlay={false} />
      ) : (
        <FlatList
          data={pods}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="mail-open-outline" size={48} color={colors.border} />
              <AppText variant="body" weight="semibold" muted style={{ marginTop: 12 }}>No PODs found.</AppText>
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
