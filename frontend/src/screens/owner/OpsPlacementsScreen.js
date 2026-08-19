import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Pill, StatTile, SectionHeader } from './OwnerBits';
import * as own from '../../demo/ownerMock';

const TABS = [{ key: 'all', label: 'All 13' }, { key: 'failed', label: 'Failed 2' }, { key: 'late', label: 'Late 3' }];

/** M9 · Placements — what was assigned, and how it went. */
export default function OpsPlacementsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('all');
  const p = own.placements;

  const group = (label, rows) => (
    <>
      <SectionHeader label={label} />
      <Card padding={0} elevated="sm">
        {rows.map((r, i) => (
          <Pressable key={r.id} onPress={() => navigation.navigate('OpsDeliveryOrder')} style={[styles.row, i > 0 && styles.rowDivider]}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.top}>
                <AppText mono variant="bodyStrong" weight="semibold">{r.id}</AppText>
                <Pill tone={r.status} label={r.badge} />
              </View>
              <AppText variant="small" weight="semibold">{r.route}</AppText>
              <AppText variant="caption" mono muted>{r.meta}</AppText>
            </View>
            <AppText variant="caption" mono muted>{r.right}</AppText>
          </Pressable>
        ))}
      </Card>
    </>
  );

  return (
    <OwnerShell title="Placements" subtitle="This week · 11 placed · 2 failed" navigation={navigation} active="OpsPlacements"
      right={<View style={styles.search}><Ionicons name="search" size={18} color={colors.text} /></View>}>
      <View style={{ flex: 1 }}>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tab}>
              <AppText variant="bodyStrong" weight={tab === t.key ? 'bold' : 'semibold'} color={tab === t.key ? colors.primary : colors.textMuted}>{t.label}</AppText>
              <View style={[styles.underline, tab === t.key && styles.underlineOn]} />
            </Pressable>
          ))}
        </View>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.statRow}>
            {p.stats.map((s) => <StatTile key={s.label} label={s.label} value={s.value} color={s.color} />)}
          </View>
          {group('Today', p.today)}
          {group('Yesterday', p.yesterday)}
        </ScrollView>
      </View>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  search: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: 18, paddingTop: 12 },
  tab: { alignItems: 'center', gap: 8, paddingTop: 4 },
  underline: { height: 2.5, width: '100%', borderRadius: 2, backgroundColor: 'transparent' },
  underlineOn: { backgroundColor: colors.primary },
  scroll: { padding: 18, paddingTop: 12, gap: 12 },
  statRow: { flexDirection: 'row', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
