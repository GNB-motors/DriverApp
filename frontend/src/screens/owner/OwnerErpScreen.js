import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Card, BarChart, ProgressBar, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { StatTile, SectionHeader } from './OwnerBits';
import * as own from '../../demo/ownerMock';

/** O9 · ERP overview — how the business is doing. */
export default function OwnerErpScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const e = own.erp;

  return (
    <OwnerShell title="Business overview" subtitle="July 2026 · 18 trucks" navigation={navigation} active="OwnerErp"
      right={<View style={styles.monthPill}><AppText variant="caption" weight="bold" muted>July</AppText></View>}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={colors.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <AppText variant="label" color={colors.onPrimaryMuted}>Net margin</AppText>
            <View style={styles.heroPill}><AppText variant="caption" weight="bold" color={colors.white}>{e.delta}</AppText></View>
          </View>
          <View style={styles.heroMain}>
            <AppText mono weight="semibold" color={colors.white} style={styles.heroBig}>{e.margin}</AppText>
            <AppText mono variant="h3" weight="semibold" color={colors.white}>{e.marginPct}</AppText>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroFoot}>
            <AppText variant="caption" mono color={colors.onPrimaryMuted}>{e.revenue}</AppText>
            <AppText variant="caption" mono color={colors.onPrimaryMuted}>{e.cost}</AppText>
          </View>
        </LinearGradient>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Margin by month" right={<AppText variant="caption" mono muted>Feb – Jul</AppText>} />
          <BarChart data={e.months} height={110} style={{ marginTop: 14 }} />
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Cost breakup" right={<AppText variant="caption" mono muted>₹23.7 L</AppText>} />
          <View style={{ gap: 8, marginTop: 12 }}>
            {e.costBreak.map((c) => <ProgressBar key={c.label} label={c.label} percent={c.percent} value={c.value} color={c.color} />)}
          </View>
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Per unit" right={<AppText variant="caption" mono muted>Fleet average</AppText>} />
          <View style={styles.grid}>
            {e.perUnit.map((u) => (
              <View key={u.label} style={styles.unit}>
                <AppText mono variant="h3" weight="semibold" color={u.color === 'success' ? colors.success : colors.text}>{u.value}</AppText>
                <AppText variant="caption" muted>{u.label}</AppText>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  monthPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 14 },
  hero: { borderRadius: radius.xl, padding: 18, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroPill: { backgroundColor: colors.onPrimaryFaint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  heroMain: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  heroBig: { fontSize: 32, lineHeight: 36 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  unit: { width: '50%', paddingVertical: 10, gap: 3 },
});
