/**
 * PodSubmitScreen.js — Proof of delivery hand-in.
 *
 * Two steps, matching the backend:
 *   1. POST /api/erp/pods/upload  (multipart) → Document
 *   2. POST /api/erp/pods         with documentIds + receivedVia: 'DRIVER_APP'
 *
 * `receivedVia: 'DRIVER_APP'` has been a valid enum value on the POD model since
 * before the app existed — the schema anticipated this flow.
 *
 * The backend requires the trip to be TRIP_CLOSED and rejects a received date
 * earlier than the unload date, so both are checked here first rather than
 * letting the user submit into a 400.
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
import { uploadPodDocument, recordPod } from '../../services/erpApi';
import {
  AppText, Card, Button, TextField, Badge, SubHeader, SegmentedControl,
  colors, radius,
} from '../../components/ui';
import { canRecordPod, tripRoute } from '../../domain/tripState';

const COPY_TYPES = [
  { label: 'Soft', value: 'SOFT' },
  { label: 'Hard', value: 'HARD' },
  { label: 'Both', value: 'BOTH' },
];

export default function PodSubmitScreen({ route, navigation }) {
  const { token } = useAuth();
  const { activeTrip, triggerRefresh } = useErp();
  const trip = route?.params?.trip || activeTrip;

  const [scan, setScan] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [receivedDate, setReceivedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [copyType, setCopyType] = useState('BOTH');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const stateAllows = canRecordPod(trip);

  const errors = useMemo(() => {
    const e = {};
    if (!documentId) e.scan = 'Photograph the signed POD first.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedDate)) {
      e.receivedDate = 'Use YYYY-MM-DD.';
    } else if (trip?.unloadedAt && dayjs(receivedDate).isBefore(dayjs(trip.unloadedAt), 'day')) {
      // The backend rejects this too; catching it here saves a round trip.
      e.receivedDate = `Cannot be before the unload date (${dayjs(trip.unloadedAt).format('DD MMM')}).`;
    }
    return e;
  }, [documentId, receivedDate, trip?.unloadedAt]);

  const canSubmit = Object.keys(errors).length === 0 && !saving && stateAllows;

  const pickScan = async (fromCamera) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow access to attach the POD document.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const file = {
      uri: asset.uri,
      name: asset.fileName || `pod-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    };

    setScan(file);
    setDocumentId(null);
    setUploading(true);
    try {
      const doc = await uploadPodDocument(token, file, { tripId: trip?._id });
      const id = doc?._id || doc?.documentId || doc?.id;
      if (!id) throw new Error('Upload succeeded but no document id came back.');
      setDocumentId(id);
    } catch (err) {
      setScan(null);
      Alert.alert('Upload failed', err?.message || 'Could not upload the POD. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await recordPod(token, {
        tripId: trip._id,
        receivedDate,
        copyType,
        receivedVia: 'DRIVER_APP',
        documentIds: [documentId],
        ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
      });
      triggerRefresh();
      Alert.alert('POD submitted', 'Thanks — the office has your proof of delivery.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Could not submit POD', err?.message || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!trip) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="Proof of Delivery" onBack={() => navigation.goBack()} />
        <View style={styles.centre}>
          <AppText variant="body" muted>No trip selected.</AppText>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <SubHeader
        title="Proof of Delivery"
        subtitle={`${trip.tripNumber} · ${tripRoute(trip).text}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!stateAllows && (
          <Card variant="outline" padding={14} style={[styles.card, styles.warnCard]}>
            <AppText variant="small" weight="semibold" color={colors.warning}>
              A POD can only be submitted once the trip has been closed. Ask your
              manager to close it first.
            </AppText>
          </Card>
        )}

        <Card padding={18} elevated="sm" style={styles.card}>
          <View style={styles.stepHead}>
            <StepDot n={1} done={!!documentId} />
            <AppText variant="bodyStrong" weight="bold" style={styles.stepTitle}>
              Photograph the signed POD
            </AppText>
            {documentId ? <Badge tone="valid" label="Uploaded" /> : null}
          </View>

          {documentId ? (
            <View style={styles.uploadedRow}>
              <Ionicons name="document-attach" size={18} color={colors.success} />
              <AppText variant="small" weight="semibold" style={styles.uploadedName} numberOfLines={1}>
                {scan?.name || 'POD attached'}
              </AppText>
              <Pressable onPress={() => { setScan(null); setDocumentId(null); }} hitSlop={8}>
                <AppText variant="small" weight="bold" color={colors.error}>Replace</AppText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.pickRow}>
              <Button
                variant="secondary" size="sm" icon="camera" label="Camera"
                loading={uploading} onPress={() => pickScan(true)}
                fullWidth={false} style={styles.pickBtn}
              />
              <Button
                variant="secondary" size="sm" icon="images" label="Gallery"
                loading={uploading} onPress={() => pickScan(false)}
                fullWidth={false} style={styles.pickBtn}
              />
            </View>
          )}
        </Card>

        <Card padding={18} elevated="sm" style={styles.card}>
          <View style={styles.stepHead}>
            <StepDot n={2} done={false} />
            <AppText variant="bodyStrong" weight="bold" style={styles.stepTitle}>
              POD details
            </AppText>
          </View>

          <TextField
            label="Received on"
            value={receivedDate}
            onChangeText={setReceivedDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={errors.receivedDate}
            style={styles.field}
          />

          <AppText variant="label" muted style={styles.fieldLabel}>COPY HANDED OVER</AppText>
          <SegmentedControl options={COPY_TYPES} value={copyType} onChange={setCopyType} />

          <TextField
            label="Remarks"
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Anything the office should know (optional)"
            multiline
            style={styles.remarks}
          />

          <View style={styles.viaNote}>
            <Ionicons name="phone-portrait-outline" size={14} color={colors.textMuted} />
            <AppText variant="caption" muted>Submitted via the driver app</AppText>
          </View>
        </Card>

        <Button
          label={saving ? 'Submitting…' : 'Submit POD'}
          loading={saving}
          disabled={!canSubmit}
          onPress={submit}
        />
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
  uploadedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    backgroundColor: colors.validBg, borderRadius: radius.md,
  },
  uploadedName: { flex: 1 },
  field: { marginBottom: 14 },
  fieldLabel: { marginBottom: 8, letterSpacing: 0.5 },
  remarks: { marginTop: 16 },
  viaNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
});
