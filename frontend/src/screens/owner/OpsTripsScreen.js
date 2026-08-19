import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, colors, spacing, radius } from '../../components/ui';
import OwnerShell from './OwnerShell';
import { Pill, RouteLine, toneColor } from './OwnerBits';
import * as own from '../../demo/ownerMock';

const TABS = [{ key: 'running', label: 'Running 14' }, { key: 'blocked', label: 'Blocked 3' }, { key: 'close', label: 'To close 4' }];

/** M2 · Trips board — the board ops works from. */
export default function OpsTripsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('running');

  return (
    <OwnerShell title="Trips" navigation={navigation} active="OpsTrips"
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
          {own.opsTrips.map((t) => (
            <Card key={t.id} elevated="sm" padding={14} onPress={() => navigation.navigate('OpsTripDetail')} style={[t.status === 'error' && styles.errBorder, t.status === 'pending' && styles.warnBorder]}>
              <View style={styles.top}>
                <AppText mono variant="bodyStrong" weight="semibold">{t.id}</AppText>
                <Pill tone={t.status} label={t.badge} />
              </View>
              <View style={styles.routeWrap}><RouteLine from={t.route[0]} to={t.route[1]} /></View>
              <View style={styles.divider} />
              <View style={styles.foot}>
                <AppText variant="caption" mono muted>{t.foot}</AppText>
                {t.action ? (
                  <AppText variant="small" weight="bold" color={toneColor(t.actionTone === 'error' ? 'error' : 'info') || colors.primary}>{t.action}</AppText>
                ) : (
                  <AppText mono variant="small" weight="semibold" color={t.metaColor ? toneColor(t.metaColor) : colors.text}>{t.meta}</AppText>
                )}
              </View>
            </Card>
          ))}
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
  scroll: { padding: 18, paddingTop: 12, gap: 10 },
  errBorder: { borderWidth: 1, borderColor: '#F0CFCB' },
  warnBorder: { borderWidth: 1, borderColor: '#F3D9AE' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeWrap: { marginTop: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
