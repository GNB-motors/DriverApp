import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, ProgressBar, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { StatTile, SectionHeader } from './OwnerBits';
import * as own from '../../demo/ownerMock';

/** O4 · Owner dashboard — the morning look. */
export default function OwnerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const d = own.ownerDashboard;

  return (
    <OwnerShell title="Dashboard" subtitle={`${d.name} · ${d.company}`} navigation={navigation} active="OwnerDashboard"
      right={<View style={styles.bell}><Ionicons name="notifications-outline" size={20} color={colors.text} /><View style={styles.bellDot} /></View>}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.navigate('OwnerApprovals')}>
          <LinearGradient colors={colors.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>
            <View style={styles.heroTop}>
              <AppText variant="label" color={colors.onPrimaryMuted}>Needs you today</AppText>
              <View style={styles.heroPill}><AppText variant="caption" weight="bold" color={colors.white}>{d.needs.items}</AppText></View>
            </View>
            <View style={styles.heroMain}>
              <View style={{ flex: 1 }}>
                <AppText mono weight="semibold" color={colors.white} style={styles.heroBig}>{d.needs.bills}</AppText>
                <AppText variant="small" color={colors.onPrimaryMuted}>{d.needs.waiting}</AppText>
              </View>
              <View style={styles.heroChevron}><Ionicons name="chevron-forward" size={18} color={colors.white} /></View>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroFoot}>
              <AppText variant="caption" color={colors.onPrimaryMuted}>{d.needs.advances}</AppText>
              <AppText variant="caption" color={colors.onPrimaryMuted}>{d.needs.pods}</AppText>
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
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroPill: { backgroundColor: colors.onPrimaryFaint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroBig: { fontSize: 30, lineHeight: 34 },
  heroChevron: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.onPrimaryFaint, alignItems: 'center', justifyContent: 'center' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  weekRow: { gap: 6, marginTop: 10 },
  weekItem: {},
});
