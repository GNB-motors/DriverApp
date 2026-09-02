import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, colors, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Eyebrow, KpiTile, Loading, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import ownerService from '../../services/ownerService';
import approvalService from '../../services/approvalService';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

/** Compact money for a half-width tile — the design shows "₹4.2 L", not the full figure. */
const moneyTile = (v) => {
  const n = Number(v || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
  return `${sign}₹${abs.toLocaleString('en-IN')}`;
};

/** Progress row — the "Fleet right now" idiom: 84px label · 7px track · 22px mono count. */
function PipeRow({ label, count, percent, color }) {
  return (
    <View style={styles.pipeRow}>
      <AppText style={styles.pipeLabel} numberOfLines={1}>{label}</AppText>
      <View style={styles.pipeTrack}>
        {count > 0 ? <View style={[styles.pipeFill, { width: `${percent}%`, backgroundColor: color }]} /> : null}
      </View>
      <AppText mono style={styles.pipeValue}>{count}</AppText>
    </View>
  );
}

/** Stat — the "This week" idiom: mono 17px figure over an 11px caption. */
const Stat = ({ value, label, tone }) => (
  <View style={{ gap: 2 }}>
    <AppText mono weight="medium" color={tone} style={styles.statValue}>{value}</AppText>
    <AppText style={styles.statLabel} numberOfLines={1}>{label}</AppText>
  </View>
);

/** Funnel stages, in the web ERP's order and wording (ErpHomePage funnelData). */
const PIPELINE = [
  { key: 'dos', label: 'DOs open', color: colors.spot.rage },
  { key: 'placementsToday', label: 'Placed', color: colors.spot.rageLight },
  { key: 'pendingCns', label: 'Pending CN', color: colors.spot.nebula },
  { key: 'pendingTripClose', label: 'Trip close', color: colors.spot.blush },
  { key: 'pendingPods', label: 'Pending POD', color: colors.spot.sky },
  { key: 'pendingUnloadings', label: 'Unloading', color: colors.spot.splash },
  { key: 'pendingBillSubmissions', label: 'Billing', color: colors.spot.leaf },
];

/** O4 · Owner dashboard — the morning look. */
export default function OwnerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const { token, organization } = useAuth();
  const useReal = apiConfigured() && !!token;
  const { data: erpApi, loading: erpLoading, error, refetch: refetchErp } = useApi(
    () => ownerService.getErpDashboard(),
    [],
    { enabled: useReal, fallback: null },
  );
  const { data: apprSummary, loading: apprLoading, refetch: refetchAppr } = useApi(
    () => approvalService.getApprovalsSummary(),
    [],
    { enabled: useReal, fallback: null },
  );
  const onRefresh = () => { refetchErp(); refetchAppr(); };

  // /erp/dashboard/summary → { pendingCounts: {...}, financials: {...} }
  const d = useMemo(() => {
    const pc = erpApi?.pendingCounts || {};
    const fin = erpApi?.financials || {};
    const trips = pc.activeTrips || {};
    const ageing = pc.podAgeing || {};

    const pendingApprovals = Number(apprSummary?.total ?? pc.pendingApprovals ?? 0);
    const typeCount = Array.isArray(apprSummary?.byType) ? apprSummary.byType.length : 0;

    const running = (Number(trips.PLACED) || 0) + (Number(trips.DISPATCHED) || 0);
    const allTrips = Object.values(trips).reduce((s, v) => s + (Number(v) || 0), 0);

    const pipeline = PIPELINE.map((s) => ({ ...s, count: Number(pc[s.key]) || 0 }));
    const pipelineMax = Math.max(1, ...pipeline.map((r) => r.count));

    return {
      pendingApprovals,
      typeCount,
      running,
      allTrips,
      receivable: Number(fin.receivablesOutstanding) || 0,
      overdue: Number(fin.receivablesOverdue) || 0,
      payable: Number(fin.payablesDue) || 0,
      pipeline: pipeline.map((s) => ({ ...s, percent: (s.count / pipelineMax) * 100 })),
      pipelineTotal: pipeline.reduce((s, r) => s + r.count, 0),
      pod: {
        under7d: Number(ageing.under7d) || 0,
        from7to14d: Number(ageing.from7to14d) || 0,
        over14d: Number(ageing.over14d) || 0,
      },
      podTotal: (Number(ageing.under7d) || 0) + (Number(ageing.from7to14d) || 0) + (Number(ageing.over14d) || 0),
      unadjusted: Number(fin.unadjustedReceipts) || 0,
    };
  }, [erpApi, apprSummary]);

  const loading = erpLoading || apprLoading;
  const isEmpty = !erpApi && !apprSummary;

  return (
    <OwnerShell title="Dashboard" subtitle={organization?.companyName || ''} navigation={navigation} active="OwnerDashboard"
      right={
        <Pressable style={styles.bell} onPress={() => navigation.navigate('OwnerApprovals')}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {d.pendingApprovals > 0 ? <View style={styles.bellDot} /> : null}
        </Pressable>
      }>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={onRefresh} />
        ) : isEmpty ? (
          <EmptyState icon="speedometer-outline" title="No dashboard yet" message="Your daily summary appears once trips, bills and trucks are recorded." />
        ) : (
          <>
            {/* Hero — 180° rage gradient, the one place a gradient is allowed. */}
            <Pressable onPress={() => navigation.navigate('OwnerApprovals')}>
              <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.hero}>
                <View style={styles.heroTop}>
                  <AppText weight="semibold" style={styles.heroEyebrow} numberOfLines={1}>Needs you today</AppText>
                  {d.typeCount > 0 ? (
                    <View style={styles.heroPill}>
                      <AppText weight="semibold" style={styles.heroPillText}>{d.typeCount} {d.typeCount === 1 ? 'type' : 'types'}</AppText>
                    </View>
                  ) : null}
                </View>

                <View style={styles.heroMain}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText mono weight="medium" color={colors.white} style={styles.heroBig} numberOfLines={1}>
                      {d.pendingApprovals} {d.pendingApprovals === 1 ? 'approval' : 'approvals'}
                    </AppText>
                    <AppText style={styles.heroSub} numberOfLines={1}>
                      {d.pendingApprovals > 0 ? 'Waiting on your decision' : 'Nothing waiting on you'}
                    </AppText>
                  </View>
                  <View style={styles.heroChevron}>
                    <Ionicons name="chevron-forward" size={20} color={colors.white} />
                  </View>
                </View>

                <View style={styles.heroDivider} />

                <View style={styles.heroFoot}>
                  <AppText style={styles.heroFootText}>{d.pipelineTotal} in pipeline</AppText>
                  <AppText style={styles.heroFootText}>{d.podTotal} POD{d.podTotal === 1 ? '' : 's'} awaited</AppText>
                </View>
              </LinearGradient>
            </Pressable>

            {/* 2×2 metrics — counts carry a short mono unit, money stands alone. */}
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <KpiTile label="Trips running" value={String(d.running)} unit={d.allTrips ? `of ${d.allTrips}` : null} />
              </View>
              <View style={styles.gridItem}>
                <KpiTile
                  label="Approvals"
                  value={String(d.pendingApprovals)}
                  unit="to review"
                  tone={d.pendingApprovals > 0 ? colors.warning : undefined}
                />
              </View>
              <View style={styles.gridItem}>
                <KpiTile
                  label="Receivable"
                  value={moneyTile(d.receivable)}
                  tone={d.overdue > 0 ? colors.error : undefined}
                />
              </View>
              <View style={styles.gridItem}>
                <KpiTile label="Payable" value={moneyTile(d.payable)} />
              </View>
            </View>

            <Card elevated="sm" padding={16} style={styles.card}>
              <View style={styles.cardHead}>
                <Eyebrow>Operational pipeline</Eyebrow>
                <Pressable onPress={() => navigation.navigate('OwnerErp')} hitSlop={8}>
                  <AppText weight="semibold" style={styles.link}>Overview</AppText>
                </Pressable>
              </View>
              <View style={styles.pipeList}>
                {d.pipeline.map((s) => (
                  <PipeRow key={s.key} label={s.label} count={s.count} percent={s.percent} color={s.color} />
                ))}
              </View>
            </Card>

            <Card elevated="sm" padding={16} style={styles.card}>
              <View style={styles.cardHead}>
                <Eyebrow>POD ageing</Eyebrow>
                <AppText style={styles.headMeta}>awaiting challan</AppText>
              </View>
              <View style={styles.statRow}>
                <Stat value={String(d.pod.under7d)} label="under 7 days" />
                <Stat value={String(d.pod.from7to14d)} label="7 – 14 days" tone={d.pod.from7to14d > 0 ? colors.warning : undefined} />
                <Stat value={String(d.pod.over14d)} label="over 14 days" tone={d.pod.over14d > 0 ? colors.error : undefined} />
              </View>
            </Card>

            {d.unadjusted > 0 ? (
              <Pressable onPress={() => navigation.navigate('OwnerLedger')}>
                <Card elevated="sm" padding={16} style={styles.card}>
                  <View style={styles.cardHead}>
                    <Eyebrow>Unadjusted receipts</Eyebrow>
                    <AppText mono weight="medium" color={colors.warning} style={styles.unadjValue}>{money(d.unadjusted)}</AppText>
                  </View>
                  <AppText style={styles.headMeta}>Money in, not yet applied to a bill</AppText>
                </Card>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  bell: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.errorStrong, borderWidth: 2, borderColor: colors.surface },

  // SpiceKit card: 12px radius, hairline rgba(5,8,22,.05) rim, soft navy shadow.
  card: { borderRadius: 12, borderWidth: 1, borderColor: colors.hairline },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headMeta: { fontSize: 12, lineHeight: 16, color: colors.textMuted },
  link: { fontSize: 13, lineHeight: 18, color: colors.rage700 },

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

  pipeList: { gap: 9, marginTop: 13 },
  pipeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pipeLabel: { fontSize: 12, lineHeight: 16, width: 84 },
  pipeTrack: { flex: 1, height: 7, borderRadius: radius.full, backgroundColor: colors.fog700, overflow: 'hidden' },
  pipeFill: { height: 7, borderRadius: radius.full },
  pipeValue: { fontSize: 12, lineHeight: 16, width: 22, textAlign: 'right' },

  statRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 13 },
  statValue: { fontSize: 17, lineHeight: 22 },
  statLabel: { fontSize: 11, lineHeight: 14, color: colors.textMuted },

  unadjValue: { fontSize: 17, lineHeight: 22 },
});
