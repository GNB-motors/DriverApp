import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, Stepper, Loading, EmptyState, colors, spacing, radius } from '../../components/ui';
import { BackHeader, Pill, Monogram, SectionHeader, toneColor } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import managerService from '../../services/managerService';

/** M3 · Trip detail ops — ops view with stage control. */
export default function OpsTripDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  // Real ERP trip by id from route params — no data until configured, signed in, and given an id.
  const id = route?.params?.id;
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token && !!id;
  const { data: tripApi, loading, error, refetch } = useApi(
    () => managerService.getErpTrip(id),
    [id],
    { enabled, fallback: null },
  );

  // Normalize the ERP trip → the detail shape (optional chaining + safe defaults).
  const t = useMemo(() => {
    const d = tripApi;
    if (!d) return null;
    const initials = (name) => String(name || '').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    const drv = d.driver || {};
    return {
      id: d.tripNo || d.code || d.id || d._id || '—',
      route: d.route || [d.origin || d.from, d.destination || d.to].filter(Boolean).join(' → ') || '—',
      stage: d.stage || (d.currentStage != null && d.totalStages != null ? `${d.currentStage}/${d.totalStages}` : '—'),
      driver: {
        initials: drv.initials || initials(drv.name || d.driverName),
        name: drv.name || d.driverName || '—',
        phone: drv.phone || d.driverPhone || '',
      },
      stages: Array.isArray(d.stages)
        ? d.stages.map((s) => ({ title: s?.title || s?.name || 'Stage', meta: s?.meta || s?.at || '', status: s?.status || 'todo' }))
        : [],
      paperwork: Array.isArray(d.paperwork)
        ? d.paperwork.map((p) => ({ label: p?.label || p?.name || 'Document', status: p?.status || 'neutral', badge: p?.badge || p?.statusLabel || '' }))
        : [],
      money: Array.isArray(d.money)
        ? d.money.map((mo) => ({ label: mo?.label || '', value: mo?.value || '', color: mo?.color }))
        : [],
    };
  }, [tripApi]);

  return (
    <View style={styles.container}>
      <BackHeader title={t?.id || 'Trip'} subtitle={t?.route} onBack={() => navigation.goBack()} right={t ? <Pill tone="in_transit" label={t.stage} /> : null} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : !t ? (
          <EmptyState title="Trip not found" message="This trip may have been closed or removed." />
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
        <Button size="lg" label="Close trip" style={{ flex: 1 }} onPress={() => navigation.navigate('OpsCloseTrip', { id })} />
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
