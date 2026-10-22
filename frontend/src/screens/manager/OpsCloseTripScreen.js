import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, WarningBanner, Loading, EmptyState, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, SectionHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import { useSubmit } from '../../hooks/useSubmit';
import managerService from '../../services/managerService';
import { TRIP_STATE, metaFor } from '../../constants/erpStatus';

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

  // /erp/trips/:id → { tripNumber, state, fromLocation, toLocation, totalKm,
  //   material, plannedQty, loadedQty, vehicleNumber, vehicleType,
  //   advanceGate, cnGate, partyId: { name }, doId: { doNumber },
  //   consignment, pod, unloading, saleBill, purchaseBill, advances }
  const c = useMemo(() => {
    const d = tripApi;
    if (!d) return null;

    const qty = (v, unit) => (v == null ? '—' : `${v}${unit ? ` ${unit}` : ''}`);
    const stateMeta = metaFor(TRIP_STATE, d.state);

    // Each row reports its own true state — a green tick on every line
    // regardless of the gates would be a lie about what is actually done.
    const cn = d.consignment;
    const checklist = [
      {
        label: 'Advance',
        done: d.advanceGate === 'PAID' || d.advanceGate === 'NONE',
        meta: d.advanceGate === 'NONE' ? 'not required' : String(d.advanceGate || '').toLowerCase(),
      },
      {
        label: 'Consignment note',
        done: d.cnGate === 'UPDATED',
        meta: cn?.cnNumber || (d.cnGate === 'UPDATED' ? 'updated' : 'pending'),
      },
      {
        label: 'Loaded quantity',
        done: Number(d.loadedQty) > 0,
        meta: qty(d.loadedQty ?? cn?.loadedQty, cn?.loadedQtyUnit),
      },
      { label: 'Unloading', done: !!d.unloading, meta: d.unloading ? 'recorded' : 'pending' },
      { label: 'POD', done: !!d.pod, meta: d.pod ? 'received' : 'pending' },
    ];

    // The backend only accepts a close from DISPATCHED (erpTrip.service.js).
    const canClose = d.state === 'DISPATCHED';

    return {
      id: d.tripNumber || '—',
      route: [d.fromLocation, d.toLocation].filter(Boolean).join(' → ') || '—',
      km: d.totalKm != null ? `${d.totalKm} km` : '',
      stateLabel: stateMeta.label,
      stateTone: stateMeta.tone,
      canClose,
      blockedReason: canClose ? null : `Trip is ${stateMeta.label} — it can only be closed once dispatched.`,
      checklist,
      pending: checklist.filter((r) => !r.done).length,
      details: [
        ['Party', d.partyId?.name || '—'],
        ['Delivery order', d.doId?.doNumber || '—'],
        ['Material', d.material || '—'],
        ['Vehicle', d.vehicleNumber || '—'],
        ['Planned', qty(d.plannedQty, cn?.loadedQtyUnit)],
        ['Loaded', qty(d.loadedQty, cn?.loadedQtyUnit)],
      ],
    };
  }, [tripApi]);

  return (
    <View style={styles.container}>
      <BackHeader title={c ? `Close ${c.id}` : 'Close trip'} subtitle={c?.route} onBack={() => navigation.goBack()} right={c ? <Pill tone={c.stateTone} label={c.stateLabel} /> : null} />
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
          <SectionHeader label="Checklist" right={<Pill tone={c.pending ? 'pending' : 'success'} label={c.pending ? `${c.pending} pending` : 'All clear'} />} />
          {c.checklist.map((row, i) => (
            <View key={row.label} style={[styles.check, i > 0 && styles.rowDivider]}>
              <View style={[styles.checkIcon, !row.done && styles.checkIconOff]}>
                <Ionicons name={row.done ? 'checkmark' : 'ellipse-outline'} size={14} color={row.done ? colors.success : colors.textMuted} />
              </View>
              <AppText variant="body" style={{ flex: 1 }}>{row.label}</AppText>
              <AppText variant="caption" mono muted>{row.meta}</AppText>
            </View>
          ))}
        </Card>

        <Card elevated="sm" padding={16}>
          <SectionHeader label="Trip details" right={<AppText variant="caption" mono muted>{c.km}</AppText>} />
          {c.details.map(([label, value]) => (
            <View key={label} style={styles.acct}>
              <AppText variant="small" muted>{label}</AppText>
              <AppText mono variant="bodyStrong" weight="semibold">{value}</AppText>
            </View>
          ))}
        </Card>

        <WarningBanner
          tone={c.canClose ? 'info' : 'warning'}
          message={c.canClose
            ? 'Closing settles the trip and locks it from further edits.'
            : c.blockedReason}
        />
        {error ? <WarningBanner tone="error" message={error} /> : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button size="lg" label="Close and settle" loading={busy} disabled={busy || !c?.canClose} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 12 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  checkIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.validBg, alignItems: 'center', justifyContent: 'center' },
  checkIconOff: { backgroundColor: colors.background },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  acct: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  footer: { paddingHorizontal: 18, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
