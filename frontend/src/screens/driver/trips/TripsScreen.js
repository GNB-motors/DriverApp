import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { AppText, Card, StatusBadge, Loading, EmptyState, colors, spacing, radius } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import tripService from '../../../services/tripService';

/**
 * ErpTrip.state → StatusBadge key + tab bucket
 * (erpTrip.constants.js ERP_TRIP_STATES).
 */
const STATUS_MAP = {
  PLACED: { key: 'assigned', label: 'Placed', tab: 'active' },
  ADVANCE_PENDING: { key: 'pending', label: 'Advance pending', tab: 'active' },
  ADVANCE_PAID: { key: 'confirmed', label: 'Advance paid', tab: 'active' },
  CN_PENDING: { key: 'pending', label: 'CN pending', tab: 'active' },
  CN_UPDATED: { key: 'confirmed', label: 'CN updated', tab: 'active' },
  DISPATCHED: { key: 'in_transit', label: 'In transit', tab: 'active' },
  TRIP_CLOSED: { key: 'closed', label: 'Closed', tab: 'completed' },
  POD_RECEIVED: { key: 'verified', label: 'POD received', tab: 'completed' },
  UNLOADED: { key: 'closed', label: 'Unloaded', tab: 'completed' },
  BILLED: { key: 'paid', label: 'Billed', tab: 'completed' },
  CANCELLED: { key: 'rejected', label: 'Cancelled', tab: 'cancelled' },
};
const statusOf = (s) => STATUS_MAP[s] || { key: 'draft', label: String(s || '—'), tab: 'active' };

/**
 * 04 · My trips — filtered list. UI-only demo.
 */
const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function TripsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('active');
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data: tripsApi, loading, error, refetch } = useApi(() => tripService.listTrips(), [], { enabled, fallback: [] });

  // /app/v1/trips → the driver's own ERP trips.
  const allTrips = React.useMemo(() => {
    const rows = Array.isArray(tripsApi)
      ? tripsApi
      : (tripsApi?.results || tripsApi?.rows || tripsApi?.trips || tripsApi?.items || tripsApi?.data || []);
    return rows.map((t, i) => {
      const meta = statusOf(t?.state);
      const qty = t?.loadedQty ?? t?.plannedQty;
      return {
        id: t?.tripNumber || String(i),
        _id: t?._id || null,
        status: meta.key,
        label: meta.label,
        from: t?.fromLocation || '—',
        to: t?.toLocation || '—',
        plate: t?.vehicleNumber || t?.vehicleId?.registrationNumber || '—',
        meta: [
          t?.tripDate ? dayjs(t.tripDate).format('DD MMM') : null,
          t?.material,
          qty != null ? `${qty}` : null,
        ].filter(Boolean).join(' · '),
        earning: t?.totalKm ? `${Number(t.totalKm).toLocaleString('en-IN')} km` : '',
        tab: meta.tab,
        action: 'Open',
      };
    });
  }, [tripsApi]);
  const list = allTrips.filter((tr) => tr.tab === tab);

  const openTrip = (tr) => {
    if (tr.status === 'in_transit') navigation.navigate('ActiveTrip', { id: tr._id });
    else if (tr.status === 'late') navigation.navigate('Pod');
    else navigation.navigate('TripDetail', { id: tr._id });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <AppText variant="h2" weight="extrabold">My trips</AppText>
        <Pressable hitSlop={8} style={styles.iconBtn}><Ionicons name="search" size={20} color={colors.text} /></Pressable>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tb) => {
          const active = tb.key === tab;
          return (
            <Pressable key={tb.key} style={styles.tabBtn} onPress={() => setTab(tb.key)}>
              <AppText variant="bodyStrong" weight={active ? 'bold' : 'semibold'} color={active ? colors.primary : colors.textMuted}>
                {tb.label}
              </AppText>
              <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : list.length === 0 ? (
          <EmptyState icon="cube-outline" title={`No ${tab} trips`} message="Trips will appear here once they're assigned to you." />
        ) : (
          list.map((tr) => (
            <Card key={tr._id || tr.id} elevated="sm" padding={14} onPress={() => openTrip(tr)} style={[styles.tripCard, tr.status === 'in_transit' && styles.tripActive]}>
              <View style={styles.tripTop}>
                <AppText mono variant="bodyStrong" weight="semibold">{tr.id}</AppText>
                <StatusBadge status={tr.status} label={tr.label} />
              </View>
              <View style={styles.route}>
                <AppText variant="body" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{tr.from}</AppText>
                <View style={styles.dashed} />
                <AppText variant="body" weight="semibold" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>{tr.to}</AppText>
              </View>
              <View style={styles.tripBottom}>
                <AppText variant="caption" mono muted>{tr.meta}</AppText>
                {tr.earning ? (
                  <AppText mono variant="small" weight="semibold" color={colors.success}>{tr.earning}</AppText>
                ) : (
                  <View style={styles.actionLink}>
                    <AppText variant="small" weight="bold" color={colors.primary}>{tr.action} →</AppText>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingBottom: 10,
  },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: 22, gap: spacing.lg },
  tabBtn: { alignItems: 'center', gap: 8, paddingTop: 4 },
  tabUnderline: { height: 2.5, width: '100%', borderRadius: 2, backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: colors.primary },
  scroll: { paddingHorizontal: 22, paddingTop: 14, gap: 12 },
  tripCard: { gap: 12 },
  tripActive: { borderWidth: 1, borderColor: '#C7D0F7' },
  tripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dashed: { flex: 1, height: 0, borderTopWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  tripBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionLink: {},
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
});
