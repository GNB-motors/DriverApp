import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, Stepper, StatusBadge, WarningBanner, colors, spacing, radius } from '../components/ui';
import * as mock from '../demo/mock';

/**
 * 03 · Active trip — the 8-stage pipeline. UI-only demo.
 */
export default function ActiveTripScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { activeTrip, driver, tripStages } = mock;
  const done = tripStages.filter((s) => s.status === 'done' || s.status === 'current').length;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Active trip</AppText>
          <AppText variant="caption" mono muted>{activeTrip.id} · {driver.plate}</AppText>
        </View>
        <StatusBadge status={activeTrip.status} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <Card elevated="sm" padding={16}>
          <View style={styles.cardHead}>
            <AppText variant="label" muted>Progress</AppText>
            <AppText mono variant="small" weight="semibold">{done} / {activeTrip.totalStages}</AppText>
          </View>
          <Stepper steps={tripStages} style={styles.stepper} />
        </Card>

        {/* Trip advance */}
        <Card elevated="sm" padding={16} style={styles.gap}>
          <View style={styles.cardHead}>
            <AppText variant="bodyStrong" weight="bold">Trip advance</AppText>
            <StatusBadge status="paid" />
          </View>
          <View style={styles.advRow}>
            <View>
              <AppText variant="caption" mono muted>UPI · 01 Aug · ADV-1192</AppText>
              <AppText variant="caption" muted>Debited from your wallet</AppText>
            </View>
            <AppText mono variant="h3" weight="semibold">{activeTrip.advance}</AppText>
          </View>
        </Card>

        {/* Actions */}
        <View style={[styles.actions, styles.gap]}>
          <Button size="lg" icon="cloud-upload-outline" label="Submit consignment note" onPress={() => navigation.navigate('ConsignmentNote')} />
          <Button variant="secondary" size="lg" icon="camera-outline" label="Record POD at delivery" onPress={() => navigation.navigate('Pod')} />
          <Button variant="ghost" size="md" icon="add" label="Add a trip expense" onPress={() => navigation.navigate('AddBill')} />
        </View>

        <WarningBanner tone="info" message="Consignment note is needed before gate out." style={styles.gap} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 14 },
  gap: { marginTop: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  stepper: { marginTop: 2 },
  advRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { gap: 10 },
});
