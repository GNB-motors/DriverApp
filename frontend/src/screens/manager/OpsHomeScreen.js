import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, colors, spacing, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { StatTile, SectionHeader, TONE } from '../../components/ui';
import * as own from '../../demo/managerMock';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import approvalService from '../../services/approvalService';

/** M1 · Ops home — the shift at a glance. */
export default function OpsHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Real approvals summary when a backend is configured (else demo mock).
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token && token !== 'demo-token';
  const { data: summaryApi, loading } = useApi(
    () => approvalService.getApprovalsSummary(),
    [],
    { enabled: useReal, fallback: null },
  );

  // Merge the approvals summary onto the mock dashboard (per-field mock fallback).
  // mapping to confirm against live API
  const o = useMemo(() => {
    const m = own.opsHome;
    if (!useReal || !summaryApi) return m;
    const s = summaryApi;
    const total = s.total ?? s.pending ?? s.pendingCount ?? s.count;
    const trips = s.blockedTrips ?? s.trips ?? s.tripsBlocked;
    return {
      ...m,
      blocked: {
        ...m.blocked,
        items: total != null ? `${total} items` : m.blocked.items,
        trips: trips != null ? `${trips} trips` : m.blocked.trips,
      },
    };
  }, [useReal, summaryApi]);

  return (
    <ManagerShell title="Ops home" subtitle={`${o.name} · ${o.desk.replace('Ops desk · ', '')}`} navigation={navigation} active="OpsHome"
      right={<View style={styles.shift}><AppText variant="caption" mono weight="bold" color={colors.infoText}>{o.shift}</AppText></View>}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {useReal && loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
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

        <SectionHeader label="Needs a decision" />
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
