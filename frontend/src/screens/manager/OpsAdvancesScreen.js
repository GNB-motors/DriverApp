import React, { useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, colors, spacing, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { Pill, Monogram, SectionHeader } from '../../components/ui';
import * as own from '../../demo/managerMock';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import advanceService from '../../services/advanceService';

/** M10 · Advances — requests and the money already out. */
export default function OpsAdvancesScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Real advances when a backend is configured (else demo mock).
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token && token !== 'demo-token';
  const { data: advancesApi, loading } = useApi(
    () => advanceService.listAdvances(),
    [],
    { enabled: useReal, fallback: null },
  );

  // Normalize advances → { out, limit, percent, waiting, recent }.
  // Budget aggregates stay on mock; rows split by status. mapping to confirm against live API
  const a = useMemo(() => {
    const m = own.opsAdvances;
    if (!useReal || !advancesApi) return m;
    const rowsRaw = Array.isArray(advancesApi) ? advancesApi : (advancesApi.results || advancesApi.rows || advancesApi.items || advancesApi.data || []);
    if (!rowsRaw.length) return m;
    const money = (v) => (v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '₹0');
    const initialsOf = (name) => String(name || '').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    const toneOf = (s) => {
      const v = String(s || '').toLowerCase();
      if (v.includes('paid')) return 'paid';
      if (v.includes('reject')) return 'error';
      if (v.includes('approv')) return 'in_transit';
      return 'pending';
    };
    const mapRow = (r, i) => {
      const tone = toneOf(r.status);
      return {
        initials: r.initials || initialsOf(r.driverName || r.driver || r.name),
        id: r.advanceNo || r.code || r.id || r._id || String(i),
        status: tone,
        badge: r.badge || r.statusLabel || r.status || (tone === 'pending' ? 'Pending' : 'Approved'),
        meta: r.meta || [r.driverName || r.driver || r.name, r.tripNo || r.ref, r.age].filter(Boolean).join(' · '),
        amount: money(r.amount),
        strike: tone === 'error',
      };
    };
    const isPending = (r) => !r.status || String(r.status).toLowerCase().includes('pend');
    const waitingRaw = rowsRaw.filter(isPending);
    const recentRaw = rowsRaw.filter((r) => !isPending(r));
    return {
      ...m,
      waiting: waitingRaw.length ? waitingRaw.map(mapRow) : m.waiting,
      recent: recentRaw.length ? recentRaw.map(mapRow) : m.recent,
    };
  }, [useReal, advancesApi]);

  const list = (rows) => (
    <Card padding={0} elevated="sm">
      {rows.map((r, i) => (
        <View key={r.id} style={[styles.row, i > 0 && styles.rowDivider]}>
          <Monogram initials={r.initials} size={40} />
          <View style={{ flex: 1, gap: 3 }}>
            <View style={styles.top}>
              <AppText mono variant="bodyStrong" weight="semibold">{r.id}</AppText>
              <Pill tone={r.status} label={r.badge} />
            </View>
            <AppText variant="caption" mono muted>{r.meta}</AppText>
          </View>
          <AppText mono variant="bodyStrong" weight="semibold" color={r.strike ? colors.textMuted : colors.text} style={r.strike ? styles.strike : null}>{r.amount}</AppText>
        </View>
      ))}
    </Card>
  );

  return (
    <ManagerShell title="Advances" subtitle="3 waiting · ₹9,500" navigation={navigation} active="OpsAdvances"
      right={<View style={styles.count}><AppText mono weight="bold" color={colors.white}>3</AppText></View>}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {useReal && loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <>
          <Card elevated="sm" padding={16}>
            <View style={styles.budgetTop}>
              <AppText variant="label" muted>Out this month</AppText>
              <AppText variant="caption" mono muted>{a.limit}</AppText>
            </View>
            <AppText mono weight="semibold" style={styles.big}>{a.out}</AppText>
            <View style={styles.track}><View style={[styles.fill, { width: `${a.percent}%` }]} /></View>
          </Card>

          <SectionHeader label="Waiting on you" />
          {list(a.waiting)}
          <SectionHeader label="Recent decisions" />
          {list(a.recent)}
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button size="lg" label="Review oldest request" onPress={() => navigation.navigate('OpsApprovals')} />
        </View>
      </View>
    </ManagerShell>
  );
}

const styles = StyleSheet.create({
  count: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 18, gap: 12, paddingBottom: 90 },
  budgetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  big: { fontSize: 28, lineHeight: 32, marginVertical: 6 },
  track: { height: 8, borderRadius: radius.full, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.full, backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strike: { textDecorationLine: 'line-through' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
