import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, ProgressBar, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { StatTile, SectionHeader } from '../../components/ui';
import * as own from '../../demo/ownerMock';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import ownerService from '../../services/ownerService';
import approvalService from '../../services/approvalService';

/** O4 · Owner dashboard — the morning look. */
export default function OwnerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dash = own.ownerDashboard;

  // ERP dashboard + approvals summary → real when a backend is configured (else demo mock).
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token && token !== 'demo-token';
  const { data: erpApi, loading: erpLoading } = useApi(
    () => ownerService.getErpDashboard(),
    [],
    { enabled: useReal, fallback: null },
  );
  const { data: apprSummary } = useApi(
    () => approvalService.getApprovalsSummary(),
    [],
    { enabled: useReal, fallback: null },
  );

  // mapping to confirm against live API — spread mock first so unknown fields keep mock values.
  const d = useMemo(() => {
    if (!useReal || (!erpApi && !apprSummary)) return dash;
    const e = erpApi || {};
    const a = apprSummary || {};
    const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;
    return {
      ...dash,
      name: e.ownerName || e.name || dash.name,
      company: e.companyName || e.company || dash.company,
      needs: {
        ...dash.needs,
        bills: a.pendingCount != null ? `${a.pendingCount} bills` : dash.needs.bills,
        waiting: a.pendingTotal != null ? `${fmt(a.pendingTotal)} waiting for confirmation` : dash.needs.waiting,
        items: a.itemsCount != null ? `${a.itemsCount} items` : dash.needs.items,
      },
      stats: Array.isArray(e.stats) && e.stats.length ? e.stats : dash.stats,
      fleetNow: Array.isArray(e.fleetNow) && e.fleetNow.length ? e.fleetNow : dash.fleetNow,
      week: Array.isArray(e.week) && e.week.length ? e.week : dash.week,
    };
  }, [useReal, erpApi, apprSummary, dash]);

  return (
    <OwnerShell title="Dashboard" subtitle={`${d.name} · ${d.company}`} navigation={navigation} active="OwnerDashboard"
      right={<View style={styles.bell}><Ionicons name="notifications-outline" size={20} color={colors.text} /><View style={styles.bellDot} /></View>}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {useReal && erpLoading ? <ActivityIndicator color={colors.primary} style={{ marginBottom: 4 }} /> : null}
        <Pressable onPress={() => navigation.navigate('OwnerApprovals')}>
          <LinearGradient colors={colors.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>
            <View style={styles.heroTop}>
              <AppText variant="label" color={colors.onPrimaryMuted} numberOfLines={1} style={styles.heroTopLabel}>Needs you today</AppText>
              <View style={styles.heroPill}><AppText variant="caption" weight="bold" color={colors.white} numberOfLines={1}>{d.needs.items}</AppText></View>
            </View>
            <View style={styles.heroMain}>
              <View style={{ flex: 1 }}>
                <AppText mono weight="semibold" color={colors.white} numberOfLines={1} style={styles.heroBig}>{d.needs.bills}</AppText>
                <AppText variant="small" color={colors.onPrimaryMuted} numberOfLines={1}>{d.needs.waiting}</AppText>
              </View>
              <View style={styles.heroChevron}><Ionicons name="chevron-forward" size={18} color={colors.white} /></View>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroFoot}>
              <AppText variant="caption" color={colors.onPrimaryMuted} numberOfLines={1} style={styles.heroFootItem}>{d.needs.advances}</AppText>
              <AppText variant="caption" color={colors.onPrimaryMuted} numberOfLines={1} style={styles.heroFootItem}>{d.needs.pods}</AppText>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.grid}>
          {d.stats.map((s) => <StatTile key={s.label} label={s.label} value={s.value} sub={s.sub} color={s.color} />)}
        </View>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Fleet right now" right={<Pressable onPress={() => navigation.navigate('OwnerFleet')}><AppText variant="small" weight="bold" color={colors.primary}>See all</AppText></Pressable>} />
          <View style={{ gap: 8, marginTop: 12 }}>
            {d.fleetNow.map((f) => <ProgressBar key={f.label} label={f.label} percent={f.percent} value={f.count} color={f.color} />)}
          </View>
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="This week" right={<AppText variant="caption" mono muted>12–18 Aug</AppText>} />
          <View style={styles.weekRow}>
            {d.week.map((w) => <AppText key={w} variant="small" weight="semibold" style={styles.weekItem}>{w}</AppText>)}
          </View>
        </Card>
      </ScrollView>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, gap: 14 },
  bell: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.error },
  hero: { borderRadius: radius.xl, padding: 18, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroTopLabel: { flex: 1, flexShrink: 1 },
  heroPill: { flexShrink: 0, backgroundColor: colors.onPrimaryFaint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroBig: { fontSize: 30, lineHeight: 34 },
  heroChevron: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.onPrimaryFaint, alignItems: 'center', justifyContent: 'center' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  heroFootItem: { flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  weekRow: { gap: 6, marginTop: 10 },
  weekItem: {},
});
