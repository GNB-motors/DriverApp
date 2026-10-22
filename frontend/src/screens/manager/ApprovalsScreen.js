/**
 * ApprovalsScreen.js
 *
 * Dedicated queue for MANAGER and OPS_EXECUTIVE to review pending operational requests.
 * Uses erpApi `fetchPendingApprovals` and `reviewApproval`.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useErp } from '../../context/ErpContext';
import { fetchPendingApprovals, reviewApproval } from '../../services/erpApi';
import { AppText, Card, Button, colors, spacing, radius } from '../../components/ui';
import VehicleLoader from '../../components/ui/VehicleLoader';

export default function ApprovalsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { triggerRefresh } = useErp();
  
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const loadApprovals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await fetchPendingApprovals(token);
      setApprovals(res.data || res.results || res || []);
    } catch (err) {
      console.warn('Failed to fetch approvals', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleAction = async (approvalId, status) => {
    setActioningId(approvalId);
    try {
      await reviewApproval(token, approvalId, { status, remarks: `App ${status}` });
      setApprovals(prev => prev.filter(a => a._id !== approvalId));
      triggerRefresh();
      Alert.alert('Success', `Request has been ${status.toLowerCase()}.`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Action failed');
    } finally {
      setActioningId(null);
    }
  };

  const renderApproval = ({ item }) => {
    const isActioning = actioningId === item._id;
    return (
      <Card elevated="sm" padding={18} style={{ marginBottom: 14 }}>
        <View style={styles.cardHeader}>
          <AppText variant="small" weight="bold" color={colors.primaryDeep}>{item.type || 'Request'}</AppText>
          <AppText variant="caption" muted>{dayjs(item.createdAt).format('DD MMM, hh:mm A')}</AppText>
        </View>
        
        <AppText variant="bodyStrong" weight="semibold" style={{ marginTop: 8 }}>
          {item.description || 'Action required for operational workflow.'}
        </AppText>
        
        {item.relatedRef && (
          <View style={styles.metaBox}>
            <AppText variant="caption" muted>Reference ID</AppText>
            <AppText variant="small" weight="bold" mono>{item.relatedRef}</AppText>
          </View>
        )}

        <View style={styles.actionRow}>
          <Button 
            label="Reject" 
            variant="outline" 
            color="destructive"
            onPress={() => handleAction(item._id, 'REJECTED')}
            disabled={isActioning}
            style={{ flex: 1 }}
          />
          <View style={{ width: 12 }} />
          <Button 
            label="Approve" 
            onPress={() => handleAction(item._id, 'APPROVED')}
            disabled={isActioning}
            style={{ flex: 1 }}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" weight="extrabold">Approvals Queue</AppText>
      </View>

      {loading && !refreshing ? (
        <VehicleLoader visible={true} overlay={false} />
      ) : (
        <FlatList
          data={approvals}
          keyExtractor={a => a._id}
          contentContainerStyle={styles.list}
          renderItem={renderApproval}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadApprovals(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.success} />
              <AppText variant="h3" weight="bold" style={{ marginTop: 16 }}>You're all caught up!</AppText>
              <AppText variant="body" muted style={{ marginTop: 6 }}>No pending approvals right now.</AppText>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
  metaBox: { backgroundColor: colors.background, padding: 10, borderRadius: radius.sm, marginTop: 12 },
  actionRow: { flexDirection: 'row', marginTop: 16 },
  empty: { paddingVertical: 80, alignItems: 'center' },
});
