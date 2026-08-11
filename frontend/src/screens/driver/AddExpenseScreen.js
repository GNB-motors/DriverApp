/**
 * AddExpenseScreen.js — log a bill from the road.
 *
 * POST /api/expenses. `driverId` is deliberately NOT sent: the backend forces it
 * from the session for driver callers, so the app cannot mis-attribute an expense
 * (and cannot be made to attribute one to somebody else).
 *
 * If the driver is on an active trip the expense is tagged to it, which is what
 * makes the office-side trip ledger add up without anyone reconciling by hand.
 */

import React, { useState, useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useErp } from '../../context/ErpContext';
import { createExpense } from '../../services/erpApi';
import {
  AppText, Card, Button, TextField, SubHeader, Switch, colors, radius,
} from '../../components/ui';
import {
  DRIVER_CATEGORIES, categoryLabel, categoryIcon,
} from '../../domain/expenseCategories';
import { tripRoute } from '../../domain/tripState';

export default function AddExpenseScreen({ route, navigation }) {
  const { token } = useAuth();
  const { activeTrip } = useErp();
  const onSaved = route?.params?.onSaved;

  const [category, setCategory] = useState('FUEL');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [expenseDate, setExpenseDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [description, setDescription] = useState('');
  const [tagToTrip, setTagToTrip] = useState(!!activeTrip);
  const [saving, setSaving] = useState(false);

  const errors = useMemo(() => {
    const e = {};
    if (!title.trim()) e.title = 'Say what this was for.';
    const n = Number(amount);
    if (!amount || Number.isNaN(n) || n <= 0) e.amount = 'Enter the amount.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) e.expenseDate = 'Use YYYY-MM-DD.';
    else if (dayjs(expenseDate).isAfter(dayjs(), 'day')) e.expenseDate = 'Cannot be in the future.';
    return e;
  }, [title, amount, expenseDate]);

  const canSubmit = Object.keys(errors).length === 0 && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createExpense(token, {
        title: title.trim(),
        amount: Number(amount),
        category,
        expenseDate,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(tagToTrip && activeTrip?._id ? { tripId: activeTrip._id } : {}),
        ...(tagToTrip && activeTrip?.vehicleId ? { vehicleId: activeTrip.vehicleId } : {}),
      });
      onSaved?.();
      Alert.alert('Saved', 'Your expense has been logged.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Could not save', err?.message || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <SubHeader title="Log Expense" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AppText variant="label" muted style={styles.sectionTitle}>CATEGORY</AppText>
        <View style={styles.catGrid}>
          {DRIVER_CATEGORIES.map((key) => {
            const active = key === category;
            return (
              <Pressable
                key={key}
                onPress={() => setCategory(key)}
                style={[styles.catTile, active && styles.catTileActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={categoryIcon(key)}
                  size={19}
                  color={active ? colors.white : colors.primary}
                />
                <AppText
                  variant="caption"
                  weight="bold"
                  color={active ? colors.white : colors.textMuted}
                  numberOfLines={1}
                  style={styles.catLabel}
                >
                  {categoryLabel(key)}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <Card padding={18} elevated="sm" style={styles.card}>
          <TextField
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="decimal-pad"
            mono
            error={amount ? errors.amount : undefined}
            style={styles.field}
          />
          <TextField
            label="What was it for?"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Diesel — HP pump, Lonavala"
            error={title ? errors.title : undefined}
            style={styles.field}
          />
          <TextField
            label="Date"
            value={expenseDate}
            onChangeText={setExpenseDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={errors.expenseDate}
            style={styles.field}
          />
          <TextField
            label="Notes"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional"
            multiline
          />
        </Card>

        {activeTrip ? (
          <Card padding={16} elevated="sm" style={styles.card}>
            <View style={styles.tripRow}>
              <View style={styles.tripText}>
                <AppText variant="bodyStrong" weight="bold">Tag to current trip</AppText>
                <AppText variant="caption" muted weight="medium" numberOfLines={1}>
                  {activeTrip.tripNumber} · {tripRoute(activeTrip).text}
                </AppText>
              </View>
              <Switch value={tagToTrip} onValueChange={setTagToTrip} />
            </View>
          </Card>
        ) : null}

        <Button
          label={saving ? 'Saving…' : 'Save expense'}
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
  scroll: { padding: 22, paddingBottom: 48 },
  sectionTitle: { marginBottom: 12, letterSpacing: 0.5 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  catTile: {
    width: '23%',
    minWidth: 76,
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catTileActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catLabel: { fontSize: 10, textAlign: 'center' },
  card: { marginBottom: 14 },
  field: { marginBottom: 14 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tripText: { flex: 1 },
});
