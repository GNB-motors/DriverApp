import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, colors, spacing } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Pill, FilterChips } from './OwnerBits';
import * as own from '../../demo/ownerMock';

/** O7 · Sale bills — what customers owe. */
export default function OwnerSaleBillsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');

  return (
    <OwnerShell title="Sale bills" subtitle="24 invoices · ₹4.2 L outstanding" navigation={navigation} active="OwnerSaleBills">
      <View style={{ flex: 1 }}>
        <FilterChips options={['All', 'Overdue', 'Unpaid', 'Paid']} value={filter} onChange={setFilter} style={styles.chips} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {own.saleBills.map((inv) => (
            <Card key={inv.id} elevated="sm" padding={14} style={[inv.status === 'overdue' && styles.overdue]}>
              <View style={styles.top}>
                <View style={styles.idRow}>
                  <AppText mono variant="bodyStrong" weight="semibold">{inv.id}</AppText>
                  <Pill tone={inv.status} label={inv.badge} />
                </View>
                <AppText mono variant="bodyStrong" weight="semibold" color={inv.status === 'paid' ? colors.textMuted : colors.text}>{inv.amount}</AppText>
              </View>
              <AppText variant="bodyStrong" weight="bold" style={styles.customer}>{inv.customer}</AppText>
              <View style={styles.divider} />
              <View style={styles.foot}>
                <AppText variant="caption" mono muted>{inv.meta}</AppText>
                <AppText variant="small" weight="bold" color={inv.status === 'overdue' ? colors.error : colors.primary}>View</AppText>
              </View>
            </Card>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button size="lg" icon="add" label="Raise a sale bill" onPress={() => {}} />
        </View>
      </View>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: 18, paddingTop: 12 },
  scroll: { padding: 18, paddingTop: 12, gap: 10, paddingBottom: 90 },
  overdue: { borderWidth: 1, borderColor: '#F0CFCB' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customer: { marginTop: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
