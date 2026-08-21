import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, StatusBadge, colors, spacing, radius } from '../../../components/ui';
import * as mock from '../../../demo/mock';

/**
 * 04 · My trips — filtered list. UI-only demo.
 */
const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function TripsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('active');
  const list = mock.trips.filter((tr) => tr.tab === tab);

  const openTrip = (tr) => {
    if (tr.status === 'in_transit') navigation.navigate('ActiveTrip');
    else if (tr.status === 'late') navigation.navigate('Pod');
    else navigation.navigate('TripDetail');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <AppText variant="h2" weight="extrabold">My trips</AppText>
        <Pressable hitSlop={8} style={styles.iconBtn}><Ionicons name="search" size={20} color={colors.text} /></Pressable>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tb) => {
          const active = tb.key === tab;
          return (
            <Pressable key={tb.key} style={styles.tabBtn} onPress={() => setTab(tb.key)}>
              <AppText variant="bodyStrong" weight={active ? 'bold' : 'semibold'} color={active ? colors.primary : colors.textMuted}>
                {tb.label}
              </AppText>
              <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={30} color={colors.textMuted} />
            <AppText variant="body" muted style={{ marginTop: 8 }}>No {tab} trips</AppText>
          </View>
        ) : (
          list.map((tr) => (
            <Card key={tr.id} elevated="sm" padding={14} onPress={() => openTrip(tr)} style={[styles.tripCard, tr.status === 'in_transit' && styles.tripActive]}>
              <View style={styles.tripTop}>
                <AppText mono variant="bodyStrong" weight="semibold">{tr.id}</AppText>
                <StatusBadge status={tr.status} label={tr.label} />
              </View>
              <View style={styles.route}>
                <AppText variant="body" weight="semibold">{tr.from}</AppText>
                <View style={styles.dashed} />
                <AppText variant="body" weight="semibold">{tr.to}</AppText>
              </View>
              <View style={styles.tripBottom}>
                <AppText variant="caption" mono muted>{tr.meta}</AppText>
                {tr.earning ? (
                  <AppText mono variant="small" weight="semibold" color={colors.success}>{tr.earning}</AppText>
                ) : (
                  <View style={styles.actionLink}>
                    <AppText variant="small" weight="bold" color={tr.status === 'late' ? colors.warning : colors.primary}>{tr.action} →</AppText>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingBottom: 10,
  },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: 22, gap: spacing.lg },
  tabBtn: { alignItems: 'center', gap: 8, paddingTop: 4 },
  tabUnderline: { height: 2.5, width: '100%', borderRadius: 2, backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: colors.primary },
  scroll: { paddingHorizontal: 22, paddingTop: 14, gap: 12 },
  tripCard: { gap: 12 },
  tripActive: { borderWidth: 1, borderColor: '#C7D0F7' },
  tripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dashed: { flex: 1, height: 0, borderTopWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  tripBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionLink: {},
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
});
