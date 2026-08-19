import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, StatusBadge, WarningBanner, colors, spacing, radius } from '../components/ui';
import * as mock from '../demo/mock';

/**
 * 23 · Documents — validity at a glance. UI-only demo.
 */
export default function MyDocumentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const docs = mock.documents;
  const expiring = docs.filter((d) => !d.ok).length;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">My documents</AppText>
          <AppText variant="caption" muted>{docs.length} on file · {expiring} expiring</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <WarningBanner
          tone="warning"
          message="Driving licence expires in 24 days. Upload the renewed copy to keep taking trips."
          actionLabel="Upload renewal"
          onAction={() => {}}
        />

        {docs.map((d) => (
          <Card key={d.id} elevated="sm" padding={12} onPress={() => {}} style={[styles.docCard, !d.ok && styles.docExpiring]}>
            <View style={styles.thumb}>
              <Ionicons name="document-text-outline" size={20} color={d.ok ? colors.textMuted : colors.warning} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.docTop}>
                <AppText variant="bodyStrong" weight="bold">{d.title}</AppText>
                <StatusBadge status={d.status} label={d.badge} />
              </View>
              <AppText variant="caption" mono muted numberOfLines={1}>{d.meta}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#B4B4BC" />
          </Card>
        ))}

        <Pressable style={styles.addTile}>
          <Ionicons name="add" size={22} color={colors.primary} />
          <View>
            <AppText variant="bodyStrong" weight="bold">Add a document</AppText>
            <AppText variant="caption" muted>Photo or PDF, up to 5 MB</AppText>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 12 },
  docCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docExpiring: { borderWidth: 1, borderColor: '#F3D9AE' },
  thumb: { width: 46, height: 56, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  docTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  addTile: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.surface,
  },
});
