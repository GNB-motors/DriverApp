/**
 * UnloadingFormScreen.js — Stage 8, commercial settlement.
 *
 * POST /api/erp/unloading/calculate  → live preview
 * POST /api/erp/unloading            → save
 *
 * The app does not do the arithmetic. Shortage allowance, chargeable shortage,
 * free detention days, rates and net receivable all come from `/calculate`, which
 * reads the org's ErpSettings thresholds. Recomputing any of that here would put
 * money logic in two places and let the two drift — so the preview is fetched,
 * debounced, on every input change.
 *
 * The previous version of this screen had every field but no submit call at all,
 * so anything typed into it was discarded.
 *
 * Overrides (shortage amount, SB rate) are Owner/Manager only — Ops Executive can
 * save a settlement but not override the computed figures.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, Alert, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { useErp } from '../../context/ErpContext';
import { calculateUnloading, saveUnloading } from '../../services/erpApi';
import {
  AppText, Card, Button, TextField, Badge, SubHeader, Switch, MoneyText,
  colors, radius,
} from '../../components/ui';
import { canEnterUnloading, tripRoute } from '../../domain/tripState';
import logger from '../../utils/logger';

const DEBOUNCE_MS = 500;

export default function UnloadingFormScreen({ route, navigation }) {
  const { token } = useAuth();
  const { can } = useAccess();
  const { triggerRefresh } = useErp();
  const trip = route?.params?.trip;

  const canOverride = can('unloading.save') && can('trips.close');

  const [unloadedQty, setUnloadedQty] = useState(
    trip?.loadedQty != null ? String(trip.loadedQty) : '',
  );
  const [detentionDays, setDetentionDays] = useState('0');
  const [unloadedAt, setUnloadedAt] = useState(
    trip?.unloadedAt ? dayjs(trip.unloadedAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
  );

  const [overrideShortage, setOverrideShortage] = useState(false);
  const [shortageAmount, setShortageAmount] = useState('');
  const [shortageRemark, setShortageRemark] = useState('');

  const [overrideRate, setOverrideRate] = useState(false);
  const [sbRate, setSbRate] = useState('');
  const [sbRateRemark, setSbRateRemark] = useState('');

  const [charges, setCharges] = useState([]);
  const [chargeLabel, setChargeLabel] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [saving, setSaving] = useState(false);

  const stateAllows = canEnterUnloading(trip);

  const errors = useMemo(() => {
    const e = {};
    const q = Number(unloadedQty);
    if (unloadedQty === '' || Number.isNaN(q) || q < 0) e.unloadedQty = 'Enter the unloaded quantity.';
    const d = Number(detentionDays);
    if (detentionDays === '' || Number.isNaN(d) || d < 0) e.detentionDays = 'Enter 0 if none.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(unloadedAt)) e.unloadedAt = 'Use YYYY-MM-DD.';
    if (overrideShortage && shortageRemark.trim().length < 3) {
      e.shortageRemark = 'Say why the shortage figure is being overridden.';
    }
    if (overrideRate && sbRateRemark.trim().length < 3) {
      e.sbRateRemark = 'Say why the rate is being overridden.';
    }
    return e;
  }, [unloadedQty, detentionDays, unloadedAt, overrideShortage, shortageRemark, overrideRate, sbRateRemark]);

  /** The shape both /calculate and /unloading take. */
  const payload = useMemo(() => ({
    tripId: trip?._id,
    unloadedQty: Number(unloadedQty),
    detentionDays: Number(detentionDays) || 0,
    ...(charges.length ? { otherCharges: charges } : {}),
    ...(overrideShortage && shortageAmount !== ''
      ? { shortageAmountOverride: Number(shortageAmount) } : {}),
    ...(overrideRate && sbRate !== ''
      ? { sbRateOverride: Number(sbRate) } : {}),
  }), [trip?._id, unloadedQty, detentionDays, charges, overrideShortage, shortageAmount, overrideRate, sbRate]);

  // Debounced preview. A stale in-flight response must not overwrite a newer one,
  // hence the request counter.
  const reqId = useRef(0);
  useEffect(() => {
    if (!trip?._id || errors.unloadedQty || errors.detentionDays) {
      setPreview(null);
      return undefined;
    }
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const result = await calculateUnloading(token, payload);
        if (id === reqId.current) { setPreview(result); setPreviewError(null); }
      } catch (err) {
        if (id === reqId.current) {
          logger.warn('Unloading', `Preview failed: ${err?.message}`);
          setPreviewError(err?.message || 'Could not calculate the settlement.');
          setPreview(null);
        }
      } finally {
        if (id === reqId.current) setPreviewing(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [token, trip?._id, payload, errors.unloadedQty, errors.detentionDays]);

  const addCharge = () => {
    const label = chargeLabel.trim();
    const amount = Number(chargeAmount);
    if (!label || Number.isNaN(amount) || amount === 0) return;
    setCharges((prev) => [...prev, { label, amount }]);
    setChargeLabel('');
    setChargeAmount('');
  };

  const canSubmit =
    Object.keys(errors).length === 0 && !saving && stateAllows && !!preview;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await saveUnloading(token, {
        ...payload,
        unloadedAt,
        ...(overrideShortage && shortageRemark.trim() ? { shortageRemark: shortageRemark.trim() } : {}),
        ...(overrideRate && sbRateRemark.trim() ? { sbRateRemark: sbRateRemark.trim() } : {}),
      });
      triggerRefresh();
      const overThreshold = preview?.warnings?.length > 0;
      Alert.alert(
        'Settlement saved',
        overThreshold
          ? 'Saved. Because it breaches an org threshold, it has gone for approval.'
          : 'The trip can now be billed.',
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert('Could not save', err?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (!trip) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="Unloading" onBack={() => navigation.goBack()} />
        <View style={styles.centre}><AppText variant="body" muted>No trip selected.</AppText></View>
      </View>
    );
  }

  const unit = preview?.qtyUnit || 'KL';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <SubHeader
        title="Unloading"
        subtitle={`${trip.tripNumber} · ${tripRoute(trip).text}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!stateAllows && (
          <Card variant="outline" padding={14} style={[styles.card, styles.warnCard]}>
            <AppText variant="small" weight="semibold" color={colors.warning}>
              Unloading can only be settled once the POD is in. This trip has not
              reached that stage yet.
            </AppText>
          </Card>
        )}

        <Card padding={18} elevated="sm" style={styles.card}>
          <AppText variant="label" muted style={styles.cardTitle}>QUANTITIES</AppText>

          <View style={styles.loadedRow}>
            <AppText variant="small" muted weight="medium">Loaded (from CN)</AppText>
            <AppText variant="bodyStrong" weight="extrabold">
              {preview?.loadedQty ?? trip.loadedQty ?? '—'} {unit}
            </AppText>
          </View>

          <TextField
            label={`Unloaded quantity (${unit})`}
            value={unloadedQty}
            onChangeText={setUnloadedQty}
            placeholder="0"
            keyboardType="decimal-pad"
            mono
            error={unloadedQty !== '' ? errors.unloadedQty : undefined}
            style={styles.field}
          />
          <TextField
            label="Detention days"
            value={detentionDays}
            onChangeText={setDetentionDays}
            placeholder="0"
            keyboardType="number-pad"
            mono
            error={errors.detentionDays}
            style={styles.field}
          />
          <TextField
            label="Unloaded on"
            value={unloadedAt}
            onChangeText={setUnloadedAt}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={errors.unloadedAt}
          />
        </Card>

        {/* ── Live settlement, computed server-side ── */}
        <Card padding={18} elevated="sm" style={styles.card}>
          <View style={styles.previewHead}>
            <AppText variant="label" muted>SETTLEMENT</AppText>
            {previewing ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>

          {previewError ? (
            <AppText variant="small" weight="semibold" color={colors.error}>{previewError}</AppText>
          ) : !preview ? (
            <AppText variant="small" muted>
              Enter the unloaded quantity to see the settlement.
            </AppText>
          ) : (
            <>
              <SumRow
                label="Shortage"
                detail={`${preview.shortage.shortageQty} ${unit} · ${preview.shortage.allowedQty} ${unit} allowed`}
                amount={preview.shortage.amount}
                tone={preview.shortage.amount > 0 ? colors.warning : undefined}
              />
              <SumRow
                label="Detention"
                detail={`${preview.detention.chargeableDays} chargeable of ${preview.detention.days} · ${preview.detention.freeDays} free`}
                amount={preview.detention.amount}
                tone={preview.detention.amount > 0 ? colors.warning : undefined}
              />
              <SumRow
                label="Freight"
                detail={`at ₹${preview.sbRate}/${unit}${preview.sbRateOverridden ? ' (overridden)' : ''}`}
                amount={preview.freightAmount}
              />
              {Number(preview.otherChargesTotal) !== 0 ? (
                <SumRow label="Other charges" amount={preview.otherChargesTotal} />
              ) : null}

              <View style={styles.netRow}>
                <AppText variant="bodyStrong" weight="extrabold">Net receivable</AppText>
                <MoneyText
                  amount={preview.netReceivable}
                  variant="h2"
                  weight="extrabold"
                  color={colors.primaryDeep}
                />
              </View>

              {preview.warnings?.length ? (
                <View style={styles.warnList}>
                  {preview.warnings.map((w, i) => (
                    <View key={i} style={styles.warnItem}>
                      <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
                      <AppText variant="caption" weight="medium" style={styles.warnItemText}>
                        {typeof w === 'string' ? w : w?.message || JSON.stringify(w)}
                      </AppText>
                    </View>
                  ))}
                  <AppText variant="caption" muted style={styles.warnNote}>
                    Saving this will raise an approval request.
                  </AppText>
                </View>
              ) : null}
            </>
          )}
        </Card>

        {/* ── Other charges ── */}
        <Card padding={18} elevated="sm" style={styles.card}>
          <AppText variant="label" muted style={styles.cardTitle}>OTHER CHARGES</AppText>
          {charges.map((c, i) => (
            <View key={`${c.label}-${i}`} style={styles.chargeRow}>
              <AppText variant="small" weight="semibold" style={styles.chargeLabel}>{c.label}</AppText>
              <MoneyText amount={c.amount} variant="small" weight="bold" signed />
              <Pressable
                onPress={() => setCharges((p) => p.filter((_, idx) => idx !== i))}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          <View style={styles.chargeInputs}>
            <View style={styles.chargeLabelInput}>
              <TextField value={chargeLabel} onChangeText={setChargeLabel} placeholder="Label" />
            </View>
            <View style={styles.chargeAmountInput}>
              <TextField
                value={chargeAmount}
                onChangeText={setChargeAmount}
                placeholder="₹"
                keyboardType="numbers-and-punctuation"
                mono
              />
            </View>
            <Button
              variant="secondary" size="sm" icon="add" label="Add"
              onPress={addCharge} fullWidth={false} style={styles.chargeAdd}
            />
          </View>
        </Card>

        {/* ── Overrides: Owner/Manager only ── */}
        {canOverride && (
          <Card padding={18} elevated="sm" style={styles.card}>
            <AppText variant="label" muted style={styles.cardTitle}>OVERRIDES</AppText>

            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <AppText variant="bodyStrong" weight="bold">Override shortage amount</AppText>
                <AppText variant="caption" muted weight="medium">
                  Replaces the computed shortage charge
                </AppText>
              </View>
              <Switch value={overrideShortage} onValueChange={setOverrideShortage} />
            </View>
            {overrideShortage && (
              <View style={styles.overrideFields}>
                <TextField
                  label="Shortage amount (₹)"
                  value={shortageAmount}
                  onChangeText={setShortageAmount}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  mono
                  style={styles.field}
                />
                <TextField
                  label="Reason"
                  value={shortageRemark}
                  onChangeText={setShortageRemark}
                  placeholder="Required"
                  error={shortageRemark ? errors.shortageRemark : undefined}
                />
              </View>
            )}

            <View style={[styles.switchRow, styles.switchRowSpaced]}>
              <View style={styles.switchText}>
                <AppText variant="bodyStrong" weight="bold">Override SB rate</AppText>
                <AppText variant="caption" muted weight="medium">
                  Default comes from the delivery order
                </AppText>
              </View>
              <Switch value={overrideRate} onValueChange={setOverrideRate} />
            </View>
            {overrideRate && (
              <View style={styles.overrideFields}>
                <TextField
                  label={`Rate (₹ per ${unit})`}
                  value={sbRate}
                  onChangeText={setSbRate}
                  placeholder={String(preview?.doSbRate ?? '0')}
                  keyboardType="decimal-pad"
                  mono
                  style={styles.field}
                />
                <TextField
                  label="Reason"
                  value={sbRateRemark}
                  onChangeText={setSbRateRemark}
                  placeholder="Required"
                  error={sbRateRemark ? errors.sbRateRemark : undefined}
                />
              </View>
            )}
          </Card>
        )}

        <Button
          label={saving ? 'Saving…' : 'Save settlement'}
          loading={saving}
          disabled={!canSubmit}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SumRow({ label, detail, amount, tone }) {
  return (
    <View style={styles.sumRow}>
      <View style={styles.sumText}>
        <AppText variant="small" weight="semibold">{label}</AppText>
        {detail ? (
          <AppText variant="caption" muted weight="medium" numberOfLines={1}>{detail}</AppText>
        ) : null}
      </View>
      <MoneyText amount={amount} variant="bodyStrong" weight="bold" color={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22, paddingBottom: 48 },
  card: { marginBottom: 14 },
  cardTitle: { marginBottom: 12 },
  warnCard: { borderColor: colors.warning, backgroundColor: colors.pendingBg },
  field: { marginBottom: 14 },
  loadedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },

  previewHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  sumRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 14, paddingVertical: 9,
  },
  sumText: { flex: 1 },
  netRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border,
  },
  warnList: {
    marginTop: 14, padding: 12, backgroundColor: colors.pendingBg,
    borderRadius: radius.md, gap: 7,
  },
  warnItem: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
  warnItemText: { flex: 1 },
  warnNote: { marginTop: 2 },

  chargeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  chargeLabel: { flex: 1 },
  chargeInputs: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 14 },
  chargeLabelInput: { flex: 2 },
  chargeAmountInput: { flex: 1 },
  chargeAdd: { marginTop: 2 },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  switchRowSpaced: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  switchText: { flex: 1 },
  overrideFields: { marginTop: 16 },
});
