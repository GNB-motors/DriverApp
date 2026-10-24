import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Card, Loading, EmptyState, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Pill } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import vehicleService from '../../services/vehicleService';

/** Vehicle.status enum (vehicle.model.js) → Pill tone + display word. */
const STATUS_META = {
  AVAILABLE: { tone: 'success', label: 'Available' },
  ON_TRIP: { tone: 'in_transit', label: 'On trip' },
  MAINTENANCE: { tone: 'warning', label: 'Maintenance' },
};

const TAB_STATUS = { all: null, onTrip: 'ON_TRIP', available: 'AVAILABLE', maintenance: 'MAINTENANCE' };

/** O8 · Fleet — every truck and where it stands. */
export default function OwnerFleetScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('all');

  const { token } = useAuth();
  const useReal = apiConfigured() && !!token;
  const { data: vehApi, loading: vehLoading, error, refetch } = useApi(
    () => vehicleService.listVehicles(),
    [],
    { enabled: useReal, fallback: null },
  );

  // /vehicles → [{ _id, registrationNumber, status, vehicleType, manufacturer,
  // chassisNumber }]. There is no route/driver/metric on this payload — those
  // belong to trips, so the card shows what a vehicle record actually holds.
  const all = useMemo(() => {
    const rows = Array.isArray(vehApi)
      ? vehApi
      : (vehApi?.items || vehApi?.results || vehApi?.rows || vehApi?.data || []);
    return rows.map((r, i) => {
      const status = r?.status || 'AVAILABLE';
      const meta = STATUS_META[status] || { tone: 'neutral', label: status };
      return {
        key: r?._id || r?.registrationNumber || String(i),
        plate: r?.registrationNumber || r?.vehicleNumber || '—',
        status,
        tone: meta.tone,
        badge: meta.label,
        detail: [r?.vehicleType, r?.manufacturer, r?.chassisNumber].filter(Boolean).join(' · '),
      };
    });
  }, [vehApi]);

  // Tab labels carry live counts instead of the hardcoded ones they replaced.
  const counts = useMemo(() => ({
    all: all.length,
    onTrip: all.filter((v) => v.status === 'ON_TRIP').length,
    available: all.filter((v) => v.status === 'AVAILABLE').length,
    maintenance: all.filter((v) => v.status === 'MAINTENANCE').length,
  }), [all]);

  const TABS = [
    { key: 'all', label: `All ${counts.all}` },
    { key: 'onTrip', label: `On trip ${counts.onTrip}` },
    { key: 'available', label: `Available ${counts.available}` },
    { key: 'maintenance', label: `Service ${counts.maintenance}` },
  ];

  const fleet = useMemo(() => {
    const want = TAB_STATUS[tab];
    return want ? all.filter((v) => v.status === want) : all;
  }, [all, tab]);

  return (
    <OwnerShell title="Fleet" subtitle={all.length ? `${all.length} ${all.length === 1 ? 'vehicle' : 'vehicles'}` : ''} navigation={navigation} active="OwnerFleet">
      <View style={{ flex: 1 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tab}>
              <AppText variant="bodyStrong" weight={tab === t.key ? 'bold' : 'semibold'} color={tab === t.key ? colors.primary : colors.textMuted}>{t.label}</AppText>
              <View style={[styles.underline, tab === t.key && styles.underlineOn]} />
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={vehLoading} onRefresh={refetch} tintColor={colors.primary} />}>
          {vehLoading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : fleet.length === 0 ? (
            <EmptyState
              icon="bus-outline"
              title={tab === 'all' ? 'No vehicles' : 'None in this state'}
              message={tab === 'all' ? 'Vehicles added to your fleet will appear here.' : 'Try another tab.'}
            />
          ) : fleet.map((v) => (
            <Card key={v.key} elevated="sm" padding={14}>
              <View style={styles.top}>
                <AppText mono variant="bodyStrong" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{v.plate}</AppText>
                <Pill tone={v.tone} label={v.badge} />
              </View>
              {v.detail ? (
                <>
                  <View style={styles.divider} />
                  <AppText variant="caption" muted numberOfLines={1}>{v.detail}</AppText>
                </>
              ) : null}
            </Card>
          ))}
        </ScrollView>
      </View>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: 18, paddingTop: 12 },
  tab: { alignItems: 'center', gap: 8, paddingTop: 4 },
  underline: { height: 2.5, width: '100%', borderRadius: 2, backgroundColor: 'transparent' },
  underlineOn: { backgroundColor: colors.primary },
  scroll: { padding: 18, paddingTop: 12, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
});
