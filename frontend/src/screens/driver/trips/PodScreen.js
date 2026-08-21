import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText, Button, TextField, PhotoUploader, SegmentedControl, WarningBanner, Badge,
  KeyValueTable, KeyValueRow, colors, spacing, radius,
} from '../../../components/ui';
import * as mock from '../../../demo/mock';

/**
 * 27 · Proof of delivery — at unload. UI-only demo.
 */
export default function PodScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const p = mock.pod;
  const [photo, setPhoto] = useState({ name: 'POD_4802', quality: 'ok' });
  const [condition, setCondition] = useState('No damage');
  const [remarks, setRemarks] = useState('');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Proof of delivery</AppText>
          <AppText variant="caption" mono muted>{p.trip} · {p.route}</AppText>
        </View>
        <Badge tone="pending" label={p.late} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <KeyValueTable>
          <KeyValueRow label="Consignee" value={p.consignee} />
          <KeyValueRow label="Unloaded" value={p.unloaded} mono />
          <KeyValueRow label="Weight received" value={p.weight} mono />
        </KeyValueTable>

        <PhotoUploader
          title="Signed POD copy"
          required
          photos={photo ? [photo] : []}
          onCapture={() => setPhoto({ name: 'POD_4802', quality: 'ok' })}
          onRemove={() => setPhoto(null)}
          note="Stamp and signature visible"
          style={styles.gap}
        />

        <AppText variant="label" muted style={styles.gap}>Condition at delivery</AppText>
        <SegmentedControl options={['No damage', 'Shortage', 'Damage']} value={condition} onChange={setCondition} style={styles.gapSm} />

        <TextField label="Receiver name" value={p.receiver} editable={false} style={styles.gap} />
        <TextField label="Remarks" value={remarks} onChangeText={setRemarks} placeholder="Optional" style={styles.gapSm} />

        <WarningBanner tone="info" message="Submitting the POD closes the trip and releases your trip earning for settlement." style={styles.gap} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button size="lg" icon="checkmark-circle-outline" label="Submit POD and close trip" disabled={!photo} onPress={() => navigation.goBack()} />
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
