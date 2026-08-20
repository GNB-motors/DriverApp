import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText, Button, Card, Switch, Badge, StatusBadge, WalletHeroCard,
  WarningBanner, StepProgress, colors, spacing, radius,
} from '../components/ui';
import * as mock from '../demo/mock';

/**
 * 01 / 02 · Driver Home — on-duty and off-duty variants. UI-only demo.
 */
const QUICK_ACTIONS = [
  { key: 'fuel', icon: 'water', label: 'Add fuel' },
  { key: 'bill', icon: 'receipt-outline', label: 'Add bill', primary: true },
  { key: 'docs', icon: 'document-text-outline', label: 'Documents' },
  { key: 'sos', icon: 'alert', label: 'SOS', danger: true },
];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [onDuty, setOnDuty] = useState(true);
  const { driver, wallet, activeTrip, lastRefuel } = mock;

  const openWallet = () => navigation.navigate('Wallet');
  const onQuick = (key) => {
    if (key === 'fuel') navigation.navigate('FuelCapture');
    else if (key === 'bill') navigation.navigate('AddBill');
    else if (key === 'docs') navigation.navigate('MyDocuments');
    else if (key === 'sos') navigation.navigate('SOSOptions');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <LinearGradient colors={colors.avatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          <AppText weight="extrabold" color={colors.white} style={styles.avatarText}>{driver.initials}</AppText>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <AppText variant="small" weight="medium" muted>Namaste</AppText>
          <AppText variant="h3" weight="extrabold" numberOfLines={1}>{driver.name}</AppText>
        </View>
        <Pressable style={styles.bell} hitSlop={8} onPress={() => navigation.navigate('Alerts')}>
          <Ionicons name="notifications-outline" size={21} color={colors.text} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Duty status */}
        <Card onPress={() => setOnDuty((v) => !v)} elevated="sm" padding={15} style={styles.dutyCard}>
          <View style={[styles.dutyIcon, { backgroundColor: onDuty ? colors.validBg : colors.background }]}>
            <Ionicons name="power" size={21} color={onDuty ? colors.success : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.dutyTitleRow}>
              <AppText variant="bodyStrong" weight="bold">{onDuty ? 'On duty' : 'Off duty'}</AppText>
              {onDuty ? <View style={styles.dutyDot} /> : null}
            </View>
            <AppText variant="small" muted numberOfLines={1}>
              {onDuty ? 'Since 06:12 · 3 h 18 m' : 'Last shift ended 21:40'}
            </AppText>
          </View>
          <View pointerEvents="none"><Switch value={onDuty} /></View>
        </Card>

        {/* Wallet hero */}
        <WalletHeroCard
          balance={wallet.balance}
          caption={onDuty ? '1 bill awaiting confirmation' : `${wallet.pendingCount} bill pending · ${wallet.confirmedCount} confirmed`}
          onPress={openWallet}
        />

        {onDuty ? (
          /* Active trip */
          <Card elevated="sm" padding={16} style={styles.gap}>
            <View style={styles.tripTop}>
              <Badge tone="neutral" label={activeTrip.id} />
              <StatusBadge status={activeTrip.status} dot />
            </View>
            <View style={styles.route}>
              <AppText variant="bodyStrong" weight="bold" numberOfLines={1} style={styles.routeText}>{activeTrip.from}</AppText>
              <View style={styles.dashed} />
              <AppText variant="bodyStrong" weight="bold" numberOfLines={1} style={styles.routeText}>{activeTrip.to}</AppText>
            </View>
            <StepProgress variant="dots" total={activeTrip.totalStages} current={activeTrip.stage} style={styles.gapSm} />
            <View style={styles.tripMetaRow}>
              <AppText variant="small" weight="semibold" numberOfLines={1} style={styles.tripMetaLeft}>
                Stage {activeTrip.stage} of {activeTrip.totalStages} · {activeTrip.stageLabel}
              </AppText>
              <AppText variant="small" muted numberOfLines={1} style={styles.tripMetaRight}>Next: {activeTrip.next}</AppText>
            </View>
            <Button variant="secondary" size="sm" label="Open trip" onPress={() => navigation.navigate('ActiveTrip')} style={styles.gapSm} />
          </Card>
        ) : (
          /* Off-duty: no trip + licence warning + stats */
          <>
            <Card variant="outline" elevated="none" padding={20} style={[styles.gap, styles.emptyTrip]}>
              <View style={styles.emptyIcon}><Ionicons name="cube-outline" size={26} color={colors.textMuted} /></View>
              <AppText variant="bodyStrong" weight="bold" center>No trip assigned</AppText>
              <AppText variant="small" muted center style={styles.emptySub}>Go on duty to start receiving trips.</AppText>
              <Button size="md" label="Go on duty" onPress={() => setOnDuty(true)} style={styles.gapSm} />
            </Card>

            <WarningBanner
              tone="warning"
              title="Licence expires in 24 days."
              message="Renew it to keep taking trips."
              actionLabel="Open documents"
              onAction={() => navigation.navigate('MyDocuments')}
              style={styles.gap}
            />

            <View style={[styles.statRow, styles.gap]}>
              <Card elevated="sm" padding={14} style={styles.statCard}>
                <AppText variant="label" muted>Trips this month</AppText>
                <AppText mono variant="h2" weight="semibold">{driver.tripsThisMonth}</AppText>
              </Card>
              <Card elevated="sm" padding={14} style={styles.statCard}>
                <AppText variant="label" muted>Distance</AppText>
                <AppText mono variant="h2" weight="semibold">{driver.distance}</AppText>
              </Card>
            </View>
          </>
        )}

        {/* Quick actions */}
        <View style={[styles.grid, styles.gap]}>
          {QUICK_ACTIONS.map((a) => (
            <Pressable
              key={a.key}
              style={[styles.gridItem, a.primary && styles.gridPrimary, a.danger && styles.gridDanger]}
              onPress={() => onQuick(a.key)}
            >
              <Ionicons name={a.icon} size={22} color={a.primary ? colors.white : a.danger ? colors.error : colors.primary} />
              <AppText variant="small" weight="bold" center color={a.primary ? colors.white : a.danger ? colors.error : colors.text}>
                {a.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* Last refuel */}
        <Card elevated="sm" padding={14} style={styles.gap}>
          <View style={styles.lastRow}>
            <View style={styles.lastIcon}><Ionicons name="water" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" muted>Last refuel</AppText>
              <AppText variant="small" mono muted>{lastRefuel.litres} · {lastRefuel.meta}</AppText>
            </View>
            <AppText mono variant="h3" weight="semibold">{lastRefuel.amount}</AppText>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 22, paddingBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  bell: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0A1024', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  bellDot: {
    position: 'absolute', top: 11, right: 12, width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.surface,
  },
  scroll: { paddingHorizontal: 22, paddingTop: 6, gap: 14 },
  gap: { marginTop: 0 },
  gapSm: { marginTop: 12 },

  dutyCard: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  dutyIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dutyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dutyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },

  tripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeText: { flexShrink: 1, maxWidth: '38%' },
  dashed: { flex: 1, height: 0, borderTopWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  tripMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 },
  tripMetaLeft: { flex: 1, flexShrink: 1 },
  tripMetaRight: { flexShrink: 0 },

  emptyTrip: { alignItems: 'center', borderStyle: 'dashed' },
  emptyIcon: {
    width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  emptySub: { marginTop: 4 },

  statRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, gap: 4 },

  grid: { flexDirection: 'row', gap: 10 },
  gridItem: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 16, gap: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  gridPrimary: { backgroundColor: colors.primary, borderColor: colors.primaryDeep },
  gridDanger: { backgroundColor: colors.expiredBg, borderColor: '#F0CFCB' },

  lastRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lastIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
});
