import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, StatusBadge, colors, spacing, radius } from '../../../components/ui';

/**
 * 10 · Bill sent — pending, not reimbursed. UI-only demo.
 */
export default function BillSentScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { amount = '₹1,250', category = 'Other', trip = 'TR-4821', date = '04 Aug' } = route.params || {};

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <StatusBar style="dark" />

      <View style={styles.body}>
        <View style={styles.checkOuter}>
          <View style={styles.checkInner}>
            <Ionicons name="checkmark" size={40} color={colors.white} />
          </View>
        </View>
        <AppText variant="h1" weight="extrabold" center style={styles.title}>Sent for confirmation</AppText>
        <AppText variant="body" muted center style={styles.sub}>
          {amount} will be added to your wallet once the owner confirms this bill. Your balance has not changed yet.
        </AppText>

        <Card elevated="sm" padding={0} style={styles.receipt}>
          <View style={styles.receiptRow}>
            <AppText variant="small" weight="semibold">{category} · bill</AppText>
            <StatusBadge status="pending" />
          </View>
          <View style={styles.receiptDivider} />
          <View style={styles.receiptRow}>
            <AppText variant="caption" mono muted>{date} · {trip}</AppText>
            <AppText mono variant="h3" weight="semibold">{amount}</AppText>
          </View>
        </Card>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={15} color={colors.textMuted} />
          <AppText variant="small" muted>Owners usually confirm within a day.</AppText>
        </View>
      </View>

      <View style={styles.actions}>
        <Button size="lg" label="View my wallet" onPress={() => navigation.navigate('Wallet')} />
        <Button variant="secondary" size="lg" label="Add another bill" onPress={() => navigation.navigate('AddBill')} />
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
  receipt: { width: '100%', marginTop: spacing.md },
  receiptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  receiptDivider: { height: 1, backgroundColor: colors.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  actions: { gap: spacing.sm },
});
