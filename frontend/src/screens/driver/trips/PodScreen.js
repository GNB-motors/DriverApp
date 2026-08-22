import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText, Button, TextField, PhotoUploader, SegmentedControl, WarningBanner, Badge,
  KeyValueTable, KeyValueRow, colors, spacing, radius,
} from '../../../components/ui';
import { useSubmit } from '../../../hooks/useSubmit';
import podService from '../../../services/podService';
import { pickFromCamera, pickFromGallery } from '../../../utils/pickImage';

/**
 * 27 · Proof of delivery — at unload. UI-only demo.
 */
export default function PodScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const params = route?.params ?? {};
  const tripNumber = params.tripNumber ?? params.trip ?? '';
  const tripId = params.tripId ?? params.trip ?? '';
  const routeLabel = params.route ?? '';
  const late = params.late ?? '';
  const consignee = params.consignee ?? '';
  const unloaded = params.unloaded ?? '';
  const weight = params.weight ?? '';
  const receiver = params.receiver ?? '';
  const [photo, setPhoto] = useState(null);
  const [condition, setCondition] = useState('No damage');
  const [remarks, setRemarks] = useState('');
  const { submit, busy, error } = useSubmit();

  const capture = async () => { const f = await pickFromCamera(); if (f) setPhoto({ name: f.name, quality: 'ok', file: f }); };
  const captureFromGallery = async () => { const f = await pickFromGallery(); if (f) setPhoto({ name: f.name, quality: 'ok', file: f }); };
  const onSubmit = () => {
    submit(
      () => podService.uploadPod({ tripId, condition, receiver, remarks, file: photo?.file }),
      { onSuccess: () => navigation.goBack() },
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Proof of delivery</AppText>
          <AppText variant="caption" mono muted>{tripNumber} · {routeLabel}</AppText>
        </View>
        <Badge tone="pending" label={late} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <KeyValueTable>
          <KeyValueRow label="Consignee" value={consignee} />
          <KeyValueRow label="Unloaded" value={unloaded} mono />
          <KeyValueRow label="Weight received" value={weight} mono />
        </KeyValueTable>

        <PhotoUploader
          title="Signed POD copy"
          required
          photos={photo ? [photo] : []}
          onCapture={capture}
          onPick={captureFromGallery}
          onRemove={() => setPhoto(null)}
          note="Stamp and signature visible"
          style={styles.gap}
        />

        <AppText variant="label" muted style={styles.gap}>Condition at delivery</AppText>
        <SegmentedControl options={['No damage', 'Shortage', 'Damage']} value={condition} onChange={setCondition} style={styles.gapSm} />

        <TextField label="Receiver name" value={receiver} editable={false} style={styles.gap} />
        <TextField label="Remarks" value={remarks} onChangeText={setRemarks} placeholder="Optional" style={styles.gapSm} />

        <WarningBanner tone="info" message="Submitting the POD closes the trip and releases your trip earning for settlement." style={styles.gap} />

        {error ? <WarningBanner tone="error" message={error} style={styles.gap} /> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button size="lg" icon="checkmark-circle-outline" label="Submit POD and close trip" loading={busy} disabled={!photo || busy} onPress={onSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  gap: { marginTop: 14 },
  gapSm: { marginTop: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
