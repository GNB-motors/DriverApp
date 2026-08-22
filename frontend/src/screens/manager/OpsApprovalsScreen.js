import React, { useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { AppText, Card, colors, spacing, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { Pill, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import billService from '../../services/billService';

const CAT_TONE = { Other: 'purple', Repair: 'info', Toll: 'warning', Food: 'warning', Loading: 'purple', Parking: 'info' };

/** M4 · Approvals — pending driver bills waiting for the manager to confirm. */
export default function OpsApprovalsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Pending driver bills — real API only.
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token;
  const { data: apprApi, loading, error, refetch } = useApi(
    () => billService.listBills({ status: 'PENDING' }),
    [],
    { enabled: useReal, fallback: [] },
  );
  // Refetch when returning from confirm/reject.
  useFocusEffect(useCallback(() => { if (useReal) refetch(); }, [useReal, refetch]));

  const bills = useMemo(() => {
    const rows = Array.isArray(apprApi)
      ? apprApi
      : (apprApi?.results || apprApi?.items || apprApi?.rows || apprApi?.data || []);
    return rows.map((r, i) => ({
      id: r?._id || r?.id || String(i),
      name: r?.driver?.name || r?.driverName || 'Driver',
      category: (r?.title || r?.category || '').replace(/ bill$/i, '') || 'Bill',
      plate: r?.vehicle?.registrationNumber || '',
      date: r?.expenseDate ? dayjs(r.expenseDate).format('DD MMM') : '',
      desc: r?.description || '',
      amount: `₹${(Number(r?.amount) || 0).toLocaleString('en-IN')}`,
    }));
  }, [apprApi]);

  const pendingCount = bills.length;

  return (
    <ManagerShell
      title="Approvals"
      subtitle={`${pendingCount} pending`}
      navigation={navigation}
      active="OpsApprovals"
      right={<View style={styles.count}><AppText mono weight="bold" color={colors.white}>{pendingCount}</AppText></View>}
    >
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
          {loading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : pendingCount === 0 ? (
            <EmptyState icon="checkmark-done-outline" title="No approvals" message="Bills a driver submits will appear here for you to confirm." />
          ) : (
            bills.map((b) => (
              <Card key={b.id} elevated="sm" padding={12} onPress={() => navigation.navigate('OwnerBillDetail', { id: b.id })} style={styles.row}>
                <View style={styles.thumb}>
                  <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <AppText variant="bodyStrong" weight="bold">{b.name}</AppText>
                  <View style={styles.metaRow}>
                    <Pill tone={CAT_TONE[b.category] || 'neutral'} label={b.category} />
                    {b.plate ? <AppText variant="caption" mono muted>{b.plate}</AppText> : null}
                    {b.date ? <AppText variant="caption" mono muted>{b.date}</AppText> : null}
                  </View>
                  {b.desc ? <AppText variant="caption" muted numberOfLines={1}>{b.desc}</AppText> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <AppText mono variant="bodyStrong" weight="semibold">{b.amount}</AppText>
                  <Ionicons name="chevron-forward" size={16} color="#B4B4BC" />
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      </View>
    </ManagerShell>
  );
}

const styles = StyleSheet.create({
  count: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.errorStrong, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 18, paddingTop: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 52, height: 62, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
