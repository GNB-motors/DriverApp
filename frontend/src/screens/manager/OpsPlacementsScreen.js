import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { AppText, Card, colors, spacing, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { Pill, StatTile, SectionHeader, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import managerService from '../../services/managerService';

/** Tanker board state → Pill tone + label. */
const BOARD_TONE = {
  AVAILABLE: { tone: 'success', label: 'Available' },
  ON_TRIP: { tone: 'in_transit', label: 'On trip' },
  MAINTENANCE: { tone: 'warning', label: 'Maintenance' },
};

/**
 * M9 · Placements — the tanker availability board.
 *
 * /erp/placements/board returns vehicle availability grouped by location, not a
 * placed/failed history: { summary: { total, available, onTrip, maintenance },
 * locations: [{ location, available, tankers: [...] }] }. The screen shows that.
 */
export default function OpsPlacementsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('all');

  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data: boardApi, loading, error, refetch } = useApi(
    () => managerService.getPlacementsBoard(),
    [],
    { enabled, fallback: null },
  );

  const p = useMemo(() => {
    const b = boardApi || {};
    const s = b.summary || {};
    const locations = Array.isArray(b.locations) ? b.locations : [];

    // tanker → row. Fields per the board payload.
    const mapTanker = (t, i) => {
      const meta = BOARD_TONE[t?.boardState] || { tone: 'neutral', label: t?.boardState || '—' };
      return {
        key: t?.vehicleId || String(i),
        id: t?.registrationNumber || '—',
        state: t?.boardState,
        tone: meta.tone,
        badge: meta.label,
        capacity: t?.capacity ? `${t.capacity} ${t.capacityUnit || ''}`.trim() : '',
        meta: [
          t?.previousMaterial ? `last: ${t.previousMaterial}` : null,
          t?.requiresCleaning ? 'needs cleaning' : null,
        ].filter(Boolean).join(' · '),
        right: t?.expectedFreeAt ? `free ${dayjs(t.expectedFreeAt).format('DD MMM')}` : '',
      };
    };

    const groups = locations.map((l) => ({
      location: l?.location || '—',
      rows: (Array.isArray(l?.tankers) ? l.tankers : []).map(mapTanker),
    }));

    return {
      stats: [
        { label: 'Total', value: String(Number(s.total) || 0) },
        { label: 'Available', value: String(Number(s.available) || 0), color: 'success' },
        { label: 'On trip', value: String(Number(s.onTrip) || 0) },
        { label: 'Service', value: String(Number(s.maintenance) || 0), color: (Number(s.maintenance) || 0) > 0 ? 'warning' : undefined },
      ],
      summary: s,
      groups,
      total: groups.reduce((n, g) => n + g.rows.length, 0),
    };
  }, [boardApi]);

  // Tabs filter by board state; counts come from the payload.
  const TABS = [
    { key: 'all', label: `All ${Number(p.summary.total) || 0}` },
    { key: 'available', label: `Available ${Number(p.summary.available) || 0}` },
    { key: 'onTrip', label: `On trip ${Number(p.summary.onTrip) || 0}` },
  ];
  const WANT = { all: null, available: 'AVAILABLE', onTrip: 'ON_TRIP' };

  const groups = useMemo(() => {
    const want = WANT[tab];
    return p.groups
      .map((g) => ({ ...g, rows: want ? g.rows.filter((r) => r.state === want) : g.rows }))
      .filter((g) => g.rows.length);
  }, [p.groups, tab]);

  const isEmpty = p.total === 0;

  return (
    <ManagerShell
      title="Placements"
      subtitle={p.total ? `${Number(p.summary.available) || 0} of ${Number(p.summary.total) || 0} available` : ''}
      navigation={navigation}
      active="OpsPlacements"
    >
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
          ) : isEmpty ? (
            <EmptyState icon="grid-outline" title="No tankers" message="Vehicles on the placement board will appear here." />
          ) : (
            <>
              <View style={styles.statRow}>
                {p.stats.map((s) => (
                  <View key={s.label} style={styles.statItem}>
                    <StatTile label={s.label} value={s.value} color={s.color} />
                  </View>
                ))}
              </View>

              {groups.length === 0 ? (
                <EmptyState title="None in this state" message="Try another tab." />
              ) : groups.map((g) => (
                <View key={g.location}>
                  <SectionHeader label={g.location} right={<AppText variant="caption" mono muted>{g.rows.length}</AppText>} />
                  <Card padding={0} elevated="sm">
                    {g.rows.map((r, i) => (
                      <View key={r.key} style={[styles.row, i > 0 && styles.rowDivider]}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <View style={styles.top}>
                            <AppText mono variant="bodyStrong" weight="semibold">{r.id}</AppText>
                            <Pill tone={r.tone} label={r.badge} />
                          </View>
                          {r.capacity ? <AppText variant="small" weight="semibold">{r.capacity}</AppText> : null}
                          {r.meta ? <AppText variant="caption" mono muted numberOfLines={1}>{r.meta}</AppText> : null}
                        </View>
                        {r.right ? <AppText variant="caption" mono muted>{r.right}</AppText> : null}
                      </View>
                    ))}
                  </Card>
                </View>
              ))}
            </>
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
  scroll: { padding: 18, paddingTop: 12, gap: 12 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statItem: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
