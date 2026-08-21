import React, { useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, WarningBanner, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, SectionHeader, toneColor } from '../../components/ui';
import * as own from '../../demo/managerMock';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import { useSubmit } from '../../hooks/useSubmit';
import managerService from '../../services/managerService';

/** M6 · Close trip — the settlement check. */
export default function OpsCloseTripScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  // Real ERP trip by id from route params (else stay on demo mock).
  const id = route?.params?.id;
  const { token } = useAuth();
  const useReal = apiConfigured() && !!token && token !== 'demo-token' && !!id;
  const { submit, busy } = useSubmit();
  const onClose = () => {
    const go = () => navigation.navigate('OpsTrips');
    if (!useReal) return go();
    return submit(() => managerService.closeErpTrip(id), {
      onSuccess: go,
      onError: (e) => Alert.alert('Close failed', e?.message || 'Please try again.'),
    });
  };
  const { data: tripApi, loading } = useApi(
    () => managerService.getErpTrip(id),
    [id],
    { enabled: useReal, fallback: null },
  );

  // Merge the ERP trip header/totals onto the mock settlement (checklist/account stay mock).
  // mapping to confirm against live API
  const c = useMemo(() => {
    const m = own.opsClose;
    if (!useReal || !tripApi) return m;
    const d = tripApi;
    return {
      ...m,
      id: d.tripNo || d.code || d.id || d._id || m.id,
      route: d.route || [d.origin || d.from, d.destination || d.to].filter(Boolean).join(' → ') || m.route,
      km: d.km != null ? `${d.km} km` : m.km,
      margin: d.margin != null ? `₹${Number(d.margin).toLocaleString('en-IN')}` : m.margin,
    };
  }, [useReal, tripApi]);

  return (
    <View style={styles.container}>
      <BackHeader title={`Close ${c.id}`} subtitle={c.route} onBack={() => navigation.goBack()} right={<Pill tone="success" label="Ready" />} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {useReal && loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
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
