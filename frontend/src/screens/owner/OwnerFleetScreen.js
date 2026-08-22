import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, Loading, EmptyState, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Pill, RouteLine, toneColor } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import vehicleService from '../../services/vehicleService';

const TABS = [{ key: 'all', label: 'All 18' }, { key: 'running', label: 'Running 14' }, { key: 'idle', label: 'Idle 4' }];

/** O8 · Fleet — every truck and where it stands. */
export default function OwnerFleetScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('all');

  // Vehicle list — real API only.
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token;
  const { data: vehApi, loading: vehLoading, error, refetch } = useApi(
    () => vehicleService.listVehicles(),
    [],
    { enabled: useReal, fallback: null },
  );

  // Normalise vehicles defensively; fields without a real source fall back to
  // '—'. route is always a 2-item array so RouteLine is safe. (mapping to confirm)
  const fleet = useMemo(() => {
    const rows = Array.isArray(vehApi)
      ? vehApi
      : (vehApi?.items || vehApi?.results || vehApi?.vehicles || vehApi?.data || []);
    return rows.map((r) => ({
      plate: r.registrationNumber || r.vehicleNumber || r.plate || '—',
      status: r.status || 'neutral',
      badge: r.statusLabel || r.badge || r.status || '—',
      route: Array.isArray(r.route)
        ? r.route
        : [r.from ?? r.origin ?? '—', r.to ?? r.destination ?? '—'],
      driver: r.driverName || r.driver?.name || r.driver || '—',
      metric: r.metric || '—',
      metricColor: r.metricColor || null,
      action: r.action || null,
    }));
  }, [vehApi]);

  return (
    <OwnerShell title="Fleet" navigation={navigation} active="OwnerFleet"
      right={<View style={styles.search}><Ionicons name="search" size={18} color={colors.text} /></View>}>
      <View style={{ flex: 1 }}>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tab}>
              <AppText variant="bodyStrong" weight={tab === t.key ? 'bold' : 'semibold'} color={tab === t.key ? colors.primary : colors.textMuted}>{t.label}</AppText>
              <View style={[styles.underline, tab === t.key && styles.underlineOn]} />
            </Pressable>
          ))}
        </View>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={vehLoading} onRefresh={refetch} tintColor={colors.primary} />}>
          {vehLoading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : fleet.length === 0 ? (
            <EmptyState icon="bus-outline" title="No vehicles" message="Vehicles added to your fleet will appear here." />
          ) : fleet.map((v) => (
            <Card key={v.plate} elevated="sm" padding={14}>
              <View style={styles.top}>
                <AppText mono variant="bodyStrong" weight="semibold">{v.plate}</AppText>
                <Pill tone={v.status} label={v.badge} />
              </View>
              <View style={styles.routeWrap}><RouteLine from={v.route[0]} to={v.route[1]} size="small" /></View>
              <View style={styles.divider} />
              <View style={styles.foot}>
                <AppText variant="caption" mono muted>{v.driver}</AppText>
                {v.action ? (
                  <AppText variant="small" weight="bold" color={colors.primary}>{v.action}</AppText>
                ) : (
                  <AppText mono variant="small" weight="semibold" color={v.metricColor ? toneColor(v.metricColor) : colors.text}>{v.metric}</AppText>
                )}
              </View>
            </Card>
          ))}
        </ScrollView>
      </View>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  search: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: 18, paddingTop: 12 },
  tab: { alignItems: 'center', gap: 8, paddingTop: 4 },
  underline: { height: 2.5, width: '100%', borderRadius: 2, backgroundColor: 'transparent' },
  underlineOn: { backgroundColor: colors.primary },
  scroll: { padding: 18, paddingTop: 12, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeWrap: { marginTop: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
