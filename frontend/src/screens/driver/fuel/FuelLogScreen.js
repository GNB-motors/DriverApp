import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, Badge, StatusBadge, BarChart, colors, spacing, radius } from '../../../components/ui';
import * as mock from '../../../demo/mock';

/**
 * 20 · Fuel log — history and mileage trend. UI-only demo.
 */
export default function FuelLogScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { fuel, driver } = mock;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Fuel log</AppText>
          <AppText variant="caption" mono muted>{driver.plate} · August</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]} showsVerticalScrollIndicator={false}>
        {/* Trend */}
        <Card elevated="sm" padding={16}>
          <View style={styles.cardHead}>
            <View style={styles.trendVal}>
              <AppText mono weight="semibold" style={styles.bigVal}>{fuel.mileage}</AppText>
              <AppText variant="small" muted>km/L</AppText>
            </View>
            <Badge tone="valid" label="Improving" />
          </View>
          <BarChart data={fuel.trend} height={110} style={styles.chart} />
        </Card>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          {fuel.kpis.map((k) => (
            <Card key={k.label} elevated="sm" padding={14} style={styles.kpi}>
              <AppText variant="caption" muted>{k.label}</AppText>
              <AppText mono variant="h3" weight="semibold">{k.value}</AppText>
            </Card>
          ))}
        </View>

        {/* History */}
        <Card padding={0} elevated="sm" style={styles.gap}>
          {fuel.history.map((h, i) => (
            <View key={i}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.histRow}>
                <View style={styles.histIcon}><Ionicons name="water" size={18} color={colors.primary} /></View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.histTop}>
                    <AppText mono variant="bodyStrong" weight="semibold">{h.litres}</AppText>
                    <StatusBadge status={h.status} />
                  </View>
                  <AppText variant="caption" mono muted>{h.meta}</AppText>
                </View>
                <AppText mono variant="bodyStrong" weight="semibold">{h.amount}</AppText>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Button size="lg" icon="add" label="Add fuel" onPress={() => navigation.navigate('FuelCapture')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 14 },
  gap: { marginTop: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendVal: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigVal: { fontSize: 26, lineHeight: 30 },
  chart: { marginTop: 14 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpi: { flex: 1, gap: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 13 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  histIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  histTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
