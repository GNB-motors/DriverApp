import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, SectionHeader, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import managerService from '../../services/managerService';
import { DO_STATUS, metaFor } from '../../constants/erpStatus';
import dayjs from 'dayjs';

/** M8 · Delivery order — the brief behind a trip. */
export default function OpsDeliveryOrderScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Real delivery orders — no data until a backend is configured and signed in.
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data: ordersApi, loading, error, refetch } = useApi(
    () => managerService.listDeliveryOrders(),
    [],
    { enabled, fallback: [] },
  );

  // /erp/delivery-orders → [{ doNumber, doDate, fromLocation, toLocation,
  //   material, doType, qty, qtyUnit, liftedQty, balanceQty, sbRate, sbRateUnit,
  //   totalKm, status, expiryDate, partyId: { name, code, creditLimit },
  //   kamId: { firstName, lastName }, routeId: { name } }]
  // A DO has no stop list — it is a single from → to brief — so there is no
  // timeline to draw; the route is shown as two endpoints.
  const o = useMemo(() => {
    const list = Array.isArray(ordersApi)
      ? ordersApi
      : (ordersApi?.results || ordersApi?.rows || ordersApi?.items || ordersApi?.data || []);
    const d = list[0];
    if (!d) return null;
    const meta = metaFor(DO_STATUS, d.status);
    const unit = d.qtyUnit ? String(d.qtyUnit).toLowerCase() : '';
    const q = (v) => (v == null ? '—' : `${v}${unit ? ` ${unit}` : ''}`);
    return {
      id: d.doNumber || '—',
      route: [d.fromLocation, d.toLocation].filter(Boolean).join(' → ') || '—',
      from: d.fromLocation || '—',
      to: d.toLocation || '—',
      tone: meta.tone,
      badge: meta.label,
      km: d.totalKm != null ? `${d.totalKm} km` : '',
      party: d.partyId?.name || '—',
      kam: [d.kamId?.firstName, d.kamId?.lastName].filter(Boolean).join(' ') || '—',
      date: d.doDate ? dayjs(d.doDate).format('DD MMM YYYY') : '—',
      load: [
        [d.material || '—', 'material'],
        [q(d.qty), 'ordered'],
        [q(d.liftedQty), 'lifted'],
        [q(d.balanceQty), 'balance'],
        [`₹${Number(d.sbRate || 0).toLocaleString('en-IN')}`, (d.sbRateUnit || 'rate').toLowerCase().replace(/_/g, ' ')],
        [d.doType ? String(d.doType).replace(/_/g, ' ').toLowerCase() : '—', 'type'],
      ],
    };
  }, [ordersApi]);

  const timeline = (o?.stops || []).map((s) => ({ title: s.place, meta: s.meta, status: s.status }));

  return (
    <View style={styles.container}>
      <BackHeader title={o?.id || 'Delivery order'} subtitle={o?.route} onBack={() => navigation.goBack()} right={o ? <Pill tone={o.tone} label={o.badge} /> : null} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : !o ? (
          <EmptyState icon="document-text-outline" title="No delivery order" message="Delivery order details will appear here once one is created." />
        ) : (
          <>
        <Card elevated="sm" padding={16}>
          <SectionHeader label="Route" right={o.km ? <AppText variant="caption" mono muted>{o.km}</AppText> : null} />
          <View style={styles.routeRow}>
            <AppText variant="bodyStrong" weight="bold" numberOfLines={1} style={{ flex: 1 }}>{o.from}</AppText>
            <AppText variant="small" muted>→</AppText>
            <AppText variant="bodyStrong" weight="bold" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>{o.to}</AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.kv}><AppText variant="small" muted>Party</AppText><AppText variant="small" weight="semibold">{o.party}</AppText></View>
          <View style={styles.kv}><AppText variant="small" muted>KAM</AppText><AppText variant="small" weight="semibold">{o.kam}</AppText></View>
          <View style={styles.kv}><AppText variant="small" muted>DO date</AppText><AppText mono variant="small" weight="semibold">{o.date}</AppText></View>
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Load" />
          <View style={styles.grid}>
            {o.load.map(([v, k]) => (
              <View key={k} style={styles.cell}>
                <AppText mono={k !== 'material'} variant="bodyStrong" weight="semibold">{v}</AppText>
                <AppText variant="caption" muted>{k}</AppText>
              </View>
            ))}
          </View>
        </Card>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button variant="secondary" size="lg" label="Place a truck" style={{ flex: 1 }} onPress={() => navigation.navigate('OpsLoads')} />
        <Button size="lg" label="View trips" style={{ flex: 1 }} onPress={() => navigation.navigate('OpsTrips')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  cell: { width: '50%', paddingVertical: 10, gap: 3 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
