import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, Stepper, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, SectionHeader, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import managerService from '../../services/managerService';

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

  // Normalize the first delivery order → the DO shape (optional chaining + safe defaults).
  const o = useMemo(() => {
    const list = Array.isArray(ordersApi)
      ? ordersApi
      : (ordersApi?.results || ordersApi?.rows || ordersApi?.items || ordersApi?.data || (ordersApi && typeof ordersApi === 'object' ? [ordersApi] : []));
    const d = list[0];
    if (!d) return null;
    const money = (v) => (v != null ? `₹${Number(v).toLocaleString('en-IN')}` : undefined);
    const stops = Array.isArray(d.stops) && d.stops.length
      ? d.stops.map((s) => ({ place: s?.place || s?.name || s?.location || 'Stop', meta: s?.meta || s?.window || s?.eta || '', status: s?.status || 'todo' }))
      : [];
    const load = Array.isArray(d.load) ? d.load : [
      [d.material || d.commodity || '—', 'material'],
      [d.weight != null ? `${d.weight} t` : '—', 'weight'],
      [money(d.freight) || '—', 'freight'],
      [d.rate || '—', 'rate'],
    ];
    return {
      id: d.doNo || d.code || d.id || d._id || '—',
      route: d.route || [d.origin || d.from, d.destination || d.to].filter(Boolean).join(' → ') || '—',
      stops,
      km: d.km != null ? `${d.km} km` : '',
      load,
    };
  }, [ordersApi]);
  const timeline = (o?.stops || []).map((s) => ({ title: s.place, meta: s.meta, status: s.status }));

  return (
    <View style={styles.container}>
      <BackHeader title={o?.id || 'Delivery order'} subtitle={o?.route} onBack={() => navigation.goBack()} right={<Pill tone="success" label="Placed" />} />
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
          <SectionHeader label="Route" />
          <View style={{ marginTop: 12 }}><Stepper steps={timeline} /></View>
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Load" right={<AppText variant="caption" mono muted>{o.km}</AppText>} />
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
        <Button variant="secondary" size="lg" label="Reassign" style={{ flex: 1 }} onPress={() => navigation.navigate('OpsLoads')} />
        <Button size="lg" label="Start trip" style={{ flex: 1.3 }} onPress={() => navigation.navigate('OpsTrips')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  cell: { width: '50%', paddingVertical: 10, gap: 3 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
