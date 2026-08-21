import React, { useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { AppText, Button, TextField, Badge, SegmentedControl, StepProgress, WarningBanner, colors, spacing, radius } from '../../../components/ui';
import * as mock from '../../../demo/mock';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useSubmit } from '../../../hooks/useSubmit';
import fuelService from '../../../services/fuelService';

/**
 * 18 · Fuel details — read from the photos. UI-only demo.
 */
export default function FuelEntryDetailsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { fuel } = mock;
  const [litres, setLitres] = useState(fuel.litres);
  const [rate, setRate] = useState(fuel.rate);
  const [total, setTotal] = useState(fuel.total);
  const [paidBy, setPaidBy] = useState('My pocket');
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token && token !== 'demo-token';
  const { submit, busy } = useSubmit();
  const onSave = () => {
    const go = () => navigation.navigate('FuelSaved', { paidBy });
    if (!useReal) return go();
    return submit(
      () => fuelService.submitFuelLog({ litres, rate, totalAmount: total, paidBy }),
      { onSuccess: go, onError: (e) => Alert.alert('Could not save', e?.message || 'Please try again.') },
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Add fuel</AppText>
          <AppText variant="caption" muted>Step 2 of 2 · details</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <StepProgress variant="segments" total={2} current={2} style={styles.step} />

        <View style={styles.thumbStrip}>
          <View style={styles.dot} />
          <AppText variant="small" weight="semibold" muted>3 photos attached</AppText>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}><TextField label="Litres" value={litres} onChangeText={setLitres} mono keyboardType="numeric" /></View>
          <View style={styles.col}><TextField label="Rate / L" value={rate} onChangeText={setRate} mono keyboardType="numeric" /></View>
        </View>

        <View style={styles.totalWrap}>
          <TextField label="Total amount" value={total} onChangeText={setTotal} mono keyboardType="numeric" icon="cash-outline" />
          <View style={styles.matchPill}><Badge tone="valid" label="Matches bill" /></View>
        </View>

        <TextField label="Odometer" value={`${fuel.odometer} km`} mono editable={false} style={styles.gap} />

        <AppText variant="label" muted style={styles.gap}>Paid by</AppText>
        <SegmentedControl options={['My pocket', 'Fuel card', 'Credit']} value={paidBy} onChange={setPaidBy} style={styles.gapSm} />

        <TextField label="Pump" value={fuel.pump} editable={false} style={styles.gap} />

        {paidBy === 'My pocket' ? (
          <WarningBanner tone="info" message={`Paid from your pocket, so ${fuel.totalFmt} goes to the owner for confirmation and then into your wallet.`} style={styles.gap} />
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button size="lg" label="Save fuel entry" iconRight="arrow-forward" loading={busy} onPress={onSave} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  step: { marginBottom: 14 },
  thumbStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dotGreen },
  twoCol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  totalWrap: { marginTop: 10 },
  matchPill: { position: 'absolute', right: 12, top: 12 },
  gap: { marginTop: 14 },
  gapSm: { marginTop: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
