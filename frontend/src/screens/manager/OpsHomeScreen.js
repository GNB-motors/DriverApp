import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, Loading, EmptyState, colors, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { Eyebrow, KpiTile, TONE } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import approvalService from '../../services/approvalService';
import ownerService from '../../services/ownerService';
import managerService from '../../services/managerService';

/**
 * The ops action queue, in pipeline order. Each row reads one counter off
 * /erp/dashboard/summary.pendingCounts and opens the screen that clears it.
 */
const QUEUES = [
  // A trip with no CN yet is what the board calls "blocked", so that row opens
  // the blocked bucket rather than the whole list.
  { key: 'pendingCns', label: 'Consignment notes', icon: 'document-text-outline', tone: 'purple', to: 'OpsTrips', params: { tab: 'blocked' } },
  { key: 'pendingTripClose', label: 'Trips to close', icon: 'checkmark-done-outline', tone: 'warning', to: 'OpsTrips', params: { tab: 'close' } },
  { key: 'pendingUnloadings', label: 'Unloading to record', icon: 'cube-outline', tone: 'info', to: 'OpsUnloading' },
  // No manager POD or billing screen exists yet, so these land on the running
  // board — the closest surface that lists the trips concerned.
  { key: 'pendingPods', label: 'PODs to collect', icon: 'reader-outline', tone: 'info', to: 'OpsTrips', params: { tab: 'running' } },
  { key: 'pendingBillSubmissions', label: 'Bills to submit', icon: 'receipt-outline', tone: 'success', to: 'OpsTrips', params: { tab: 'running' } },
];

