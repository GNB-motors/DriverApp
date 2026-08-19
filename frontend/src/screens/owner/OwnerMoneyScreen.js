import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, SegmentedControl, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Monogram, SectionHeader } from './OwnerBits';
import * as own from '../../demo/ownerMock';

/** O5 · Money — payables and receivables. */
export default function OwnerMoneyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('pay');
  const m = own.ownerMoney;

  return (
    <OwnerShell title="Money" navigation={navigation} active="OwnerMoney">
      <View style={{ flex: 1 }}>
        <View style={styles.top}>
          <SegmentedControl variant="pill" options={[{ label: 'To pay', value: 'pay' }, { label: 'To collect', value: 'collect' }]} value={tab} onChange={setTab} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Card elevated="sm" padding={16}>
            <AppText variant="label" muted>Owed to drivers</AppText>
            <AppText mono weight="semibold" style={styles.big}>{m.owed}</AppText>
            <AppText variant="small" muted>{m.drivers}</AppText>
            <View style={styles.subRow}>
              <AppText variant="caption" mono muted>{m.confirmed}</AppText>
              <AppText variant="caption" mono muted>{m.adjustments}</AppText>
            </View>
          </Card>

          <SectionHeader label="By driver" />
          <Card padding={0} elevated="sm">
            {m.list.map((d, i) => (
              <Pressable key={d.initials} onPress={() => navigation.navigate('OwnerDriver')} style={[styles.driver, i > 0 && styles.divider]}>
                <Monogram initials={d.initials} size={40} />
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="bodyStrong" weight="bold">{d.name}</AppText>
                  <AppText variant="caption" mono muted>{d.meta}</AppText>
                </View>
                <AppText mono variant="bodyStrong" weight="semibold">{d.amount}</AppText>
              </Pressable>
            ))}
          </Card>

          <Pressable onPress={() => navigation.navigate('OwnerApprovals')}>
            <Card elevated="sm" padding={14} style={styles.advRow}>
              <View style={styles.advIcon}><Ionicons name="add" size={20} color={colors.warning} /></View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" weight="bold">3 advance requests</AppText>
                <AppText variant="caption" muted>₹9,500 asked for today</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B4B4BC" />
            </Card>
          </Pressable>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button size="lg" label="Settle a driver" onPress={() => navigation.navigate('OwnerDriver')} />
        </View>
      </View>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 18, paddingTop: 12 },
  scroll: { padding: 18, paddingTop: 12, gap: 12, paddingBottom: 90 },
  big: { fontSize: 30, lineHeight: 34, marginVertical: 4 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  driver: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  advRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  advIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.pendingBg, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
