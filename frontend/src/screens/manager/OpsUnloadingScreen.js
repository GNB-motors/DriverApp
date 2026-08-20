import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, colors, spacing, radius } from '../../components/ui';
import { BackHeader, Pill, SectionHeader } from '../../components/ui';
import * as own from '../../demo/managerMock';

/** M7 · Unloading — what the depot recorded. */
export default function OpsUnloadingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const u = own.opsUnload;

  return (
    <View style={styles.container}>
      <BackHeader title="Unloading" subtitle={`${u.id} · ${u.place}`} onBack={() => navigation.goBack()} right={<Pill tone="pending" label="Shortage" />} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card elevated="sm" padding={16}>
          <SectionHeader label="Weight reconciliation" />
          <View style={styles.weights}>
            <Weight value={u.weight.loaded} label="loaded" />
            <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
            <Weight value={u.weight.received} label="received" />
            <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
            <Weight value={u.weight.short} label="short" color={colors.warning} />
          </View>
          <View style={styles.divider} />
          <View style={styles.tolRow}>
            <AppText variant="small">Within 0.5% tolerance</AppText>
            <Pill tone="pending" label={u.weight.tolerance} />
          </View>
        </Card>

        <Card elevated="sm" padding={16}>
          {u.details.map(([k, v], i) => (
            <View key={k} style={[styles.detail, i > 0 && styles.rowDivider]}>
              <AppText variant="small" muted>{k}</AppText>
              <AppText mono={k !== 'Received by'} variant="small" weight="semibold">{v}</AppText>
            </View>
          ))}
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Evidence" right={<Pill tone="neutral" label="3 files" />} />
          <View style={styles.evidence}>
            {u.evidence.map((e) => (
              <View key={e} style={styles.thumb}>
                <Ionicons name="image-outline" size={20} color={colors.textMuted} />
                <AppText variant="caption" mono muted>{e}</AppText>
              </View>
            ))}
          </View>
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Depot remark" />
          <AppText variant="small" muted style={{ marginTop: 8 }}>{u.remark}</AppText>
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button variant="secondary" size="lg" label="Raise claim" style={{ flex: 1 }} onPress={() => {}} />
        <Button size="lg" label="Accept and close" style={{ flex: 1.3 }} onPress={() => navigation.navigate('OpsCloseTrip')} />
      </View>
    </View>
  );
}

function Weight({ value, label, color }) {
  return (
    <View style={styles.weight}>
      <AppText mono weight="semibold" color={color || colors.text} style={styles.weightVal}>{value}</AppText>
      <AppText variant="caption" muted>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 12 },
  weights: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  weight: { alignItems: 'center', gap: 2 },
  weightVal: { fontSize: 20, lineHeight: 24 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  tolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  evidence: { flexDirection: 'row', gap: 10, marginTop: 12 },
  thumb: { flex: 1, height: 80, borderRadius: radius.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
