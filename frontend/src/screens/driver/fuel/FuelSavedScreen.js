import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, colors, spacing } from '../../../components/ui';

/**
 * 19 · Fuel saved — with mileage feedback.
 */
export default function FuelSavedScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  // Success screen: values are handed over by FuelEntryDetails from the create
  // response (no fetch of its own). The fuel-log endpoint returns neither a
  // fleet average nor a wallet projection, so neither is shown.
  const p = route.params || {};
  const pocket = (p.paidBy ?? 'My pocket') === 'My pocket';
  const litres = p.litres ?? '—';
  const totalFmt = p.totalFmt ?? '—';
  const tripId = p.tripId ?? '';
  const mileage = p.mileage ?? null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <StatusBar style="dark" />

      <View style={styles.body}>
        <View style={styles.checkOuter}>
          <View style={styles.checkInner}><Ionicons name="checkmark" size={40} color={colors.white} /></View>
        </View>
        <AppText variant="h1" weight="extrabold" center style={styles.title}>Fuel entry saved</AppText>
        <AppText variant="body" muted center style={styles.sub}>
          {litres} L for {totalFmt} recorded{tripId ? ` against ${tripId}` : ''}.{pocket ? ' Sent to the owner for confirmation.' : ''}
        </AppText>

        {/* Mileage */}
        {mileage ? (
          <Card elevated="sm" padding={16} style={styles.card}>
            <View style={styles.cardHead}>
              <AppText variant="label" muted>Mileage this tank</AppText>
            </View>
            <View style={styles.mileRow}>
              <AppText mono weight="semibold" style={styles.bigVal}>{mileage}</AppText>
              <AppText variant="small" mono muted>km/L</AppText>
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
  actions: { gap: spacing.sm },
});
