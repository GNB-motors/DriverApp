import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText, Button, TextField, PhotoUploader, WarningBanner, KeyValueTable, KeyValueRow,
  colors, spacing, radius,
} from '../../../components/ui';
import * as mock from '../../../demo/mock';

/**
 * 26 · Consignment note — upload before gate out. UI-only demo.
 */
export default function ConsignmentNoteScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const cn = mock.consignment;
  const [pages, setPages] = useState(cn.pages);
  const [confirmed, setConfirmed] = useState(true);

  const addPage = () => setPages((p) => (p.length < 3 ? [...p, { name: `Page ${p.length + 1}`, quality: 'ok' }] : p));
  const removePage = (i) => setPages((p) => p.filter((_, idx) => idx !== i));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Consignment note</AppText>
          <AppText variant="caption" mono muted>{cn.trip} · {cn.stage}</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <WarningBanner tone="warning" message="Gate out stays locked until the note is uploaded." />

        <KeyValueTable style={styles.gap}>
          <KeyValueRow label="Consignor" value={cn.consignor} />
          <KeyValueRow label="Material" value={cn.material} />
          <KeyValueRow label="Loaded weight" value={cn.weight} mono />
        </KeyValueTable>

        <TextField label="Note number" value={cn.noteNumber} mono editable={false} style={styles.gap} />

        <PhotoUploader
          title="Note pages"
          max={3}
          photos={pages}
          onCapture={addPage}
          onAddPage={addPage}
          onRemove={removePage}
          style={styles.gap}
        />

        <Pressable style={[styles.confirm, styles.gap]} onPress={() => setConfirmed((c) => !c)}>
          <View style={[styles.checkbox, confirmed && styles.checkboxOn]}>
            {confirmed ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
          </View>
          <AppText variant="small" style={{ flex: 1 }}>Weight and material match what is written on the note.</AppText>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button size="lg" icon="lock-open-outline" label="Upload and unlock gate out" disabled={pages.length === 0 || !confirmed} onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 4 },
  gap: { marginTop: 10 },
  confirm: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkbox: { width: 20, height: 20, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
