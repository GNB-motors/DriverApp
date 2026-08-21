import React, { useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Chip, TextField, PhotoUploader, colors, spacing, radius } from '../../../components/ui';
import * as mock from '../../../demo/mock';

/**
 * 09 · Add bill — attach and submit. UI-only demo (photo is simulated).
 */
export default function AddBillScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState('Other');
  const [amount, setAmount] = useState('1,250');
  const [desc, setDesc] = useState('Tyre air fill and wheel balance');
  const [photo, setPhoto] = useState({ name: 'IMG_2381', quality: 'ok' });

  const ready = !!amount && !!photo;
  const send = () => navigation.navigate('BillSent', { amount: `₹${amount}`, category, trip: 'TR-4821', date: '04 Aug' });

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
          {mock.billCategories.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <TextField label="Amount" value={amount} onChangeText={setAmount} mono keyboardType="numeric" icon="cash-outline" style={styles.field} />
        <TextField label="What was it for?" value={desc} onChangeText={setDesc} style={styles.field} />

        <View style={styles.twoCol}>
          <View style={styles.col}><TextField label="Date" value="04 Aug 2026" mono editable={false} /></View>
          <View style={styles.col}><TextField label="Trip" value="TR-4821" mono editable={false} /></View>
        </View>

        <PhotoUploader
          title="Bill photo"
          required
          photos={photo ? [photo] : []}
          onCapture={() => setPhoto({ name: 'IMG_2381', quality: 'ok' })}
          onPick={() => setPhoto({ name: 'IMG_2381', quality: 'ok' })}
          onRemove={() => setPhoto(null)}
          note="Amount read from photo"
          style={styles.field}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <AppText variant="caption" muted>The owner confirms it before it reaches your wallet</AppText>
        </View>
        <Button size="lg" label="Send for confirmation" iconRight="arrow-forward" disabled={!ready} onPress={send} />
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
  twoCol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
});
