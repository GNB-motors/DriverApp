import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, StatusBadge, WarningBanner, colors, spacing, radius } from '../components/ui';
import * as mock from '../demo/mock';

/**
 * 11 · My advances — payout view. UI-only demo.
 */
export default function MyAdvancesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const featured = mock.advances.find((a) => a.featured);
  const rest = mock.advances.filter((a) => !a.featured);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <AppText variant="h3" weight="extrabold">My advances</AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]} showsVerticalScrollIndicator={false}>
        {featured ? (
          <Card elevated="sm" padding={16} style={{ gap: 12 }}>
            <View style={styles.featTop}>
              <View style={{ gap: 2 }}>
                <AppText mono variant="bodyStrong" weight="semibold">{featured.id}</AppText>
                <AppText variant="caption" mono muted>{featured.meta}</AppText>
              </View>
              <StatusBadge status={featured.status} />
            </View>
            <View style={styles.divider} />
            <Row label="Requested" value={featured.requested} />
            <Row label="Deductions" value={featured.deductions} valueColor={colors.error} />
            <Row label="Net paid" value={featured.net} bold />
            <View style={styles.methodChip}>
              <Ionicons name="card-outline" size={15} color={colors.textMuted} />
              <AppText variant="caption" mono muted>{featured.method}</AppText>
            </View>
          </Card>
        ) : null}

        {rest.map((a) => (
          <Card key={a.id} elevated="sm" padding={14} style={styles.rowCard}>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.rowTop}>
                <AppText mono variant="bodyStrong" weight="semibold">{a.id}</AppText>
                <StatusBadge status={a.status} />
              </View>
              <AppText variant="caption" mono muted>{a.meta}</AppText>
            </View>
            <AppText
              mono variant="h3" weight="semibold"
              color={a.status === 'rejected' ? colors.textMuted : colors.text}
              style={a.status === 'rejected' ? styles.strike : null}
            >
              {a.amount}
            </AppText>
          </Card>
        ))}

        <WarningBanner tone="info" message="Paid advances are debited from your wallet balance." style={{ marginTop: 4 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Button variant="secondary" size="lg" icon="add" label="Request an advance" onPress={() => {}} />
      </View>
    </View>
  );
}

function Row({ label, value, valueColor, bold }) {
  return (
    <View style={styles.kvRow}>
      <AppText variant="small" muted={!bold} weight={bold ? 'bold' : 'regular'}>{label}</AppText>
      <AppText mono variant={bold ? 'h3' : 'bodyStrong'} weight="semibold" color={valueColor || colors.text}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 12 },
  featTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: colors.border },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  methodChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: 12, padding: 12, marginTop: 4 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strike: { textDecorationLine: 'line-through' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
