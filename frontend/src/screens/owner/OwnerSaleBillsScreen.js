import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { AppText, Card, colors, spacing } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Pill, FilterChips, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import ownerService from '../../services/ownerService';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

/** Sale bill status → Pill tone + the words the web ERP uses. */
const STATUS_META = {
  DRAFT: { tone: 'neutral', label: 'Draft' },
  PENDING_APPROVAL: { tone: 'pending', label: 'Pending approval' },
  APPROVED: { tone: 'info', label: 'Approved' },
  SUBMITTED: { tone: 'info', label: 'Submitted' },
  PARTIALLY_PAID: { tone: 'warning', label: 'Part paid' },
  PAID: { tone: 'success', label: 'Paid' },
  CANCELLED: { tone: 'rejected', label: 'Cancelled' },
};

/** O7 · Sale bills — invoices raised and what's still owed against them. */
export default function OwnerSaleBillsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');

  const { token } = useAuth();
  const useReal = apiConfigured() && !!token;
  const { data: saleApi, loading: saleLoading, error, refetch } = useApi(
    () => ownerService.listSaleBills(),
    [],
    { enabled: useReal, fallback: [] },
  );

  // /erp/sale-bills → [{ billNumber, billDate, partyId: { name }, netAmount,
  // outstandingAmount, status, dueDate }]
  const all = useMemo(() => {
    const rows = Array.isArray(saleApi)
      ? saleApi
      : (saleApi?.results || saleApi?.rows || saleApi?.items || saleApi?.data || []);
    const today = dayjs();
    return rows.map((r, i) => {
      const status = r?.status || 'DRAFT';
      const meta = STATUS_META[status] || { tone: 'neutral', label: status };
      const outstanding = Number(r?.outstandingAmount) || 0;
      const due = r?.dueDate ? dayjs(r.dueDate) : null;
      const overdue = outstanding > 0 && due && due.isBefore(today, 'day') && status !== 'CANCELLED';
      const overdueDays = overdue ? today.diff(due, 'day') : 0;
      return {
        key: r?._id || r?.billNumber || String(i),
        number: r?.billNumber || '—',
        customer: r?.partyId?.name || r?.partyName || '—',
        net: money(r?.netAmount),
        outstanding,
        outstandingLabel: money(outstanding),
        status,
        tone: overdue ? 'rejected' : meta.tone,
        badge: overdue ? `${overdueDays}d overdue` : meta.label,
        overdue,
        paid: status === 'PAID',
        meta: [
          r?.billDate ? dayjs(r.billDate).format('DD MMM YYYY') : null,
          due ? `due ${due.format('DD MMM')}` : null,
        ].filter(Boolean).join(' · '),
      };
    });
  }, [saleApi]);

  const saleBills = useMemo(() => {
    if (filter === 'Overdue') return all.filter((b) => b.overdue);
    if (filter === 'Unpaid') return all.filter((b) => b.outstanding > 0 && b.status !== 'CANCELLED');
    if (filter === 'Paid') return all.filter((b) => b.paid);
    return all;
  }, [all, filter]);

  const totalOutstanding = all.reduce((s, b) => s + b.outstanding, 0);
  const subtitle = all.length
    ? `${all.length} ${all.length === 1 ? 'invoice' : 'invoices'} · ${money(totalOutstanding)} outstanding`
    : '';

  return (
    <OwnerShell title="Sale bills" subtitle={subtitle} navigation={navigation} active="OwnerSaleBills">
      <View style={{ flex: 1 }}>
        <FilterChips options={['All', 'Overdue', 'Unpaid', 'Paid']} value={filter} onChange={setFilter} style={styles.chips} />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={saleLoading} onRefresh={refetch} tintColor={colors.primary} />}>
          {saleLoading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : saleBills.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title={filter === 'All' ? 'No sale bills' : `Nothing ${filter.toLowerCase()}`}
              message={filter === 'All'
                ? 'Invoices you raise will appear here with what customers owe.'
                : 'Try a different filter.'}
            />
          ) : saleBills.map((inv) => (
            <Card key={inv.key} elevated="sm" padding={14} style={inv.overdue && styles.overdue}>
              <View style={styles.top}>
                <AppText mono variant="bodyStrong" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{inv.number}</AppText>
                <Pill tone={inv.tone} label={inv.badge} />
              </View>
              <AppText variant="bodyStrong" weight="bold" numberOfLines={1} style={styles.customer}>{inv.customer}</AppText>
              <View style={styles.amounts}>
                <View style={{ gap: 2 }}>
                  <AppText variant="caption" muted>Bill value</AppText>
                  <AppText variant="small" weight="semibold" color={colors.textMuted}>{inv.net}</AppText>
                </View>
                <View style={{ gap: 2, alignItems: 'flex-end' }}>
                  <AppText variant="caption" muted>Outstanding</AppText>
                  <AppText variant="bodyStrong" weight="bold" color={inv.paid ? colors.success : inv.overdue ? colors.error : colors.text}>
                    {inv.outstandingLabel}
                  </AppText>
                </View>
              </View>
              <View style={styles.divider} />
              <AppText variant="caption" muted>{inv.meta}</AppText>
            </Card>
          ))}
        </ScrollView>
      </View>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: 18, paddingTop: 12 },
  scroll: { padding: 18, paddingTop: 12, gap: 10 },
  overdue: { borderWidth: 1, borderColor: '#F0CFCB' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  customer: { marginTop: 8 },
  amounts: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
});
