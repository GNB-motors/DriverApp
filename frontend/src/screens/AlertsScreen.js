import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppText, AlertCard, colors, spacing } from '../components/ui';
import * as mock from '../demo/mock';

/**
 * 14 · Alerts — Needs action / All. UI-only demo.
 */
export default function AlertsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('action');

  const actionAlerts = mock.alerts.filter((a) => a.group === 'action');
  const earlierAlerts = mock.alerts.filter((a) => a.group === 'earlier');
  const showEarlier = tab === 'all';

  const onAction = (alert) => {
    if (alert.actionLabel === 'Re-submit bill') navigation.navigate('AddBill');
    else if (alert.actionLabel === 'Upload renewal') navigation.navigate('MyDocuments');
    else if (alert.actionLabel === 'Upload POD') navigation.navigate('Pod');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <AppText variant="h2" weight="extrabold">Alerts</AppText>
        <Pressable hitSlop={8}><AppText variant="small" weight="bold" color={colors.primary}>Mark all read</AppText></Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable style={styles.tabBtn} onPress={() => setTab('action')}>
          <View style={styles.tabInner}>
            <AppText variant="bodyStrong" weight={tab === 'action' ? 'bold' : 'semibold'} color={tab === 'action' ? colors.primary : colors.textMuted}>
              Needs action
            </AppText>
            <View style={styles.countPill}><AppText mono weight="bold" color={colors.white} style={styles.countText}>{actionAlerts.length}</AppText></View>
          </View>
          <View style={[styles.underline, tab === 'action' && styles.underlineActive]} />
        </Pressable>
        <Pressable style={styles.tabBtn} onPress={() => setTab('all')}>
          <AppText variant="bodyStrong" weight={tab === 'all' ? 'bold' : 'semibold'} color={tab === 'all' ? colors.primary : colors.textMuted}>All</AppText>
          <View style={[styles.underline, tab === 'all' && styles.underlineActive]} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {actionAlerts.map((a) => (
          <AlertCard key={a.id} tone={a.tone} icon={a.icon} title={a.title} time={a.time} message={a.message} actionLabel={a.actionLabel} onAction={() => onAction(a)} />
        ))}

        {showEarlier ? (
          <>
            <AppText variant="label" muted style={styles.section}>Earlier</AppText>
            {earlierAlerts.map((a) => (
              <AlertCard key={a.id} tone={a.tone} icon={a.icon} title={a.title} time={a.time} message={a.message} compact />
            ))}
          </>
        ) : null}
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
  tabs: { flexDirection: 'row', paddingHorizontal: 22, gap: spacing.lg },
  tabBtn: { alignItems: 'center', gap: 8, paddingTop: 4 },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countPill: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: colors.errorStrong, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 10, lineHeight: 13 },
  underline: { height: 2.5, width: '100%', borderRadius: 2, backgroundColor: 'transparent' },
  underlineActive: { backgroundColor: colors.primary },
  scroll: { paddingHorizontal: 22, paddingTop: 14, gap: 12 },
  section: { marginTop: 8, marginBottom: 2 },
});
