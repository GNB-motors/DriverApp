import React, { useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { AppText, Button, Chip, TextField, PhotoUploader, WarningBanner, colors, spacing, radius } from '../../../components/ui';
import { useSubmit } from '../../../hooks/useSubmit';
import { pickFromCamera, pickFromGallery } from '../../../utils/pickImage';
import billService from '../../../services/billService';

// Static UI labels (mapped to expense categories on the backend).
const CATEGORIES = ['Toll', 'Food', 'Parking', 'Repair', 'Loading', 'Other'];

/**
 * 09 · Add bill — capture a real photo and submit to the backend. The owner
 * confirms it before it reaches the wallet.
 */
export default function AddBillScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState('Other');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState(null); // { uri, name, type }
  const { submit, busy, error } = useSubmit();

  const amountNum = Number(String(amount).replace(/[^0-9.]/g, ''));
  const ready = amountNum > 0 && !!photo && !busy;

  const capture = async () => { const f = await pickFromCamera(); if (f) setPhoto(f); };
  const pick = async () => { const f = await pickFromGallery(); if (f) setPhoto(f); };

  const send = () => {
    submit(
      () => billService.submitBill({
        amount: amountNum,
        category,
        description: desc,
        expenseDate: new Date().toISOString(),
        photo,
      }),
      {
        onSuccess: (bill) => navigation.navigate('BillSent', {
          amount: `₹${Number(bill?.amount ?? amountNum).toLocaleString('en-IN')}`,
          category: bill?.title || category,
          date: dayjs(bill?.expenseDate).format('DD MMM'),
        }),
      },
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">New bill</AppText>
          <AppText variant="small" muted>Anything you paid from your pocket</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AppText variant="label" muted>Category</AppText>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <TextField label="Amount" value={amount} onChangeText={setAmount} placeholder="0" mono keyboardType="numeric" icon="cash-outline" style={styles.field} />
        <TextField label="What was it for?" value={desc} onChangeText={setDesc} placeholder="Short note (optional)" style={styles.field} />

        <TextField label="Date" value={dayjs().format('DD MMM YYYY')} mono editable={false} style={styles.field} />

        <PhotoUploader
          title="Bill photo"
          required
          photos={photo ? [{ name: photo.name, quality: 'ok' }] : []}
          onCapture={capture}
          onPick={pick}
          onRemove={() => setPhoto(null)}
          note="The owner reads the amount from this photo"
          style={styles.field}
        />

        {error ? <WarningBanner tone="error" message={error} style={styles.field} /> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <AppText variant="caption" muted>The owner confirms it before it reaches your wallet</AppText>
        </View>
        <Button size="lg" label={busy ? 'Sending…' : 'Send for confirmation'} iconRight="arrow-forward" disabled={!ready} onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 4 },
  field: { marginTop: 4 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
});
