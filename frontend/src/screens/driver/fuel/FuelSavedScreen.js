import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, Badge, colors, spacing, radius } from '../../../components/ui';
import * as mock from '../../../demo/mock';

/**
 * 19 · Fuel saved — with mileage feedback. UI-only demo.
 */
export default function FuelSavedScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { fuel } = mock;
  const pocket = (route.params?.paidBy ?? 'My pocket') === 'My pocket';

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <StatusBar style="dark" />

      <View style={styles.body}>
        <View style={styles.checkOuter}>
          <View style={styles.checkInner}><Ionicons name="checkmark" size={40} color={colors.white} /></View>
        </View>
        <AppText variant="h1" weight="extrabold" center style={styles.title}>Fuel entry saved</AppText>
        <AppText variant="body" muted center style={styles.sub}>
          {fuel.litres} L for {fuel.totalFmt} recorded against {mock.activeTrip.id}.{pocket ? ' Sent to the owner for confirmation.' : ''}
        </AppText>

        {/* Mileage */}
        <Card elevated="sm" padding={16} style={styles.card}>
          <View style={styles.cardHead}>
            <AppText variant="label" muted>Mileage this tank</AppText>
            <Badge tone="valid" label={fuel.mileageDelta} />
          </View>
          <View style={styles.mileRow}>
            <AppText mono weight="semibold" style={styles.bigVal}>{fuel.mileage}</AppText>
            <AppText variant="small" mono muted>km/L · fleet avg {fuel.fleetAvg}</AppText>
          </View>
          <View style={styles.track}><View style={[styles.fill, { width: `${fuel.mileagePercent}%` }]} /></View>
        </Card>

        {/* Wallet projection */}
        {pocket ? (
          <Card elevated="sm" padding={16} style={styles.card}>
            <AppText variant="label" muted>Wallet after confirmation</AppText>
            <View style={styles.walletRow}>
              <AppText mono variant="small" muted>{fuel.walletBefore} + {fuel.totalFmt}</AppText>
              <AppText mono weight="semibold" color={colors.success} style={styles.walletVal}>{fuel.walletAfter}</AppText>
            </View>
          </Card>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button size="lg" label="Back to trip" onPress={() => navigation.navigate('Main')} />
        <Button variant="secondary" size="lg" label="View fuel log" onPress={() => navigation.navigate('FuelLog')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  checkOuter: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  checkInner: { width: 74, height: 74, borderRadius: 37, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: spacing.sm },
  sub: { maxWidth: 320 },
  card: { width: '100%', marginTop: spacing.sm, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mileRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  bigVal: { fontSize: 28, lineHeight: 32 },
  track: { height: 7, borderRadius: radius.full, backgroundColor: colors.border, overflow: 'hidden', marginTop: 4 },
  fill: { height: 7, borderRadius: radius.full, backgroundColor: colors.success },
  walletRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  walletVal: { fontSize: 20, lineHeight: 24 },
  actions: { gap: spacing.sm },
});
