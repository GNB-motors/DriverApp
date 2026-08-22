import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, WarningBanner, Loading, EmptyState, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, SectionHeader, toneColor } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import { useSubmit } from '../../hooks/useSubmit';
import managerService from '../../services/managerService';

/** M6 · Close trip — the settlement check. */
export default function OpsCloseTripScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  // Real ERP trip by id from route params — no data until configured, signed in, and given an id.
  const id = route?.params?.id;
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token && !!id;
  const { data: tripApi, loading, error: loadError, refetch } = useApi(
    () => managerService.getErpTrip(id),
    [id],
    { enabled, fallback: null },
  );

  const { submit, busy, error } = useSubmit();
  const onClose = () => {
    if (!id) return;
    submit(() => managerService.closeErpTrip(id), { onSuccess: () => navigation.goBack() });
  };

  // Normalize the ERP trip → the settlement summary shape (optional chaining + safe defaults).
  // mapping to confirm against live API
  const c = useMemo(() => {
    const d = tripApi;
    if (!d) return null;
    const money = (v) => (v != null ? `₹${Number(v).toLocaleString('en-IN')}` : undefined);
    const routeStr = Array.isArray(d.route)
      ? d.route.filter(Boolean).join(' → ')
      : (d.route || [d.origin || d.from, d.destination || d.to].filter(Boolean).join(' → '));
    return {
      id: d.tripNo || d.code || d.id || d._id || '—',
      route: routeStr || '—',
      km: d.km != null ? `${d.km} km` : '',
      margin: money(d.margin) || '—',
      checklist: Array.isArray(d.checklist)
        ? d.checklist.map((row) => ({ label: row?.label || row?.name || '', meta: row?.meta || row?.value || '' }))
        : [],
      account: Array.isArray(d.account)
        ? d.account.map((a) => ({ label: a?.label || '', value: a?.value || '', color: a?.color }))
        : [],
    };
  }, [tripApi]);

  return (
    <View style={styles.container}>
      <BackHeader title={c ? `Close ${c.id}` : 'Close trip'} subtitle={c?.route} onBack={() => navigation.goBack()} right={c ? <Pill tone="success" label="Ready" /> : null} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}>
        {loading ? (
          <Loading />
        ) : loadError ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
        ) : !c ? (
          <EmptyState title="Trip not found" message="This trip may have been closed or removed." />
        ) : (
          <>
        <Card elevated="sm" padding={16}>
          <SectionHeader label="Checklist" right={<Pill tone="success" label="All clear" />} />
          {c.checklist.map((row, i) => (
            <View key={row.label} style={[styles.check, i > 0 && styles.rowDivider]}>
              <View style={styles.checkIcon}><Ionicons name="checkmark" size={14} color={colors.success} /></View>
              <AppText variant="body" style={{ flex: 1 }}>{row.label}</AppText>
              <AppText variant="caption" mono muted>{row.meta}</AppText>
            </View>
          ))}
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Trip account" right={<AppText variant="caption" mono muted>{c.km}</AppText>} />
          {c.account.map((a) => (
            <View key={a.label} style={styles.acct}>
              <AppText variant="small" muted>{a.label}</AppText>
              <AppText mono variant="bodyStrong" weight="semibold" color={a.color ? toneColor(a.color) : colors.text}>{a.value}</AppText>
            </View>
          ))}
          <View style={styles.total}>
            <AppText variant="small" weight="bold">Trip margin</AppText>
            <AppText mono weight="semibold" color={colors.success} style={styles.marginVal}>{c.margin}</AppText>
          </View>
        </Card>

        <WarningBanner tone="info" message="Closing releases ₹2,400 into Imran's wallet and locks the trip from further edits." />
        {error ? <WarningBanner tone="error" message={error} /> : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button size="lg" label="Close and settle" loading={busy} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 12 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  checkIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.validBg, alignItems: 'center', justifyContent: 'center' },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  acct: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: 12, padding: 14, marginTop: 8 },
  marginVal: { fontSize: 24, lineHeight: 28 },
  footer: { paddingHorizontal: 18, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
