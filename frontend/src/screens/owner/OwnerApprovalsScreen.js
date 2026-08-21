import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Pill, FilterChips } from '../../components/ui';
import * as mock from '../../demo/mock';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import approvalService from '../../services/approvalService';

const CAT_TONE = { Other: 'purple', Repair: 'info', Toll: 'warning', Food: 'warning', Loading: 'purple', Parking: 'info' };

/** O1 · Bills to confirm — the owner's queue. */
export default function OwnerApprovalsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');

  // Approvals queue → real when a backend is configured (else demo mock).
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token && token !== 'demo-token';
  const { data: apprApi, loading: apprLoading } = useApi(
    () => approvalService.listApprovals(),
    [],
    { enabled: useReal, fallback: null },
  );

  // mapping to confirm against live API — normalise each approval to the row
  // shape; unknown fields fall back to the mock per-field.
  const ownerBills = useMemo(() => {
    if (!useReal || !apprApi) return mock.ownerBills;
    const rows = Array.isArray(apprApi)
      ? apprApi
      : apprApi.items || apprApi.results || apprApi.approvals || apprApi.data || [];
    if (!rows.length) return mock.ownerBills;
    return rows.map((r, i) => {
      const m = mock.ownerBills[i] || {};
      const amt = r.amount ?? r.total ?? r.value;
      return {
        id: r._id || r.id || m.id || String(i),
        name: r.driverName || r.driver?.name || r.name || m.name,
        category: r.category || r.type || m.category,
        plate: r.vehicleNumber || r.plate || r.vehicle?.registrationNumber || m.plate,
        date: r.date || r.createdAt || m.date,
        desc: r.description || r.desc || r.remarks || m.desc,
        amount: amt != null ? `₹${Number(amt).toLocaleString('en-IN')}` : m.amount,
        file: r.fileType || r.file || m.file,
      };
    });
  }, [useReal, apprApi]);

  return (
    <OwnerShell
      title="Bills to confirm"
      subtitle={`${mock.owner.pendingCount} pending · ${mock.owner.pendingTotal}`}
      navigation={navigation}
      active="OwnerApprovals"
      right={<View style={styles.countPill}><AppText mono weight="bold" color={colors.white}>{mock.owner.pendingCount}</AppText></View>}
    >
      <View style={styles.wrap}>
        <FilterChips options={['All', 'Today', 'Above ₹2,000']} value={filter} onChange={setFilter} style={styles.chips} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {useReal && apprLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : ownerBills.map((b) => (
            <Card key={b.id} elevated="sm" padding={12} onPress={() => navigation.navigate('OwnerBillDetail')} style={styles.row}>
              <View style={styles.thumb}>
                <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
                <AppText variant="caption" mono muted style={{ fontSize: 8 }}>{b.file}</AppText>
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <AppText variant="bodyStrong" weight="bold">{b.name}</AppText>
                <View style={styles.metaRow}>
                  <Pill tone={CAT_TONE[b.category] || 'neutral'} label={b.category} />
                  <AppText variant="caption" mono muted>{b.plate}</AppText>
                  <AppText variant="caption" mono muted>{b.date}</AppText>
                </View>
                <AppText variant="caption" muted numberOfLines={1}>{b.desc}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <AppText mono variant="bodyStrong" weight="semibold">{b.amount}</AppText>
                <Ionicons name="chevron-forward" size={16} color="#B4B4BC" />
              </View>
            </Card>
          ))}
          <AppText variant="small" muted center style={styles.more}>8 more pending</AppText>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View>
            <AppText variant="label" muted>Selected</AppText>
            <AppText mono variant="bodyStrong" weight="semibold">0 bills</AppText>
          </View>
          <View style={styles.confirmDisabled}>
            <AppText variant="bodyStrong" weight="bold" color={colors.textMuted}>Confirm selected</AppText>
          </View>
        </View>
      </View>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  countPill: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  chips: { paddingHorizontal: 18, paddingTop: 12 },
  scroll: { padding: 18, paddingTop: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 52, height: 62, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  more: { marginTop: 4 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  confirmDisabled: { height: 46, paddingHorizontal: 20, borderRadius: radius.md, backgroundColor: '#ECECEE', alignItems: 'center', justifyContent: 'center' },
});
