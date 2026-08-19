import React, { useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Chip, TextField, PhotoUploader, colors, spacing, radius } from '../components/ui';
import * as mock from '../demo/mock';

/**
 * 22 · Log a repair — parts and labour. UI-only demo.
 */
export default function LogRepairScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState('Clutch');
  const [work, setWork] = useState('Clutch plate with pressure plate');
  const [parts, setParts] = useState('6,900');
  const [labour, setLabour] = useState('1,500');
  const [photos, setPhotos] = useState([{ name: 'wrench', quality: 'ok' }, { name: 'bill', quality: 'ok' }]);

  const total = () => {
    const n = (parseInt(String(parts).replace(/[^0-9]/g, ''), 10) || 0) + (parseInt(String(labour).replace(/[^0-9]/g, ''), 10) || 0);
    return `₹${n.toLocaleString('en-IN')}`;
  };
  const addPhoto = () => setPhotos((p) => (p.length < 4 ? [...p, { name: `photo${p.length + 1}`, quality: 'ok' }] : p));
  const removePhoto = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Log a repair</AppText>
          <AppText variant="caption" mono muted>{mock.repairs.plate}</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AppText variant="label" muted>Category</AppText>
        <View style={styles.chips}>
          {mock.repairCategories.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <TextField label="Work done" value={work} onChangeText={setWork} style={styles.field} />

        <View style={styles.costCard}>
          <View style={styles.costRow}>
            <View style={styles.col}><TextField label="Parts" value={parts} onChangeText={setParts} mono keyboardType="numeric" /></View>
            <View style={styles.col}><TextField label="Labour" value={labour} onChangeText={setLabour} mono keyboardType="numeric" /></View>
          </View>
          <View style={styles.totalRow}>
            <AppText variant="small" weight="bold">Total</AppText>
            <AppText mono variant="h3" weight="semibold">{total()}</AppText>
          </View>
        </View>

        <View style={styles.threeCol}>
          <View style={styles.col}><TextField label="Date" value="04 Aug 2026" mono editable={false} /></View>
          <View style={styles.col}><TextField label="Odometer" value="482,540" mono editable={false} /></View>
        </View>
        <TextField label="Workshop" value="Sai Auto Works" style={styles.field} />

        <PhotoUploader title="Photos" max={4} photos={photos} onCapture={addPhoto} onAddPage={addPhoto} onRemove={removePhoto} style={styles.field} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button size="lg" label="Save repair log" onPress={() => navigation.goBack()} />
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
  costCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12, marginTop: 4 },
  costRow: { flexDirection: 'row', gap: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  threeCol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
