import React, { useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { AppText, Button, TextField, Badge, SegmentedControl, StepProgress, WarningBanner, colors, spacing, radius } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useSubmit } from '../../../hooks/useSubmit';
import { useDriverVehicle } from '../../../hooks/useDriverVehicle';
import fuelService from '../../../services/fuelService';

const FUEL_TYPE = { Diesel: 'DIESEL', AdBlue: 'ADBLUE' };
const FILLING = { 'Full tank': 'FULL_TANK', Partial: 'PARTIAL' };

/**
 * 18 · Fuel details — confirm the reading and submit the fuel log.
 */
export default function FuelEntryDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const params = route.params || {};
  const photo = params.photo || null; // fuel bill captured on the previous step
  const [litres, setLitres] = useState(params.litres != null ? String(params.litres) : '');
  const [rate, setRate] = useState(params.rate != null ? String(params.rate) : '');
  const [total, setTotal] = useState(params.total != null ? String(params.total) : '');
  const [paidBy, setPaidBy] = useState('My pocket');
  const [fuelType, setFuelType] = useState('Diesel');
  const [filling, setFilling] = useState('Full tank');
  const odometer = params.odometer != null ? String(params.odometer) : ''; // mapping to confirm
  const pump = params.pump || ''; // mapping to confirm
  const { submit, busy } = useSubmit();
  const { user } = useAuth();
  const { vehicleId } = useDriverVehicle();

  const totalNum = Number(String(total).replace(/[^0-9.]/g, ''));
  const totalFmt = totalNum > 0 ? `₹${totalNum.toLocaleString('en-IN')}` : 'the amount';

  const onSave = () => {
    if (!vehicleId) {
      Alert.alert('No vehicle assigned', 'You don’t have a vehicle assigned yet. Ask your manager to assign one before logging fuel.');
      return;
    }
    submit(
    () => fuelService.submitFuelLog({
      vehicleId,
      driverId: user?._id,
      fuelType: FUEL_TYPE[fuelType] || 'DIESEL',
      fillingType: FILLING[filling] || 'FULL_TANK',
      litres,
      rate,
      odometerReading: odometer || undefined,
      refuelTime: new Date().toISOString(),
      photo,
    }),
    {
      onSuccess: (log) => navigation.navigate('FuelSaved', {
        paidBy,
        litres,
        totalFmt,
        // Real values from the created log when the backend returns them; FuelSaved falls back to '—'. (mapping to confirm)
        tripId: log?.trip?.tripCode || log?.tripId,
        mileage: log?.mileage != null ? Number(log.mileage).toFixed(1) : undefined,
        mileageDelta: log?.mileageDelta,
        fleetAvg: log?.fleetAvg != null ? Number(log.fleetAvg).toFixed(1) : undefined,
        mileagePercent: log?.mileagePercent,
        walletBefore: log?.walletBefore,
        walletAfter: log?.walletAfter,
      }),
      onError: (e) => Alert.alert('Could not save', e?.message || 'Please try again.'),
    },
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

        <TextField label="Odometer" value={odometer ? `${odometer} km` : '—'} mono editable={false} style={styles.gap} />

        <AppText variant="label" muted style={styles.gap}>Fuel type</AppText>
        <SegmentedControl options={['Diesel', 'AdBlue']} value={fuelType} onChange={setFuelType} style={styles.gapSm} />

        <AppText variant="label" muted style={styles.gap}>Filling</AppText>
        <SegmentedControl options={['Full tank', 'Partial']} value={filling} onChange={setFilling} style={styles.gapSm} />

        <AppText variant="label" muted style={styles.gap}>Paid by</AppText>
        <SegmentedControl options={['My pocket', 'Fuel card', 'Credit']} value={paidBy} onChange={setPaidBy} style={styles.gapSm} />

        <TextField label="Pump" value={pump || '—'} editable={false} style={styles.gap} />

        {paidBy === 'My pocket' ? (
          <WarningBanner tone="info" message={`Paid from your pocket, so ${totalFmt} goes to the owner for confirmation and then into your wallet.`} style={styles.gap} />
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
