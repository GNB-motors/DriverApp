/**
 * CnUploadScreen.js — Consignment note (bilty) filing.
 *
 * Two steps, matching the backend exactly:
 *   1. POST /api/erp/consignments/upload-bilty  (multipart) → Document
 *   2. POST /api/erp/consignments               with biltyDocumentId
 *
 * The validator requires `biltyDocumentId`, so the photo must be uploaded before
 * the form can be submitted — the flow is ordered that way rather than letting
 * the user fill everything in and fail at the end.
 *
 * Saving the CN sets `cnGate = 'UPDATED'`, which promotes the trip to
 * DISPATCHED via the state worker. That is asynchronous, so on success we ask
 * ErpContext to re-read shortly afterwards instead of claiming the new state.
 */

import React, { useState, useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useErp } from '../../context/ErpContext';
import { uploadBiltyDocument, saveConsignment } from '../../services/erpApi';
import {
  AppText, Card, Button, TextField, Badge, SubHeader, Chip,
  SegmentedControl, colors, radius,
} from '../../components/ui';
import { canSaveCn, tripRoute } from '../../domain/tripState';

const UNITS = [
  { label: 'KL', value: 'KL' },
  { label: 'MT', value: 'MT' },
];

export default function CnUploadScreen({ route, navigation }) {
  const { token } = useAuth();
  const { activeTrip, triggerRefresh } = useErp();
  const trip = route?.params?.trip || activeTrip;

  const [bilty, setBilty] = useState(null);        // local asset before upload
  const [documentId, setDocumentId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [cnNumber, setCnNumber] = useState('');
  const [cnDate, setCnDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [loadingDate, setLoadingDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [loadedQty, setLoadedQty] = useState('');
  const [qtyUnit, setQtyUnit] = useState('KL');
  const [temperature, setTemperature] = useState('');
  const [density, setDensity] = useState('');
  const [sealInput, setSealInput] = useState('');
  const [seals, setSeals] = useState([]);
  const [saving, setSaving] = useState(false);

  const stateAllows = canSaveCn(trip);

  const errors = useMemo(() => {
    const e = {};
    if (!documentId) e.bilty = 'Photograph the bilty first.';
    if (!cnNumber.trim()) e.cnNumber = 'CN number is required.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cnDate)) e.cnDate = 'Use YYYY-MM-DD.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(loadingDate)) e.loadingDate = 'Use YYYY-MM-DD.';
    const qty = Number(loadedQty);
    if (!loadedQty || Number.isNaN(qty) || qty <= 0) e.loadedQty = 'Enter the quantity loaded.';
    return e;
  }, [documentId, cnNumber, cnDate, loadingDate, loadedQty]);

  const canSubmit = Object.keys(errors).length === 0 && !saving && stateAllows;

  // ── Step 1: capture + upload ──────────────────────────────────────────────
  const pickBilty = async (fromCamera) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        fromCamera
          ? 'Allow camera access to photograph the bilty.'
          : 'Allow photo access to attach a bilty image.',
      );
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const file = {
      uri: asset.uri,
      name: asset.fileName || `bilty-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    };

    setBilty(file);
    setDocumentId(null);
    setUploading(true);
    try {
      const doc = await uploadBiltyDocument(token, file, { tripId: trip?._id });
      const id = doc?._id || doc?.documentId || doc?.id;
      if (!id) throw new Error('Upload succeeded but no document id came back.');
      setDocumentId(id);
    } catch (err) {
      setBilty(null);
      Alert.alert('Upload failed', err?.message || 'Could not upload the bilty. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const addSeal = () => {
    const value = sealInput.trim().toUpperCase();
    if (!value || seals.includes(value)) return;
    setSeals((prev) => [...prev, value]);
    setSealInput('');
  };

  // ── Step 2: save the CN ───────────────────────────────────────────────────
  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await saveConsignment(token, {
        tripId: trip._id,
        biltyDocumentId: documentId,
        cnNumber: cnNumber.trim().toUpperCase(),
        cnDate,
        loadingDate,
        loadedQty: Number(loadedQty),
        loadedQtyUnit: qtyUnit,
        ...(temperature ? { temperature: Number(temperature) } : {}),
        ...(density ? { density: Number(density) } : {}),
        ...(seals.length ? { sealNumbers: seals } : {}),
      });

      // The trip's promotion to DISPATCHED happens in a background worker.
      triggerRefresh();
      Alert.alert('CN filed', 'Your consignment note has been saved.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Could not save CN', err?.message || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!trip) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="Consignment Note" onBack={() => navigation.goBack()} />
        <View style={styles.centre}>
          <AppText variant="body" muted>No trip selected.</AppText>
        </View>
      </View>
    );
  }

  const routeText = tripRoute(trip).text;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <SubHeader
        title="Consignment Note"
        subtitle={`${trip.tripNumber} · ${routeText}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!stateAllows && (
          <Card variant="outline" padding={14} style={[styles.card, styles.warnCard]}>
            <AppText variant="small" weight="semibold" color={colors.warning}>
              A CN can only be filed while the trip is placed. This trip is already
              past that stage — check with your manager.
            </AppText>
          </Card>
        )}

        {/* ── Step 1 ── */}
        <Card padding={18} elevated="sm" style={styles.card}>
          <View style={styles.stepHead}>
            <StepDot n={1} done={!!documentId} />
            <AppText variant="bodyStrong" weight="bold" style={styles.stepTitle}>
              Photograph the bilty
            </AppText>
            {documentId ? <Badge tone="valid" label="Uploaded" /> : null}
          </View>

          {bilty && !documentId && uploading && (
            <AppText variant="small" muted style={styles.uploadNote}>
              Uploading {bilty.name}…
            </AppText>
          )}

          {documentId ? (
            <View style={styles.uploadedRow}>
              <Ionicons name="document-attach" size={18} color={colors.success} />
              <AppText variant="small" weight="semibold" style={styles.uploadedName} numberOfLines={1}>
                {bilty?.name || 'Bilty attached'}
              </AppText>
              <Pressable onPress={() => { setBilty(null); setDocumentId(null); }} hitSlop={8}>
                <AppText variant="small" weight="bold" color={colors.error}>Replace</AppText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.pickRow}>
              <Button
                variant="secondary"
                size="sm"
                icon="camera"
                label="Camera"
                loading={uploading}
                onPress={() => pickBilty(true)}
                fullWidth={false}
                style={styles.pickBtn}
              />
              <Button
                variant="secondary"
                size="sm"
                icon="images"
                label="Gallery"
                loading={uploading}
                onPress={() => pickBilty(false)}
                fullWidth={false}
                style={styles.pickBtn}
              />
            </View>
          )}
        </Card>

        {/* ── Step 2 ── */}
        <Card padding={18} elevated="sm" style={styles.card}>
          <View style={styles.stepHead}>
            <StepDot n={2} done={false} />
            <AppText variant="bodyStrong" weight="bold" style={styles.stepTitle}>
              CN details
            </AppText>
          </View>

          <TextField
            label="CN number"
            value={cnNumber}
            onChangeText={setCnNumber}
            placeholder="CN/24-25/0311"
            autoCapitalize="characters"
            error={cnNumber ? errors.cnNumber : undefined}
            style={styles.field}
          />
          <TextField
            label="CN date"
            value={cnDate}
            onChangeText={setCnDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={errors.cnDate}
            style={styles.field}
          />
          <TextField
            label="Loading date"
            value={loadingDate}
            onChangeText={setLoadingDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={errors.loadingDate}
            style={styles.field}
          />

          <AppText variant="label" muted style={styles.fieldLabel}>QUANTITY LOADED</AppText>
          <View style={styles.qtyRow}>
            <View style={styles.qtyInput}>
              <TextField
                value={loadedQty}
                onChangeText={setLoadedQty}
                placeholder="19.8"
                keyboardType="decimal-pad"
                error={loadedQty ? errors.loadedQty : undefined}
              />
            </View>
            <SegmentedControl
              options={UNITS}
              value={qtyUnit}
              onChange={setQtyUnit}
              style={styles.unitControl}
            />
          </View>

          <View style={styles.pairRow}>
            <View style={styles.pairItem}>
              <TextField
                label="Temperature (°C)"
                value={temperature}
                onChangeText={setTemperature}
                placeholder="Optional"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.pairItem}>
              <TextField
                label="Density"
                value={density}
                onChangeText={setDensity}
                placeholder="Optional"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <AppText variant="label" muted style={styles.fieldLabel}>SEAL NUMBERS</AppText>
          <View style={styles.sealRow}>
            <View style={styles.sealInput}>
              <TextField
                value={sealInput}
                onChangeText={setSealInput}
                placeholder="Add a seal number"
                autoCapitalize="characters"
                onSubmitEditing={addSeal}
                returnKeyType="done"
              />
            </View>
            <Button
              variant="secondary"
              size="sm"
              icon="add"
              label="Add"
              onPress={addSeal}
              fullWidth={false}
              style={styles.sealAdd}
            />
          </View>
          {seals.length > 0 && (
            <View style={styles.sealChips}>
              {seals.map((s) => (
                <Chip
                  key={s}
                  label={`${s}  ✕`}
                  selected
                  onPress={() => setSeals((p) => p.filter((x) => x !== s))}
                />
              ))}
            </View>
          )}
        </Card>

        <Button
          label={saving ? 'Saving CN…' : 'Save consignment note'}
          loading={saving}
          disabled={!canSubmit}
          onPress={submit}
          style={styles.submit}
        />
        {!documentId && (
          <AppText variant="caption" muted style={styles.hint}>
            The bilty photo is required before the CN can be saved.
          </AppText>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StepDot({ n, done }) {
  return (
    <View style={[styles.stepDot, done && styles.stepDotDone]}>
      {done ? (
        <Ionicons name="checkmark" size={13} color={colors.white} />
      ) : (
        <AppText variant="caption" weight="bold" color={colors.white}>{n}</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22, paddingBottom: 48 },
  card: { marginBottom: 14 },
  warnCard: { borderColor: colors.warning, backgroundColor: colors.pendingBg },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  stepTitle: { flex: 1 },
  stepDot: {
    width: 22, height: 22, borderRadius: radius.full, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: colors.success },
  pickRow: { flexDirection: 'row', gap: 10 },
  pickBtn: { flex: 1 },
  uploadNote: { marginTop: 2 },
  uploadedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    backgroundColor: colors.validBg, borderRadius: radius.md,
  },
  uploadedName: { flex: 1 },
  field: { marginBottom: 14 },
  fieldLabel: { marginTop: 6, marginBottom: 8, letterSpacing: 0.5 },
  qtyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  qtyInput: { flex: 1 },
  unitControl: { width: 118, marginTop: 2 },
  pairRow: { flexDirection: 'row', gap: 12 },
  pairItem: { flex: 1 },
  sealRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sealInput: { flex: 1 },
  sealAdd: { marginTop: 2 },
  sealChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  submit: { marginTop: 8 },
  hint: { textAlign: 'center', marginTop: 10 },
});
