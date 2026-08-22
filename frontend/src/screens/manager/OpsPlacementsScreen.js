import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, colors, spacing, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { Pill, StatTile, SectionHeader, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import managerService from '../../services/managerService';

const TABS = [{ key: 'all', label: 'All 13' }, { key: 'failed', label: 'Failed 2' }, { key: 'late', label: 'Late 3' }];

/** M9 · Placements — what was assigned, and how it went. */
export default function OpsPlacementsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('all');

  // Real placements board — no data until a backend is configured and signed in.
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data: boardApi, loading, error, refetch } = useApi(
    () => managerService.getPlacementsBoard(),
    [],
    { enabled, fallback: null },
  );

  // Normalize the placements board → { stats, today, yesterday }.
  // The board may arrive as {today,yesterday}, a flat/paginated list, or a
  // columns/lists board — guard every shape with optional chaining.
  const p = useMemo(() => {
    const b = boardApi || {};
    const mapRow = (r, i) => ({
      id: r?.doNo || r?.code || r?.id || r?._id || String(i),
      status: r?.status || r?.state || 'confirmed',
      badge: r?.badge || r?.statusLabel || r?.status || 'On time',
      route: r?.route || [r?.origin || r?.from, r?.destination || r?.to].filter(Boolean).join(' → '),
      meta: r?.meta || [r?.vehicleNo || r?.plate, r?.driverName || r?.driver].filter(Boolean).join(' · '),
      right: r?.right || r?.time || r?.placedAt || r?.note || '',
    });
    const cols = Array.isArray(b.columns) ? b.columns : (Array.isArray(b.lists) ? b.lists : null);
    const pick = (c) => c?.items || c?.cards || c?.rows || c?.list || c?.data;
    const colRows = cols ? cols.reduce((acc, c) => acc.concat(Array.isArray(pick(c)) ? pick(c) : []), []) : null;
    const flat = Array.isArray(b) ? b : (b.results || b.rows || b.items || b.data || colRows);
    let today = Array.isArray(b.today) ? b.today.map(mapRow) : null;
    let yesterday = Array.isArray(b.yesterday) ? b.yesterday.map(mapRow) : null;
    if (!today && Array.isArray(flat)) today = flat.map(mapRow);
    const stats = Array.isArray(b.stats)
      ? b.stats.map((s) => ({ label: s?.label, value: String(s?.value ?? s?.count ?? ''), color: s?.color }))
      : [];
    return {
      stats,
      today: today || [],
      yesterday: yesterday || [],
    };
  }, [boardApi]);

  const group = (label, rows) => (
    <>
      <SectionHeader label={label} />
      <Card padding={0} elevated="sm">
        {rows.map((r, i) => (
          <Pressable key={r.id} onPress={() => navigation.navigate('OpsDeliveryOrder')} style={[styles.row, i > 0 && styles.rowDivider]}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.top}>
                <AppText mono variant="bodyStrong" weight="semibold">{r.id}</AppText>
                <Pill tone={r.status} label={r.badge} />
              </View>
              <AppText variant="small" weight="semibold">{r.route}</AppText>
              <AppText variant="caption" mono muted>{r.meta}</AppText>
            </View>
            <AppText variant="caption" mono muted>{r.right}</AppText>
          </Pressable>
        ))}
      </Card>
    </>
  );

  return (
    <ManagerShell title="Placements" subtitle="This week · 11 placed · 2 failed" navigation={navigation} active="OpsPlacements"
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
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
          {loading ? (
            <Loading />
          ) : error ? (
            <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
          ) : (!p.stats.length && !p.today.length && !p.yesterday.length) ? (
            <EmptyState icon="grid-outline" title="No placements" message="Placed delivery orders will appear here." />
          ) : (
            <>
          <View style={styles.statRow}>
            {p.stats.map((s) => <StatTile key={s.label} label={s.label} value={s.value} color={s.color} />)}
          </View>
          {group('Today', p.today)}
          {group('Yesterday', p.yesterday)}
            </>
          )}
        </ScrollView>
      </View>
    </ManagerShell>
  );
}

const styles = StyleSheet.create({
  search: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: 18, paddingTop: 12 },
  tab: { alignItems: 'center', gap: 8, paddingTop: 4 },
  underline: { height: 2.5, width: '100%', borderRadius: 2, backgroundColor: 'transparent' },
  underlineOn: { backgroundColor: colors.primary },
  scroll: { padding: 18, paddingTop: 12, gap: 12 },
  statRow: { flexDirection: 'row', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
