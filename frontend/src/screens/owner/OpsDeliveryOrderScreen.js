import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, Stepper, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, SectionHeader } from './OwnerBits';
import * as own from '../../demo/ownerMock';

/** M8 · Delivery order — the brief behind a trip. */
export default function OpsDeliveryOrderScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const o = own.opsDo;
  const timeline = o.stops.map((s) => ({ title: s.place, meta: s.meta, status: s.status }));

  return (
    <View style={styles.container}>
      <BackHeader title={o.id} subtitle={o.route} onBack={() => navigation.goBack()} right={<Pill tone="success" label="Placed" />} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card elevated="sm" padding={16}>
          <SectionHeader label="Route" />
          <View style={{ marginTop: 12 }}><Stepper steps={timeline} /></View>
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Load" right={<AppText variant="caption" mono muted>{o.km}</AppText>} />
          <View style={styles.grid}>
            {o.load.map(([v, k]) => (
              <View key={k} style={styles.cell}>
                <AppText mono={k !== 'material'} variant="bodyStrong" weight="semibold">{v}</AppText>
                <AppText variant="caption" muted>{k}</AppText>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button variant="secondary" size="lg" label="Reassign" style={{ flex: 1 }} onPress={() => navigation.navigate('OpsLoads')} />
        <Button size="lg" label="Start trip" style={{ flex: 1.3 }} onPress={() => navigation.navigate('OpsTrips')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  cell: { width: '50%', paddingVertical: 10, gap: 3 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
