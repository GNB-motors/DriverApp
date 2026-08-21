import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, Stepper, colors, spacing, radius } from '../../components/ui';
import { BackHeader, Pill, Monogram, SectionHeader, toneColor } from '../../components/ui';
import * as own from '../../demo/managerMock';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import managerService from '../../services/managerService';

/** M3 · Trip detail ops — ops view with stage control. */
export default function OpsTripDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  // Real ERP trip by id from route params (else stay on demo mock).
  const id = route?.params?.id;
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token && token !== 'demo-token' && !!id;
  const { data: tripApi, loading } = useApi(
    () => managerService.getErpTrip(id),
    [id],
    { enabled: useReal, fallback: null },
  );

  // Normalize the ERP trip → the detail shape (per-field mock fallback).
  // mapping to confirm against live API
  const t = useMemo(() => {
    const m = own.opsTripDetail;
    if (!useReal || !tripApi) return m;
    const d = tripApi;
    const initials = (name) => String(name || '').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    const drv = d.driver || {};
    return {
      ...m,
      id: d.tripNo || d.code || d.id || d._id || m.id,
      route: d.route || [d.origin || d.from, d.destination || d.to].filter(Boolean).join(' → ') || m.route,
      stage: d.stage || (d.currentStage != null && d.totalStages != null ? `${d.currentStage}/${d.totalStages}` : m.stage),
      driver: {
        initials: drv.initials || initials(drv.name || d.driverName) || m.driver.initials,
        name: drv.name || d.driverName || m.driver.name,
        phone: drv.phone || d.driverPhone || m.driver.phone,
      },
      stages: Array.isArray(d.stages) && d.stages.length
        ? d.stages.map((s, i) => ({ title: s.title || s.name || m.stages[i]?.title || 'Stage', meta: s.meta || s.at || m.stages[i]?.meta, status: s.status || m.stages[i]?.status || 'todo' }))
        : m.stages,
      paperwork: Array.isArray(d.paperwork) && d.paperwork.length
        ? d.paperwork.map((p, i) => ({ label: p.label || p.name || m.paperwork[i]?.label || 'Document', status: p.status || m.paperwork[i]?.status || 'neutral', badge: p.badge || p.statusLabel || m.paperwork[i]?.badge || '' }))
        : m.paperwork,
      money: Array.isArray(d.money) && d.money.length
        ? d.money.map((mo, i) => ({ label: mo.label || m.money[i]?.label || '', value: mo.value || m.money[i]?.value || '', color: mo.color || m.money[i]?.color }))
        : m.money,
    };
  }, [useReal, tripApi]);

  return (
    <View style={styles.container}>
      <BackHeader title={t.id} subtitle={t.route} onBack={() => navigation.goBack()} right={<Pill tone="in_transit" label={t.stage} />} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {useReal && loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <>
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
          </>
        )}
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
