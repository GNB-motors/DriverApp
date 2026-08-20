import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, Stepper, colors, spacing, radius } from '../../components/ui';
import { BackHeader, Pill, Monogram, SectionHeader, toneColor } from '../../components/ui';
import * as own from '../../demo/managerMock';

/** M3 · Trip detail ops — ops view with stage control. */
export default function OpsTripDetailScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const t = own.opsTripDetail;

  return (
    <View style={styles.container}>
      <BackHeader title={t.id} subtitle={t.route} onBack={() => navigation.goBack()} right={<Pill tone="in_transit" label={t.stage} />} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card elevated="sm" padding={14} style={styles.driver}>
          <Monogram initials={t.driver.initials} size={44} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong" weight="bold">{t.driver.name}</AppText>
            <AppText variant="caption" mono muted>{t.driver.phone}</AppText>
          </View>
          <View style={styles.call}><Ionicons name="call" size={18} color={colors.white} /></View>
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Stages" right={<AppText variant="small" mono weight="semibold">{t.stage}</AppText>} />
          <View style={{ marginTop: 12 }}><Stepper steps={t.stages} /></View>
          <Button variant="secondary" size="md" label="Advance stage manually" onPress={() => {}} />
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Paperwork" right={<Pill tone="pending" label="1 missing" />} />
          {t.paperwork.map((p, i) => (
            <View key={p.label} style={[styles.paperRow, i > 0 && styles.rowDivider]}>
              <AppText variant="body" style={{ flex: 1 }}>{p.label}</AppText>
              <Pill tone={p.status} label={p.badge} />
            </View>
          ))}
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Trip money" />
          {t.money.map((m) => (
            <View key={m.label} style={styles.moneyRow}>
              <AppText variant="small" muted>{m.label}</AppText>
              <AppText mono variant="bodyStrong" weight="semibold" color={m.color ? toneColor(m.color) : colors.text}>{m.value}</AppText>
            </View>
          ))}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button variant="secondary" size="lg" label="Message driver" style={{ flex: 1 }} onPress={() => {}} />
        <Button size="lg" label="Close trip" style={{ flex: 1 }} onPress={() => navigation.navigate('OpsCloseTrip')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 12 },
  driver: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  call: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  paperRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  moneyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
