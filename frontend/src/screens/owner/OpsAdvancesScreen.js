import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Pill, Monogram, SectionHeader } from './OwnerBits';
import * as own from '../../demo/ownerMock';

/** M10 · Advances — requests and the money already out. */
export default function OpsAdvancesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const a = own.opsAdvances;

  const list = (rows) => (
    <Card padding={0} elevated="sm">
      {rows.map((r, i) => (
        <View key={r.id} style={[styles.row, i > 0 && styles.rowDivider]}>
          <Monogram initials={r.initials} size={40} />
          <View style={{ flex: 1, gap: 3 }}>
            <View style={styles.top}>
              <AppText mono variant="bodyStrong" weight="semibold">{r.id}</AppText>
              <Pill tone={r.status} label={r.badge} />
            </View>
            <AppText variant="caption" mono muted>{r.meta}</AppText>
          </View>
          <AppText mono variant="bodyStrong" weight="semibold" color={r.strike ? colors.textMuted : colors.text} style={r.strike ? styles.strike : null}>{r.amount}</AppText>
        </View>
      ))}
    </Card>
  );

  return (
    <OwnerShell title="Advances" subtitle="3 waiting · ₹9,500" navigation={navigation} active="OpsAdvances"
      right={<View style={styles.count}><AppText mono weight="bold" color={colors.white}>3</AppText></View>}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Card elevated="sm" padding={16}>
            <View style={styles.budgetTop}>
              <AppText variant="label" muted>Out this month</AppText>
              <AppText variant="caption" mono muted>{a.limit}</AppText>
            </View>
            <AppText mono weight="semibold" style={styles.big}>{a.out}</AppText>
            <View style={styles.track}><View style={[styles.fill, { width: `${a.percent}%` }]} /></View>
          </Card>

          <SectionHeader label="Waiting on you" />
          {list(a.waiting)}
          <SectionHeader label="Recent decisions" />
          {list(a.recent)}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button size="lg" label="Review oldest request" onPress={() => navigation.navigate('OpsApprovals')} />
        </View>
      </View>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  count: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 18, gap: 12, paddingBottom: 90 },
  budgetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  big: { fontSize: 28, lineHeight: 32, marginVertical: 6 },
  track: { height: 8, borderRadius: radius.full, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.full, backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strike: { textDecorationLine: 'line-through' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
