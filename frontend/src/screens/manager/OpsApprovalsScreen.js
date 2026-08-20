import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, colors, spacing, radius } from '../../components/ui';
import ManagerShell from './ManagerShell';
import { Pill, FilterChips, TONE } from '../../components/ui';
import * as own from '../../demo/managerMock';

/** M4 · Approvals — one queue, mixed types. */
export default function OpsApprovalsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All 7');
  const a = own.opsApprovals;

  return (
    <ManagerShell title="Approvals" subtitle="7 waiting · oldest 2 days" navigation={navigation} active="OpsApprovals"
      right={<View style={styles.count}><AppText mono weight="bold" color={colors.white}>7</AppText></View>}>
      <View style={{ flex: 1 }}>
        <FilterChips options={['All 7', 'Advances 3', 'PODs 2']} value={filter} onChange={setFilter} style={styles.chips} />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          <Card elevated="sm" padding={14} style={{ gap: 10 }}>
            <View style={styles.advTop}>
              <View style={styles.advIcon}><Ionicons name="wallet" size={18} color={colors.warning} /></View>
              <View style={{ flex: 1 }}>
                <View style={styles.advTitleRow}>
                  <AppText variant="bodyStrong" weight="bold">{a.featured.title}</AppText>
                  <Pill tone="error" label={a.featured.badge} />
                </View>
                <AppText variant="caption" mono muted>{a.featured.name}</AppText>
              </View>
              <AppText mono variant="bodyStrong" weight="semibold">{a.featured.amount}</AppText>
            </View>
            <AppText variant="small" muted>{a.featured.desc}</AppText>
            <View style={styles.advBtns}>
              <Button variant="secondary" size="md" label="Reject" style={{ flex: 1 }} onPress={() => {}} />
              <Button size="md" label={`Approve ${a.featured.amount}`} style={{ flex: 1.3 }} onPress={() => {}} />
            </View>
          </Card>

          {a.rows.map((r) => (
            <Card key={r.title} elevated="sm" padding={13} onPress={() => navigation.navigate('OpsTripDetail')} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: (TONE[r.tone] || TONE.neutral).bg }]}>
                <Ionicons name={r.icon} size={18} color={(TONE[r.tone] || TONE.neutral).fg} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.advTitleRow}>
                  <AppText variant="bodyStrong" weight="bold">{r.title}</AppText>
                  <Pill tone={r.tone} label={r.badge} />
                </View>
                <AppText variant="caption" mono muted>{r.meta}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#B4B4BC" />
            </Card>
          ))}
          <AppText variant="small" muted center style={{ marginTop: 4 }}>3 more waiting</AppText>
        </ScrollView>
      </View>
    </ManagerShell>
  );
}

const styles = StyleSheet.create({
  count: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.errorStrong, alignItems: 'center', justifyContent: 'center' },
  chips: { paddingHorizontal: 18, paddingTop: 12 },
  scroll: { padding: 18, paddingTop: 12, gap: 10 },
  advTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  advIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.pendingBg, alignItems: 'center', justifyContent: 'center' },
  advTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  advBtns: { flexDirection: 'row', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
