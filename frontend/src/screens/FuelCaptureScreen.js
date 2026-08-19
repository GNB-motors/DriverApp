import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Badge, StepProgress, WarningBanner, colors, spacing, radius } from '../components/ui';
import * as mock from '../demo/mock';

/**
 * 17 · Fuel capture — the three photos. UI-only demo.
 */
export default function FuelCaptureScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { fuel } = mock;
  const [billCaptured, setBillCaptured] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Add fuel</AppText>
          <AppText variant="caption" muted>Step 1 of 2 · photos</AppText>
        </View>
        <AppText mono variant="small" weight="semibold" muted>{billCaptured ? 3 : 2}/3</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <StepProgress variant="segments" total={2} current={1} style={styles.step} />

        <CaptureRow icon="speedometer-outline" title="Odometer" value={fuel.odometer} hint="Reading picked up automatically" captured />
        <CaptureRow icon="water-outline" title="Pump meter" value={`${fuel.litres} L`} hint="Litres and rate read from meter" captured />

        {billCaptured ? (
          <CaptureRow icon="receipt-outline" title="Fuel bill" value={fuel.totalFmt} hint="Amount and litres read from bill" captured />
        ) : (
          <View style={styles.dropzone}>
            <View style={styles.dropIcon}><Ionicons name="camera" size={22} color={colors.primary} /></View>
            <AppText variant="bodyStrong" weight="bold" center>Photograph the fuel bill</AppText>
            <AppText variant="small" muted center style={styles.dropSub}>Keep the amount and litres inside the frame.</AppText>
            <View style={styles.dropBtns}>
              <Button size="md" icon="camera" label="Camera" fullWidth={false} style={styles.dropBtn} onPress={() => setBillCaptured(true)} />
              <Button variant="secondary" size="md" icon="image" label="Gallery" fullWidth={false} style={styles.dropBtn} onPress={() => setBillCaptured(true)} />
            </View>
          </View>
        )}

        <WarningBanner tone="warning" message="Fuel entries without a bill photo are held for owner review." style={styles.gap} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button size="lg" label="Continue" iconRight="arrow-forward" disabled={!billCaptured} onPress={() => navigation.navigate('FuelEntryDetails')} />
      </View>
    </View>
  );
}

function CaptureRow({ icon, title, value, hint, captured }) {
  return (
    <View style={styles.captureRow}>
      <View style={styles.thumb}>
        <Ionicons name={icon} size={20} color={colors.textMuted} />
        <AppText variant="caption" mono muted numberOfLines={1}>{value}</AppText>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.captureTitle}>
          <AppText variant="bodyStrong" weight="bold">{title}</AppText>
          {captured ? <Badge tone="valid" label="Captured" /> : null}
        </View>
        <AppText variant="caption" muted>{hint}</AppText>
        <AppText variant="caption" weight="bold" color={colors.primary}>Retake</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  step: { marginBottom: 4 },
  gap: { marginTop: 2 },
  captureRow: {
    flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  thumb: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 4 },
  captureTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropzone: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed',
  },
  dropIcon: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dropSub: { maxWidth: 260 },
  dropBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  dropBtn: { paddingHorizontal: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
