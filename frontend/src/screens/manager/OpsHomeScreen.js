import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, Loading, EmptyState, colors, spacing, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { StatTile, SectionHeader, TONE } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import approvalService from '../../services/approvalService';

/** M1 · Ops home — the shift at a glance. */
export default function OpsHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Real approvals summary — no data until a backend is configured and signed in.
  const { token, user } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data: summaryApi, loading, error, refetch } = useApi(
    () => approvalService.getApprovalsSummary(),
    [],
    { enabled, fallback: null },
  );

  // Normalize the approvals summary → the dashboard shape (optional chaining + safe defaults).
  const o = useMemo(() => {
    const s = summaryApi || {};
    const total = s.total ?? s.pending ?? s.pendingCount ?? s.count;
    const trips = s.blockedTrips ?? s.trips ?? s.tripsBlocked;
    const inline = Array.isArray(s.inline)
      ? s.inline
      : Array.isArray(s.breakdown)
        ? s.breakdown.map((b) => (b?.label || `${b?.count ?? ''} ${b?.type ?? ''}`.trim())).filter(Boolean)
        : [];
    const stats = Array.isArray(s.stats)
      ? s.stats.map((x) => ({ label: x?.label, value: String(x?.value ?? x?.count ?? ''), sub: x?.sub, color: x?.color }))
      : [];
    const decisions = Array.isArray(s.decisions)
      ? s.decisions.map((d) => ({ icon: d?.icon || 'alert-circle', tone: d?.tone || 'warning', title: d?.title || 'Needs a decision', meta: d?.meta || '', to: d?.to || 'OpsApprovals' }))
      : [];
    return {
      name: user?.name || 'Ops desk',
      shift: s.shift || null,
      blocked: {
        items: total != null ? `${total} items` : '0 items',
        trips: trips != null ? `${trips} trips` : '0 trips',
        caption: 'waiting on a document or approval',
        inline,
      },
      stats,
      decisions,
    };
  }, [summaryApi, user]);

  const empty = !summaryApi;

  return (
    <ManagerShell title="Ops home" subtitle={o.name} navigation={navigation} active="OpsHome"
      right={o.shift ? <View style={styles.shift}><AppText variant="caption" mono weight="bold" color={colors.infoText}>{o.shift}</AppText></View> : undefined}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : empty ? (
          <EmptyState title="You're all caught up" message="Blocked trips and pending approvals will show up here." />
        ) : (
          <>
        <Pressable onPress={() => navigation.navigate('OpsApprovals')}>
          <LinearGradient colors={colors.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>
            <View style={styles.heroTop}>
              <AppText variant="label" color={colors.onPrimaryMuted} numberOfLines={1} style={styles.heroTopLabel}>Blocked right now</AppText>
              <View style={styles.heroPill}><AppText variant="caption" weight="bold" color={colors.white} numberOfLines={1}>{o.blocked.items}</AppText></View>
            </View>
            <View style={styles.heroMain}>
              <View style={{ flex: 1 }}>
                <AppText mono weight="semibold" color={colors.white} numberOfLines={1} style={styles.heroBig}>{o.blocked.trips}</AppText>
                <AppText variant="small" color={colors.onPrimaryMuted} numberOfLines={1}>{o.blocked.caption}</AppText>
              </View>
              <View style={styles.heroChevron}><Ionicons name="chevron-forward" size={18} color={colors.white} /></View>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroFoot}>
              {o.blocked.inline.map((x) => <AppText key={x} variant="caption" color={colors.onPrimaryMuted} numberOfLines={1} style={styles.heroFootItem}>{x}</AppText>)}
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.grid}>
          {o.stats.map((s) => <StatTile key={s.label} label={s.label} value={s.value} sub={s.sub} color={s.color} />)}
        </View>

        {o.decisions.length ? <SectionHeader label="Needs a decision" /> : null}
        {o.decisions.map((d) => (
          <Pressable key={d.title} onPress={() => navigation.navigate(d.to)}>
            <Card elevated="sm" padding={14} style={styles.decision}>
              <View style={[styles.decIcon, { backgroundColor: (TONE[d.tone] || TONE.neutral).bg }]}>
                <Ionicons name={d.icon} size={19} color={(TONE[d.tone] || TONE.neutral).fg} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" weight="bold">{d.title}</AppText>
                <AppText variant="caption" mono muted>{d.meta}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B4B4BC" />
            </Card>
          </Pressable>
        ))}
          </>
        )}
      </ScrollView>
    </ManagerShell>
  );
}

const styles = StyleSheet.create({
  shift: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.infoBg },
  scroll: { padding: 18, gap: 12 },
  hero: { borderRadius: radius.xl, padding: 18, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroTopLabel: { flex: 1, flexShrink: 1 },
  heroPill: { flexShrink: 0, backgroundColor: colors.onPrimaryFaint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroBig: { fontSize: 28, lineHeight: 32 },
  heroChevron: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.onPrimaryFaint, alignItems: 'center', justifyContent: 'center' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  heroFootItem: { flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  decision: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  decIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
