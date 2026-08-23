import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, Loading, EmptyState, colors, spacing } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { Pill, Monogram, SectionHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import advanceService from '../../services/advanceService';
import { ADVANCE_STATUS, metaFor } from '../../constants/erpStatus';

/** M10 · Advances — requests and the money already out. */
export default function OpsAdvancesScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Real advances — no data until a backend is configured and signed in.
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data: advancesApi, loading, error, refetch } = useApi(
    () => advanceService.listAdvances(),
    [],
    { enabled, fallback: null },
  );

  // /erp/advances → [{ advanceNumber, status, netPayable, requestedAmount,
  //   grossBudget, vehicleType, paidAt,
  //   driverId: { firstName, lastName }, vendorId: { name, code },
  //   tripId: { tripNumber, material, fromLocation, toLocation, state } }]
  // (advance.service.js `list` populates driverId / vendorId / tripId).
  const a = useMemo(() => {
    const rowsRaw = Array.isArray(advancesApi)
      ? advancesApi
      : (advancesApi?.results || advancesApi?.rows || advancesApi?.items || advancesApi?.data || []);
    if (!rowsRaw.length) return null;

    const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
    const initialsOf = (name) => String(name || '').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

    // An advance is raised against a driver (OWN) or a vendor (HIRE).
    const payeeOf = (r) => (r?.vendorId
      ? (r.vendorId.name || r.vendorId.code || 'Vendor')
      : [r?.driverId?.firstName, r?.driverId?.lastName].filter(Boolean).join(' ') || 'Driver');

    const mapRow = (r, i) => {
      const meta = metaFor(ADVANCE_STATUS, r?.status);
      const payee = payeeOf(r);
      return {
        key: r?._id || String(i),
        initials: initialsOf(payee) || '—',
        id: r?.advanceNumber || '—',
        status: meta.tone,
        badge: meta.label,
        meta: [payee, r?.tripId?.tripNumber, r?.tripId?.material].filter(Boolean).join(' · '),
        amount: money(r?.netPayable),
        strike: r?.status === 'CANCELLED',
      };
    };

    const waitingRaw = rowsRaw.filter((r) => r?.status === 'PENDING_APPROVAL');
    const recentRaw = rowsRaw.filter((r) => r?.status !== 'PENDING_APPROVAL');

    // "Out" is money actually released, not everything ever requested. The list
    // endpoint returns no budget ceiling, so there is no limit bar to draw.
    const paid = rowsRaw.filter((r) => r?.status === 'PAID');
    const outNum = paid.reduce((n, r) => n + (Number(r?.netPayable) || 0), 0);
    const waitingNum = waitingRaw.reduce((n, r) => n + (Number(r?.requestedAmount || r?.netPayable) || 0), 0);

    return {
      out: money(outNum),
      outMeta: `${paid.length} paid`,
      waitingAmount: money(waitingNum),
      waiting: waitingRaw.map(mapRow),
      recent: recentRaw.map(mapRow),
    };
  }, [advancesApi]);

  const list = (rows) => (
    <Card padding={0} elevated="sm">
      {rows.map((r, i) => (
        <View key={r.key} style={[styles.row, i > 0 && styles.rowDivider]}>
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
    <ManagerShell title="Advances" subtitle={a?.waiting?.length ? `${a.waiting.length} waiting` : undefined} navigation={navigation} active="OpsAdvances"
      right={a?.waiting?.length ? <View style={styles.count}><AppText mono weight="bold" color={colors.white}>{a.waiting.length}</AppText></View> : null}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
          {loading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : !a ? (
            <EmptyState title="No advances" message="Advance requests will appear here." />
          ) : (
            <>
          <Card elevated="sm" padding={16}>
            <View style={styles.budgetTop}>
              <AppText variant="label" muted>Advances paid</AppText>
              <AppText variant="caption" mono muted>{a.outMeta}</AppText>
            </View>
            <AppText mono weight="semibold" style={styles.big}>{a.out}</AppText>
            {a.waiting.length ? (
              <AppText variant="small" muted>{a.waitingAmount} across {a.waiting.length} awaiting approval</AppText>
            ) : null}
          </Card>

          {a.waiting.length ? (
            <>
              <SectionHeader label="Waiting on you" />
              {list(a.waiting)}
            </>
          ) : null}
          {a.recent.length ? (
            <>
              <SectionHeader label="Recent decisions" />
              {list(a.recent)}
            </>
          ) : null}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strike: { textDecorationLine: 'line-through' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
