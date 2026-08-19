import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, Stepper, StatusBadge, KeyValueTable, KeyValueRow, colors, spacing, radius } from '../components/ui';
import * as mock from '../demo/mock';

/**
 * 05 · Trip detail — closed & settled. UI-only demo.
 */
export default function TripDetailScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const t = mock.tripDetail;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText mono variant="h3" weight="semibold">{t.id}</AppText>
          <AppText variant="caption" muted>{t.route}</AppText>
        </View>
        <StatusBadge status={t.status} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Card elevated="sm" padding={16}>
          <AppText variant="label" muted style={{ marginBottom: 12 }}>Route</AppText>
          <Stepper steps={t.timeline} />
        </Card>

        <KeyValueTable style={styles.gap}>
          {t.summary.map((s) => (
            <KeyValueRow key={s.label} label={s.label} value={s.value} mono valueColor={s.color === 'success' ? colors.success : undefined} />
          ))}
          <KeyValueRow label="Trip earning" value={t.earning} mono highlight valueColor={colors.success} />
        </KeyValueTable>

        <Card elevated="sm" padding={16} style={styles.gap}>
          <AppText variant="label" muted style={{ marginBottom: 12 }}>Documents</AppText>
          <View style={styles.docRow}>
            {t.docs.map((d) => (
              <View key={d.label} style={styles.docTile}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                <AppText variant="small" weight="bold">{d.label}</AppText>
                <AppText variant="caption" mono muted>{d.sub}</AppText>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 14 },
  gap: { marginTop: 0 },
  docRow: { flexDirection: 'row', gap: 10 },
  docTile: {
    flex: 1, backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: 16, gap: 6,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
});
