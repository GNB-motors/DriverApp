import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, WarningBanner, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, LedgerRow, SectionHeader, toneColor } from '../../components/ui';
import * as own from '../../demo/ownerMock';

/** O6 · Driver account — settle up. */
export default function OwnerDriverScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const d = own.ownerDriver;

  return (
    <View style={styles.container}>
      <BackHeader title={d.name} subtitle={d.plate} onBack={() => navigation.goBack()} right={<Pill tone="success" label="Active" />} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card elevated="sm" padding={16}>
          <AppText variant="label" muted>You owe him</AppText>
          <AppText mono weight="semibold" style={styles.big}>{d.owe}</AppText>
          <View style={styles.divider} />
          {d.breakdown.map((b) => (
            <View key={b.label} style={styles.kv}>
              <AppText variant="small" muted>{b.label}</AppText>
              <AppText mono variant="bodyStrong" weight="semibold" color={toneColor(b.color)}>{b.value}</AppText>
            </View>
          ))}
        </Card>

        <SectionHeader label="Ledger" />
        <Card padding={0} elevated="sm">
          {d.ledger.map((e, i) => (
            <View key={e.title}>
              {i > 0 ? <View style={styles.rowDivider} /> : null}
              <LedgerRow item={e} />
            </View>
          ))}
        </Card>

        <WarningBanner tone="info" message="Settling records a payout and resets his wallet to zero. The pending ₹1,250 stays out of it until you confirm that bill." />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button variant="secondary" size="lg" label="Pay advance" style={{ flex: 1 }} onPress={() => {}} />
        <Button size="lg" label={`Settle ${d.owe}`} style={{ flex: 1.3 }} onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 12 },
  big: { fontSize: 32, lineHeight: 36, marginVertical: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 13 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
