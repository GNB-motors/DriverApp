import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Card, colors } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { LedgerRow, FilterChips, SectionHeader } from '../../components/ui';
import * as own from '../../demo/ownerMock';

/** O10 · Company ledger — every movement, in order. */
export default function OwnerLedgerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const l = own.companyLedger;

  const group = (rows) => (
    <Card padding={0} elevated="sm">
      {rows.map((e, i) => (
        <View key={e.title}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <LedgerRow item={e} />
        </View>
      ))}
    </Card>
  );

  return (
    <OwnerShell title="Company ledger" subtitle="Sahayak Roadlines · Aug 2026" navigation={navigation} active="OwnerLedger"
      right={<View style={styles.exportPill}><AppText variant="caption" weight="bold" muted>Export</AppText></View>}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Card elevated="sm" padding={16}>
          <AppText variant="label" muted>Closing balance</AppText>
          <AppText mono weight="semibold" style={styles.big}>{l.closing}</AppText>
          <View style={styles.divider2} />
          <View style={styles.inout}>
            <AppText variant="small" mono weight="semibold" color={colors.success}>{l.moneyIn}</AppText>
            <AppText variant="small" mono weight="semibold" color={colors.error}>{l.moneyOut}</AppText>
          </View>
        </Card>

        <FilterChips options={['All', 'Money in', 'Money out']} value={filter} onChange={setFilter} />

        <SectionHeader label="This week" />
        {group(l.week)}
        <SectionHeader label="Earlier" />
        {group(l.earlier)}
      </ScrollView>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  exportPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 12 },
  big: { fontSize: 30, lineHeight: 34, marginVertical: 4 },
  divider2: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  inout: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 13 },
});
