/**
 * TripCloseScreen.js — Stage 6, operational trip close.
 *
 * POST /api/erp/trips/:tripId/close
 *
 * Two backend rules drive this form, and both are enforced here first so the user
 * sees the problem before submitting rather than getting a 400 back:
 *
 *   • The trip must be DISPATCHED. Closing is gated on that exact state, not on
 *     "far enough along" — a PLACED trip with a paid advance still cannot close,
 *     because the CN is what dispatches it.
 *   • `unloadedAt` cannot precede the trip date.
 *
 * Close is operational, not commercial: it records where and when the truck was
 * emptied. It does NOT free the vehicle (the POD is still outstanding) and it does
 * not settle quantities — that is Stage 8, Unloading.
 */

import React, { useState, useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useErp } from '../../context/ErpContext';
import { closeErpTrip } from '../../services/erpApi';
import {
  AppText, Card, Button, TextField, Switch, SubHeader, Badge,
  colors, radius,
} from '../../components/ui';
import { canCloseTrip, stateLabel, tripRoute } from '../../domain/tripState';

export default function TripCloseScreen({ route, navigation }) {
  const { token } = useAuth();
  const { triggerRefresh } = useErp();
  const trip = route?.params?.trip;

  const [unloadedAt, setUnloadedAt] = useState(dayjs().format('YYYY-MM-DD'));
  const [unloadLocation, setUnloadLocation] = useState(trip?.toLocation || '');
  const [closeRemarks, setCloseRemarks] = useState('');

  const [reportEmpty, setReportEmpty] = useState(false);
  const [emptyTo, setEmptyTo] = useState('');
  const [emptyKm, setEmptyKm] = useState('');

  const [saving, setSaving] = useState(false);

  const stateAllows = canCloseTrip(trip);

  const errors = useMemo(() => {
    const e = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(unloadedAt)) {
      e.unloadedAt = 'Use YYYY-MM-DD.';
    } else if (trip?.tripDate && dayjs(unloadedAt).isBefore(dayjs(trip.tripDate), 'day')) {
      e.unloadedAt = `Cannot be before the trip date (${dayjs(trip.tripDate).format('DD MMM')}).`;
    } else if (dayjs(unloadedAt).isAfter(dayjs().add(1, 'day'), 'day')) {
      e.unloadedAt = 'Cannot be in the future.';
    }

    if (reportEmpty) {
      if (emptyTo.trim().length < 2) e.emptyTo = 'Where is it running empty to?';
      const km = Number(emptyKm);
      if (!emptyKm || Number.isNaN(km) || km <= 0) e.emptyKm = 'Enter the empty distance.';
    }
    return e;
  }, [unloadedAt, trip?.tripDate, reportEmpty, emptyTo, emptyKm]);

  const canSubmit = Object.keys(errors).length === 0 && !saving && stateAllows;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await closeErpTrip(token, trip._id, {
        unloadedAt,
        ...(unloadLocation.trim() ? { unloadLocation: unloadLocation.trim() } : {}),
        ...(closeRemarks.trim() ? { closeRemarks: closeRemarks.trim() } : {}),
        ...(reportEmpty
          ? { reportEmpty: { toLocation: emptyTo.trim(), distanceKm: Number(emptyKm) } }
          : {}),
      });
      triggerRefresh();
      Alert.alert('Trip closed', 'The POD is the next step.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      // The backend's own message is more specific than anything generic — show it.
      Alert.alert('Could not close trip', err?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (!trip) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="Close Trip" onBack={() => navigation.goBack()} />
        <View style={styles.centre}><AppText variant="body" muted>No trip selected.</AppText></View>
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
        title="Close Trip"
        subtitle={`${trip.tripNumber} · ${tripRoute(trip).text}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!stateAllows && (
          <Card variant="outline" padding={14} style={[styles.card, styles.warnCard]}>
            <View style={styles.warnHead}>
              <Ionicons name="alert-circle-outline" size={17} color={colors.warning} />
              <AppText variant="bodyStrong" weight="bold" color={colors.warning}>
                Not ready to close
              </AppText>
            </View>
            <AppText variant="small" weight="medium" style={styles.warnBody}>
              A trip can only be closed once it is in transit. This one is{' '}
              <AppText variant="small" weight="bold">{stateLabel(trip.state).toLowerCase()}</AppText>
              {trip.cnGate !== 'UPDATED'
                ? ' — the consignment note has to be filed first, which is what dispatches it.'
                : '.'}
            </AppText>
          </Card>
        )}

        <Card padding={18} elevated="sm" style={styles.card}>
          <AppText variant="label" muted style={styles.cardTitle}>UNLOADING</AppText>
          <TextField
            label="Unloaded on"
            value={unloadedAt}
            onChangeText={setUnloadedAt}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={errors.unloadedAt}
            style={styles.field}
          />
          <TextField
            label="Unload location"
            value={unloadLocation}
            onChangeText={setUnloadLocation}
            placeholder="Where the truck was emptied"
            style={styles.field}
          />
          <TextField
            label="Close remarks"
            value={closeRemarks}
            onChangeText={setCloseRemarks}
            placeholder="Optional"
            multiline
          />
        </Card>

        {/* Report-empty unlocks the REPORT_EMPTY advance leg on the backend, so it
            is a real financial decision rather than a note. */}
        <Card padding={18} elevated="sm" style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText variant="bodyStrong" weight="bold">Running empty from here</AppText>
              <AppText variant="caption" muted weight="medium">
                Records an empty leg and unlocks its advance
              </AppText>
            </View>
            <Switch value={reportEmpty} onValueChange={setReportEmpty} />
          </View>

          {reportEmpty && (
            <View style={styles.emptyFields}>
              <TextField
                label="Empty to"
                value={emptyTo}
                onChangeText={setEmptyTo}
                placeholder="Destination"
                error={emptyTo ? errors.emptyTo : undefined}
                style={styles.field}
              />
              <TextField
                label="Distance (km)"
                value={emptyKm}
                onChangeText={setEmptyKm}
                placeholder="0"
                keyboardType="decimal-pad"
                mono
                error={emptyKm ? errors.emptyKm : undefined}
              />
            </View>
          )}
        </Card>

        <Card variant="tinted" padding={14} style={styles.card}>
          <View style={styles.noteRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <AppText variant="caption" weight="medium" style={styles.noteText}>
              Closing records the unload. Quantities and shortage are settled later,
              at unloading — and the vehicle stays busy until the POD is in.
            </AppText>
          </View>
        </Card>

        <Button
          label={saving ? 'Closing…' : 'Close trip'}
          loading={saving}
          disabled={!canSubmit}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22, paddingBottom: 48 },
  card: { marginBottom: 14 },
  cardTitle: { marginBottom: 12 },
  warnCard: { borderColor: colors.warning, backgroundColor: colors.pendingBg },
  warnHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  warnBody: {},
  field: { marginBottom: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  switchText: { flex: 1 },
  emptyFields: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  noteRow: { flexDirection: 'row', gap: 9 },
  noteText: { flex: 1 },
});
