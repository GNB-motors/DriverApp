import React, { useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, Stepper, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, SectionHeader } from '../../components/ui';
import * as own from '../../demo/managerMock';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import managerService from '../../services/managerService';

/** M8 · Delivery order — the brief behind a trip. */
export default function OpsDeliveryOrderScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Real delivery order when a backend is configured (else demo mock).
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token && token !== 'demo-token';
  const { data: ordersApi, loading } = useApi(
    () => managerService.listDeliveryOrders(),
    [],
    { enabled: useReal, fallback: null },
  );

  // Normalize the first delivery order → the DO shape (per-field mock fallback).
  // mapping to confirm against live API
  const o = useMemo(() => {
    const m = own.opsDo;
    if (!useReal || !ordersApi) return m;
    const list = Array.isArray(ordersApi) ? ordersApi : (ordersApi.results || ordersApi.rows || ordersApi.items || ordersApi.data || []);
    const d = list[0];
    if (!d) return m;
    const money = (v) => (v != null ? `₹${Number(v).toLocaleString('en-IN')}` : undefined);
    const stops = Array.isArray(d.stops) && d.stops.length
      ? d.stops.map((s, i) => ({ place: s.place || s.name || s.location || m.stops[i]?.place || 'Stop', meta: s.meta || s.window || s.eta || m.stops[i]?.meta || '', status: s.status || m.stops[i]?.status || 'todo' }))
      : m.stops;
    const load = Array.isArray(d.load) ? d.load : [
      [d.material || d.commodity || m.load[0][0], 'material'],
      [d.weight != null ? `${d.weight} t` : m.load[1][0], 'weight'],
      [money(d.freight) || m.load[2][0], 'freight'],
      [d.rate || m.load[3][0], 'rate'],
    ];
    return {
      id: d.doNo || d.code || d.id || d._id || m.id,
      route: d.route || [d.origin || d.from, d.destination || d.to].filter(Boolean).join(' → ') || m.route,
      stops,
      km: d.km != null ? `${d.km} km` : m.km,
      load,
    };
  }, [useReal, ordersApi]);
  const timeline = o.stops.map((s) => ({ title: s.place, meta: s.meta, status: s.status }));

  return (
    <View style={styles.container}>
      <BackHeader title={o.id} subtitle={o.route} onBack={() => navigation.goBack()} right={<Pill tone="success" label="Placed" />} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {useReal && loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
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
