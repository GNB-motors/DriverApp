import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { AppText, Card, Loading, EmptyState, colors, spacing, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { Pill, RouteLine } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import managerService from '../../services/managerService';
import { TRIP_STATE, metaFor } from '../../constants/erpStatus';

/** Trips still moving. */
const RUNNING_STATES = ['PLACED', 'DISPATCHED'];

/**
 * A trip is blocked when a gate still has to clear before it can move on:
 * the advance is awaiting approval, or the CN has not been entered yet.
 * (erpTrip.constants.js: ADVANCE_GATES / CN_GATES.)
 */
const isBlocked = (t) =>
  t?.state === 'PLACED' && (t?.advanceGate === 'PENDING' || t?.cnGate === 'NONE');

/** The backend only accepts a close from DISPATCHED (erpTrip.service.js). */
const isCloseable = (t) => t?.state === 'DISPATCHED';

/** M2 · Trips board — the board ops works from. */
export default function OpsTripsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  // Ops home deep-links into a specific bucket ("3 consignment notes" → blocked).
  const wantTab = route?.params?.tab;
  const [tab, setTab] = useState(wantTab || 'running');
  // Navigating here again with a different tab must move the selection, which a
  // useState initialiser alone would not do.
  useEffect(() => { if (wantTab) setTab(wantTab); }, [wantTab]);

  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data: tripsApi, loading, error, refetch } = useApi(
    () => managerService.listErpTrips(),
    [],
    { enabled, fallback: [] },
  );

  // /erp/trips → [{ _id, tripNumber, state, fromLocation, toLocation, material,
  //   vehicleNumber, vehicleType, plannedQty, loadedQty, totalKm, tripDate,
  //   advanceGate, cnGate, partyId: { name, code }, doId: { doNumber } }]
  const all = useMemo(() => {
    const rows = Array.isArray(tripsApi)
      ? tripsApi
      : (tripsApi?.results || tripsApi?.rows || tripsApi?.items || tripsApi?.data || []);
    return rows.map((e, i) => {
      const meta = metaFor(TRIP_STATE, e?.state);
      const qty = e?.loadedQty ?? e?.plannedQty;
      return {
        key: e?._id || String(i),
        _id: e?._id || null,
        id: e?.tripNumber || '—',
        raw: e,
        tone: meta.tone,
        badge: meta.label,
        route: [e?.fromLocation || '—', e?.toLocation || '—'],
        foot: [e?.vehicleNumber, e?.partyId?.name].filter(Boolean).join(' · '),
        meta: [
          e?.material,
          qty != null ? `${qty}` : null,
          e?.totalKm ? `${e.totalKm} km` : null,
        ].filter(Boolean).join(' · '),
        date: e?.tripDate ? dayjs(e.tripDate).format('DD MMM') : '',
        blocked: isBlocked(e),
      };
    });
  }, [tripsApi]);

  // Counts are derived, not baked into the tab labels.
  const buckets = useMemo(() => ({
    running: all.filter((t) => RUNNING_STATES.includes(t.raw?.state)),
    blocked: all.filter((t) => t.blocked),
    close: all.filter((t) => isCloseable(t.raw)),
  }), [all]);

  const TABS = [
    { key: 'running', label: `Running ${buckets.running.length}` },
    { key: 'blocked', label: `Blocked ${buckets.blocked.length}` },
    { key: 'close', label: `To close ${buckets.close.length}` },
  ];

  const list = buckets[tab] || [];

  return (
    <ManagerShell title="Trips" subtitle={all.length ? `${all.length} total` : ''} navigation={navigation} active="OpsTrips">
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
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
          {loading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : list.length === 0 ? (
            <EmptyState
              title={all.length ? 'Nothing in this bucket' : 'No trips'}
              message={all.length ? 'Try another tab.' : "Trips will appear here once they're created."}
            />
          ) : (
            list.map((t) => (
              <Card
                key={t.key}
                elevated="sm"
                padding={14}
                onPress={() => navigation.navigate('OpsTripDetail', { id: t._id })}
                style={t.blocked && styles.warnBorder}
              >
                <View style={styles.top}>
                  <AppText mono variant="bodyStrong" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{t.id}</AppText>
                  <Pill tone={t.tone} label={t.badge} />
                </View>
                <View style={styles.routeWrap}><RouteLine from={t.route[0]} to={t.route[1]} /></View>
                <View style={styles.divider} />
                <View style={styles.foot}>
                  <AppText variant="caption" mono muted numberOfLines={1} style={{ flexShrink: 1 }}>{t.foot}</AppText>
                  <AppText variant="caption" mono muted>{t.date}</AppText>
                </View>
                {t.meta ? <AppText variant="caption" muted numberOfLines={1}>{t.meta}</AppText> : null}
              </Card>
            ))
          )}
        </ScrollView>
      </View>
    </ManagerShell>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: 18, paddingTop: 12 },
  tab: { alignItems: 'center', gap: 8, paddingTop: 4 },
  underline: { height: 2.5, width: '100%', borderRadius: 2, backgroundColor: 'transparent' },
  underlineOn: { backgroundColor: colors.primary },
  scroll: { padding: 18, paddingTop: 12, gap: 10 },
  warnBorder: { borderWidth: 1, borderColor: '#F3D9AE' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  routeWrap: { marginTop: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
