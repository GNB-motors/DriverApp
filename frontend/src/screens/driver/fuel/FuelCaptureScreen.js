import React, { useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Badge, StepProgress, WarningBanner, colors, spacing, radius } from '../../../components/ui';
import { pickFromCamera, pickFromGallery } from '../../../utils/pickImage';
import Picker from '../../../components/ui/SelectField';
import { useAuth } from '../../../context/AuthContext';
import { useDriverVehicle } from '../../../hooks/useDriverVehicle';
import { scanDocument } from '../../../services/api';
import { receiptFields, receiptRefuelTime } from '../../../telematics/services/fuelReceipt';

/**
 * 17 · Fuel capture — the three photos. Captures the real bill photo.
 */
export default function FuelCaptureScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState(null); // fuel bill photo { uri, name, type }
  const [receipt, setReceipt] = useState({});
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const scanVersion = useRef(0);
  const [odometerPhoto, setOdometerPhoto] = useState(null); // optional odometer photo
  // Odometer + pump readings are confirmed on the next step; route params carry
  // any values forwarded from an earlier OCR pass — nothing is prefilled.
  const odometer = route.params?.odometer;
  const litres = receipt.litres || route.params?.litres;
  const billCaptured = !!photo;
  const odoCaptured = !!odometerPhoto || odometer != null;
  const captured = (billCaptured ? 1 : 0) + (odoCaptured ? 1 : 0) + (litres != null ? 1 : 0);
  async function selectBill(picker) {
    try {
      const file = await picker();
      if (!file) return;
      const version = ++scanVersion.current;
      const uploadedAt = new Date().toISOString();
      setPhoto(file); setReceipt({ refuelTime: uploadedAt }); setScanError(''); setScanning(true);
      try {
        const result = await scanDocument(token, file, 'FUEL_RECEIPT');
        if (version === scanVersion.current) setReceipt({ ...receiptFields({}, result), refuelTime: receiptRefuelTime(result?.datetime, uploadedAt) });
      } catch (error) {
        if (version === scanVersion.current) setScanError(`Could not read receipt: ${error.message}. Enter the details manually.`);
      } finally {
        if (version === scanVersion.current) setScanning(false);
      }
    } catch (error) { setScanError(error.message); }
  }
  const captureBill = () => selectBill(pickFromCamera);
  const pickBill = () => selectBill(pickFromGallery);
  const captureOdo = async () => { const f = await pickFromCamera(); if (f) setOdometerPhoto(f); };
  const pickOdo = async () => { const f = await pickFromGallery(); if (f) setOdometerPhoto(f); };

  const { user, token } = useAuth();
  const { vehicles } = useDriverVehicle();
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const isAgent = user?.role === 'FIELD_AGENT';

  const canContinue = !scanning && (isAgent ? (billCaptured && selectedVehicleId) : billCaptured);

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
        <AppText mono variant="small" weight="semibold" muted>{captured}/3</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <StepProgress variant="segments" total={2} current={1} style={styles.step} />

        {isAgent ? (
          <View style={[styles.gap, { marginBottom: 12 }]}>
            <AppText variant="label" muted>Select Vehicle</AppText>
            <Picker
              accessibilityLabel="Select vehicle"
              selectedValue={selectedVehicleId}
              onValueChange={(itemValue) => setSelectedVehicleId(itemValue)}
            >
              <Picker.Item label="-- Select Vehicle --" value={null} />
              {vehicles.map(v => (
                <Picker.Item key={v._id || v.id} label={v.registrationNumber || v.vehicleNumber || 'Unknown'} value={v._id || v.id} />
              ))}
            </Picker>
          </View>
        ) : (
          <>
            {odometer != null ? (
              <CaptureRow icon="speedometer-outline" title="Odometer" value={String(odometer)} hint="Reading picked up automatically" captured />
            ) : null}
            {litres != null ? (
              <CaptureRow icon="water-outline" title="Pump meter" value={`${litres} L`} hint="Litres and rate read from meter" captured />
            ) : null}
          </>
        )}

        {billCaptured ? (
          <CaptureRow icon="receipt-outline" title="Fuel bill" value={photo.name} hint={scanning ? 'Reading receipt…' : 'Review the bill details on the next step.'} captured onRetake={() => { ++scanVersion.current; setPhoto(null); setReceipt({}); setScanning(false); setScanError(''); }} />
        ) : (
          <View style={styles.dropzone}>
            <View style={styles.dropIcon}><Ionicons name="camera" size={22} color={colors.primary} /></View>
            <AppText variant="bodyStrong" weight="bold" center>Photograph the fuel bill</AppText>
            <AppText variant="small" muted center style={styles.dropSub}>Keep the amount and litres inside the frame.</AppText>
            <View style={styles.dropBtns}>
              <Button size="md" icon="camera" label="Camera" fullWidth={false} style={styles.dropBtn} onPress={captureBill} />
              <Button variant="secondary" size="md" icon="image" label="Gallery" fullWidth={false} style={styles.dropBtn} onPress={pickBill} />
            </View>
          </View>
        )}

        {odometer == null ? (
          odometerPhoto ? (
            <CaptureRow icon="speedometer-outline" title="Odometer" value={odometerPhoto.name} hint="Optional odometer reading" captured onRetake={() => setOdometerPhoto(null)} />
          ) : (
            <View style={[styles.dropzone, styles.gap]}>
              <View style={styles.dropIcon}><Ionicons name="speedometer-outline" size={22} color={colors.primary} /></View>
              <AppText variant="bodyStrong" weight="bold" center>Photograph the odometer (Optional)</AppText>
              <AppText variant="small" muted center style={styles.dropSub}>Capture the vehicle dashboard reading.</AppText>
              <View style={styles.dropBtns}>
                <Button size="md" icon="camera" label="Camera" fullWidth={false} style={styles.dropBtn} onPress={captureOdo} />
                <Button variant="secondary" size="md" icon="image" label="Gallery" fullWidth={false} style={styles.dropBtn} onPress={pickOdo} />
              </View>
            </View>
          )
        ) : null}

        {scanError ? <WarningBanner tone="warning" message={scanError} /> : null}
        <WarningBanner tone="warning" message="Fuel entries without a bill photo are held for owner review." style={styles.gap} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button size="lg" label="Continue" iconRight="arrow-forward" disabled={!canContinue} onPress={() => navigation.navigate('FuelEntryDetails', { photo, odometerPhoto, odometer, litres, refuelTime: receipt.refuelTime, total: receipt.amountInr, rate: receipt.litres && receipt.amountInr ? String(Number(receipt.amountInr) / Number(receipt.litres)) : undefined, pump: receipt.station, selectedVehicleId })} />
      </View>
    </View>
  );
}

function CaptureRow({ icon, title, value, hint, captured, onRetake }) {
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
        {onRetake ? (
          <Pressable onPress={onRetake} hitSlop={10}>
            <AppText variant="caption" weight="bold" color={colors.primary}>Retake</AppText>
          </Pressable>
        ) : null}
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
