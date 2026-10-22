import React, { useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { AppText, Button, Chip, TextField, PhotoUploader, colors, spacing, radius } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useSubmit } from '../../../hooks/useSubmit';
import { useDriverVehicle } from '../../../hooks/useDriverVehicle';
import { pickFromCamera } from '../../../utils/pickImage';
import maintenanceService from '../../../services/maintenanceService';

// Repair categories (static UI labels, mapped to `type` on the backend).
const REPAIR_CATEGORIES = ['Clutch', 'Brakes', 'Tyres', 'Engine', 'Electrical', 'Body'];

/**
 * 22 · Log a repair — parts and labour submitted to the backend.
 */
export default function LogRepairScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState('Clutch');
  const [work, setWork] = useState('');
  const [parts, setParts] = useState('');
  const [labour, setLabour] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [photos, setPhotos] = useState([]); // real captured files: { uri, name, type }
  const { submit, busy } = useSubmit();
  const { user } = useAuth();
  const { vehicleId } = useDriverVehicle();
  const totalNum = () =>
    (parseInt(String(parts).replace(/[^0-9]/g, ''), 10) || 0) + (parseInt(String(labour).replace(/[^0-9]/g, ''), 10) || 0);
  const onSave = () => {
    if (!vehicleId) {
      Alert.alert('No vehicle assigned', 'You don’t have a vehicle assigned yet. Ask your manager to assign one before logging a repair.');
      return;
    }
    if (!workshop.trim()) {
      Alert.alert('Workshop required', 'Enter the workshop / garage name.');
      return;
    }
    submit(
      () => maintenanceService.createMaintenance({
        vehicleId,
        driverId: user?._id,
        recordType: 'REPAIR',
        type: category,
        notes: work,
        amount: totalNum(),
        workshop: workshop.trim(),
        date: new Date().toISOString(),
        photos,
      }),
      { onSuccess: () => navigation.goBack(), onError: (e) => Alert.alert('Could not save', e?.message || 'Please try again.') },
    );
  };

  const total = () => {
    const n = (parseInt(String(parts).replace(/[^0-9]/g, ''), 10) || 0) + (parseInt(String(labour).replace(/[^0-9]/g, ''), 10) || 0);
    return `₹${n.toLocaleString('en-IN')}`;
  };
  const capture = async () => { const f = await pickFromCamera(); if (f) setPhotos((p) => (p.length < 4 ? [...p, f] : p)); };
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
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AppText variant="label" muted>Category</AppText>
        <View style={styles.chips}>
          {REPAIR_CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <TextField label="Work done" value={work} onChangeText={setWork} placeholder="What was repaired?" style={styles.field} />

        <View style={styles.costCard}>
          <View style={styles.costRow}>
            <View style={styles.col}><TextField label="Parts" value={parts} onChangeText={setParts} placeholder="0" mono keyboardType="numeric" /></View>
            <View style={styles.col}><TextField label="Labour" value={labour} onChangeText={setLabour} placeholder="0" mono keyboardType="numeric" /></View>
          </View>
          <View style={styles.totalRow}>
            <AppText variant="small" weight="bold">Total</AppText>
            <AppText mono variant="h3" weight="semibold">{total()}</AppText>
          </View>
        </View>

        <View style={styles.threeCol}>
          <View style={styles.col}><TextField label="Date" value={dayjs().format('DD MMM YYYY')} mono editable={false} /></View>
          <View style={styles.col}><TextField label="Odometer" value="—" mono editable={false} /></View>
        </View>
        <TextField label="Workshop" value={workshop} onChangeText={setWorkshop} placeholder="Garage / workshop name" style={styles.field} />

        <PhotoUploader title="Photos" max={4} photos={photos.map((f) => ({ uri: f.uri, name: f.name, quality: 'ok' }))} onCapture={capture} onAddPage={capture} onRemove={removePhoto} style={styles.field} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button size="lg" label="Save repair log" loading={busy} onPress={onSave} />
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