/** M1 · Ops home — the shift at a glance. */
export default function OpsHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const { token, organization } = useAuth();
  const enabled = apiConfigured() && !!token;

  // The operational picture lives on the ERP dashboard summary; the approvals
  // summary carries only { total, byType }, which is why this screen used to
  // render an empty board.
  const { data: dash, loading, error, refetch: refetchDash } = useApi(
    () => ownerService.getErpDashboard(),
    [],
    { enabled, fallback: null },
  );
  const { data: appr, refetch: refetchAppr } = useApi(
    () => approvalService.getApprovalsSummary(),
    [],
    { enabled, fallback: null },
  );
  const { data: board, refetch: refetchBoard } = useApi(
    () => managerService.getPlacementsBoard(),
    [],
    { enabled, fallback: null },
  );
  const onRefresh = () => { refetchDash(); refetchAppr(); refetchBoard(); };

  const o = useMemo(() => {
    const pc = dash?.pendingCounts || {};
    const trips = pc.activeTrips || {};
    const bs = board?.summary || {};

    const queues = QUEUES
      .map((q) => ({ ...q, count: Number(pc[q.key]) || 0 }))
      .filter((q) => q.count > 0);

    const actionTotal = queues.reduce((n, q) => n + q.count, 0);
    const approvals = Number(appr?.total ?? pc.pendingApprovals ?? 0);
    const running = (Number(trips.PLACED) || 0) + (Number(trips.DISPATCHED) || 0);

    return {
      actionTotal,
      approvals,
      queues,
      running,
      placed: Number(trips.PLACED) || 0,
      dispatched: Number(trips.DISPATCHED) || 0,
      dos: Number(pc.dos) || 0,
      placedToday: Number(pc.placementsToday) || 0,
      available: Number(bs.available) || 0,
      fleetTotal: Number(bs.total) || 0,
      onTrip: Number(bs.onTrip) || 0,
      maintenance: Number(bs.maintenance) || 0,
    };
  }, [dash, appr, board]);

  const empty = !dash && !appr && !board;

  return (
    <ManagerShell title="Ops home" subtitle={organization?.companyName || 'Ops desk'} navigation={navigation} active="OpsHome">
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={onRefresh} />
        ) : empty ? (
          <EmptyState title="You're all caught up" message="Blocked trips and pending approvals will show up here." />
        ) : (
          <>
            <Pressable onPress={() => navigation.navigate('OpsTrips')}>
              <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.hero}>
                <View style={styles.heroTop}>
                  <AppText weight="semibold" style={styles.heroEyebrow} numberOfLines={1}>Needs action today</AppText>
                  {o.approvals > 0 ? (
                    <View style={styles.heroPill}>
                      <AppText weight="semibold" style={styles.heroPillText}>{o.approvals} to approve</AppText>
                    </View>
                  ) : null}
                </View>
                <View style={styles.heroMain}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText mono weight="medium" color={colors.white} numberOfLines={1} style={styles.heroBig}>
                      {o.actionTotal} {o.actionTotal === 1 ? 'task' : 'tasks'}
                    </AppText>
                    <AppText style={styles.heroSub} numberOfLines={1}>
                      {o.actionTotal ? 'across the trip pipeline' : 'pipeline is clear'}
                    </AppText>
                  </View>
                  <View style={styles.heroChevron}><Ionicons name="chevron-forward" size={20} color={colors.white} /></View>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroFoot}>
                  <AppText style={styles.heroFootText}>{o.running} trips running</AppText>
                  <AppText style={styles.heroFootText}>{o.available} trucks free</AppText>
                </View>
              </LinearGradient>
            </Pressable>

            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <KpiTile label="Trips running" value={String(o.running)} unit={`${o.placed}P · ${o.dispatched}D`} />
              </View>
              <View style={styles.gridItem}>
                <KpiTile
                  label="Trucks free"
                  value={String(o.available)}
                  unit={o.fleetTotal ? `of ${o.fleetTotal}` : null}
                  tone={o.available === 0 && o.fleetTotal > 0 ? colors.warning : undefined}
                />
              </View>
              <View style={styles.gridItem}>
                <KpiTile label="Open DOs" value={String(o.dos)} unit={o.placedToday ? `${o.placedToday} today` : null} />
              </View>
              <View style={styles.gridItem}>
                <KpiTile
                  label="Approvals"
                  value={String(o.approvals)}
                  unit={o.approvals ? 'waiting' : 'clear'}
                  tone={o.approvals > 0 ? colors.warning : undefined}
                />
              </View>
            </View>

            <Card elevated="sm" padding={16} style={styles.card}>
              <View style={styles.cardHead}>
                <Eyebrow>Action queues</Eyebrow>
                {o.maintenance > 0 ? (
                  <AppText style={styles.headMeta}>{o.maintenance} in service</AppText>
                ) : null}
              </View>
              {o.queues.length === 0 ? (
                <View style={styles.clearRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <AppText variant="small" weight="semibold" color={colors.success}>Nothing pending in the pipeline</AppText>
                </View>
              ) : (
                <View style={styles.queueList}>
                  {o.queues.map((q) => {
                    const tone = TONE[q.tone] || TONE.neutral;
                    return (
                      <Pressable key={q.key} onPress={() => navigation.navigate(q.to, q.params)} style={styles.queueRow}>
                        <View style={[styles.queueIcon, { backgroundColor: tone.bg }]}>
                          <Ionicons name={q.icon} size={18} color={tone.fg} />
                        </View>
                        <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>{q.label}</AppText>
                        <AppText mono weight="medium" style={styles.queueCount}>{q.count}</AppText>
                        <Ionicons name="chevron-forward" size={16} color="#B4B4BC" />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Card>

            {o.approvals > 0 ? (
              <Pressable onPress={() => navigation.navigate('OpsApprovals')}>
                <Card elevated="sm" padding={14} style={[styles.card, styles.decision]}>
                  <View style={[styles.queueIcon, { backgroundColor: TONE.warning.bg }]}>
                    <Ionicons name="alert-circle" size={19} color={TONE.warning.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong" weight="bold">
                      {o.approvals} {o.approvals === 1 ? 'approval' : 'approvals'} waiting
                    </AppText>
                    <AppText variant="caption" muted>Rate overrides, credit limits and advances</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#B4B4BC" />
                </Card>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </ManagerShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: colors.hairline },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headMeta: { fontSize: 12, lineHeight: 16, color: colors.textMuted },

  hero: {
    borderRadius: 16, padding: 16, gap: 14,
    shadowColor: colors.shadowTint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroEyebrow: { fontSize: 11, lineHeight: 14, letterSpacing: 0.88, textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', flexShrink: 1 },
  heroPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroPillText: { fontSize: 11, lineHeight: 14, color: colors.white },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroBig: { fontSize: 30, lineHeight: 33 },
  heroSub: { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.85)' },
  heroChevron: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.onPrimaryFaint, alignItems: 'center', justifyContent: 'center' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroFoot: { flexDirection: 'row', gap: 16 },
  heroFootText: { fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.9)' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },

  queueList: { marginTop: 12 },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  queueIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  queueCount: { fontSize: 15, lineHeight: 20 },
  clearRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 4 },
  decision: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
