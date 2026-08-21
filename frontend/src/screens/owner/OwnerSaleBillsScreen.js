import React, { useState, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, colors, spacing } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Pill, FilterChips } from '../../components/ui';
import * as own from '../../demo/ownerMock';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import ownerService from '../../services/ownerService';

/** O7 · Sale bills — what customers owe. */
export default function OwnerSaleBillsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');

  // Sale bills → real when a backend is configured (else demo mock).
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token && token !== 'demo-token';
  const { data: saleApi, loading: saleLoading } = useApi(
    () => ownerService.listSaleBills(),
    [],
    { enabled: useReal, fallback: null },
  );

  // mapping to confirm against live API — normalise invoices; unknown fields
  // fall back to the mock per-field.
  const saleBills = useMemo(() => {
    if (!useReal || !saleApi) return own.saleBills;
    const rows = Array.isArray(saleApi)
      ? saleApi
      : saleApi.items || saleApi.results || saleApi.bills || saleApi.data || [];
    if (!rows.length) return own.saleBills;
    return rows.map((r, i) => {
      const m = own.saleBills[i] || {};
      const amt = r.amount ?? r.total ?? r.value;
      return {
        id: r.invoiceNumber || r.number || r._id || r.id || m.id,
        status: r.status || m.status,
        badge: r.badge || r.statusLabel || m.badge,
        amount: amt != null ? `₹${Number(amt).toLocaleString('en-IN')}` : m.amount,
        customer: r.customerName || r.customer?.name || r.customer || m.customer,
        meta: r.meta || m.meta,
      };
    });
  }, [useReal, saleApi]);

  return (
    <OwnerShell title="Sale bills" subtitle="24 invoices · ₹4.2 L outstanding" navigation={navigation} active="OwnerSaleBills">
      <View style={{ flex: 1 }}>
        <FilterChips options={['All', 'Overdue', 'Unpaid', 'Paid']} value={filter} onChange={setFilter} style={styles.chips} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {useReal && saleLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : saleBills.map((inv) => (
            <Card key={inv.id} elevated="sm" padding={14} style={[inv.status === 'overdue' && styles.overdue]}>
              <View style={styles.top}>
                <View style={styles.idRow}>
                  <AppText mono variant="bodyStrong" weight="semibold">{inv.id}</AppText>
                  <Pill tone={inv.status} label={inv.badge} />
                </View>
                <AppText mono variant="bodyStrong" weight="semibold" color={inv.status === 'paid' ? colors.textMuted : colors.text}>{inv.amount}</AppText>
              </View>
              <AppText variant="bodyStrong" weight="bold" style={styles.customer}>{inv.customer}</AppText>
              <View style={styles.divider} />
              <View style={styles.foot}>
                <AppText variant="caption" mono muted>{inv.meta}</AppText>
                <AppText variant="small" weight="bold" color={inv.status === 'overdue' ? colors.error : colors.primary}>View</AppText>
              </View>
            </Card>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button size="lg" icon="add" label="Raise a sale bill" onPress={() => {}} />
        </View>
      </View>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: 18, paddingTop: 12 },
  scroll: { padding: 18, paddingTop: 12, gap: 10, paddingBottom: 90 },
  overdue: { borderWidth: 1, borderColor: '#F0CFCB' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customer: { marginTop: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
