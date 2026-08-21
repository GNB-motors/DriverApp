import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, Badge, ProgressBar, colors, spacing, radius } from '../../../components/ui';
import * as mock from '../../../demo/mock';

/**
 * 15 · Vehicles — my assigned truck. UI-only demo.
 */
export default function VehiclesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const v = mock.vehicle;
  const duePapers = v.papers.filter((p) => !p.ok).length;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <AppText variant="h2" weight="extrabold">Vehicles</AppText>
        <Pressable hitSlop={8} style={styles.iconBtn}><Ionicons name="search" size={20} color={colors.text} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Vehicle hero */}
        <Card variant="outline" elevated="sm" padding={16} style={styles.hero}>
          <View style={styles.heroTop}>
            <AppText mono variant="h3" weight="semibold">{v.plate}</AppText>
            <Badge tone="valid" label="Assigned to you" />
          </View>
          <AppText variant="small" muted>{v.spec}</AppText>
          <View style={styles.statGrid}>
            <View style={styles.stat}><AppText variant="caption" muted>Odometer</AppText><AppText mono variant="bodyStrong" weight="semibold">{v.odometer}</AppText></View>
            <View style={styles.stat}><AppText variant="caption" muted>Mileage</AppText><AppText mono variant="bodyStrong" weight="semibold">{v.mileage}</AppText></View>
            <View style={styles.stat}><AppText variant="caption" muted>Fastag</AppText><AppText mono variant="bodyStrong" weight="semibold">{v.fastag}</AppText></View>
          </View>
        </Card>

        {/* Papers */}
        <Card elevated="sm" padding={16} style={styles.gap}>
          <View style={styles.cardHead}>
            <AppText variant="label" muted>Vehicle papers</AppText>
            {duePapers ? <Badge tone="pending" label={`${duePapers} due`} /> : null}
          </View>
          {v.papers.map((p, i) => (
            <View key={p.label} style={[styles.paperRow, i > 0 && styles.paperDivider]}>
              <AppText variant="body" style={{ flex: 1 }}>{p.label}</AppText>
              <AppText mono variant="small" color={p.ok ? colors.textMuted : colors.warning}>{p.date}</AppText>
              <View style={[styles.dot, { backgroundColor: p.ok ? colors.dotGreen : colors.dotAmber }]} />
            </View>
          ))}
        </Card>

        {/* Action tiles */}
        <View style={[styles.tileRow, styles.gap]}>
          <Pressable style={styles.tile} onPress={() => navigation.navigate('FuelLog')}>
            <Ionicons name="water" size={22} color={colors.primary} />
            <AppText variant="bodyStrong" weight="bold">Fuel log</AppText>
            <AppText variant="caption" mono muted>Last {mock.lastRefuel.litres} · {mock.lastRefuel.meta.split(' · ')[0]}</AppText>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => navigation.navigate('Repairs')}>
            <Ionicons name="build" size={22} color={colors.primary} />
            <AppText variant="bodyStrong" weight="bold">Repairs</AppText>
            <AppText variant="caption" mono muted>3 logs · ₹9,180</AppText>
          </Pressable>
        </View>

        {/* Next service */}
        <Card elevated="sm" padding={16} style={styles.gap}>
          <View style={styles.cardHead}>
            <AppText variant="label" muted>Next service</AppText>
            <AppText mono variant="small" weight="semibold">Due in {v.serviceDueKm}</AppText>
          </View>
          <ProgressBar label="" percent={v.servicePercent} value={`${v.servicePercent}%`} style={styles.gapSm} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingBottom: 10,
  },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 22, paddingTop: 6, gap: 14 },
  gap: { marginTop: 0 },
  gapSm: { marginTop: 10 },
  hero: { borderColor: '#C7D0F7', gap: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statGrid: { flexDirection: 'row', gap: 10, marginTop: 4 },
  stat: { flex: 1, gap: 3 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  paperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  paperDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 9, height: 9, borderRadius: 5 },
  tileRow: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 6,
    borderWidth: 1, borderColor: colors.border,
  },
});
