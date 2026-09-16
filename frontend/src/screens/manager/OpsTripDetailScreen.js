import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { AppText, Button, Card, Loading, EmptyState, colors, spacing } from '../../components/ui';
import { BackHeader, Pill, SectionHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';
import { useApi } from '../../hooks/useApi';
import managerService from '../../services/managerService';
import { TRIP_STATE, metaFor } from '../../constants/erpStatus';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

/**
 * M3 · Trip detail (ops).
 *
 * /erp/trips/:id populates partyId, doId and tripClosedBy only — driverId stays
 * a raw id, so there is no driver name or phone to show here. The screen leads
 * with the vehicle and the gate/paperwork state instead.
 */
export default function OpsTripDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const id = route?.params?.id;
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token && !!id;
  const { data: tripApi, loading, error, refetch } = useApi(
    () => managerService.getErpTrip(id),
    [id],
    { enabled, fallback: null },
  );

  const t = useMemo(() => {
    const d = tripApi;
    if (!d) return null;
    const stateMeta = metaFor(TRIP_STATE, d.state);
    const cn = d.consignment;
    const un = d.unloading;
    const qtyUnit = cn?.loadedQtyUnit || '';

    // Each row reports the true state of that gate / document.
    const paperwork = [
      {
        label: 'Advance',
        ok: d.advanceGate === 'PAID' || d.advanceGate === 'NONE',
        badge: d.advanceGate === 'NONE' ? 'Not required' : String(d.advanceGate || '—').toLowerCase(),
      },
      { label: 'Consignment note', ok: d.cnGate === 'UPDATED', badge: cn?.cnNumber || (d.cnGate === 'UPDATED' ? 'Updated' : 'Pending') },
      { label: 'Unloading', ok: !!un, badge: un ? 'Recorded' : 'Pending' },
      { label: 'POD', ok: !!d.pod, badge: d.pod ? 'Received' : 'Pending' },
      { label: 'Sale bill', ok: !!d.saleBill, badge: d.saleBill ? 'Raised' : 'Pending' },
    ];

    // Money only exists once unloading has been recorded.
    const moneyRows = un ? [
      ['Freight', money(un.freightAmount)],
      ['Shortage', money(un.shortageAmount)],
      ['Detention', money(un.detentionAmount)],
      ['Net receivable', money(un.netReceivable)],
    ] : [];

    return {
      id: d.tripNumber || '—',
      route: [d.fromLocation, d.toLocation].filter(Boolean).join(' → ') || '—',
      stateLabel: stateMeta.label,
      stateTone: stateMeta.tone,
      vehicle: d.vehicleNumber || '—',
      vehicleType: d.vehicleType || '',
      facts: [
        ['Party', d.partyId?.name || '—'],
        ['Delivery order', d.doId?.doNumber || '—'],
        ['Material', d.material || '—'],
        ['Planned', d.plannedQty != null ? `${d.plannedQty}${qtyUnit ? ` ${qtyUnit}` : ''}` : '—'],
        ['Loaded', d.loadedQty != null ? `${d.loadedQty}${qtyUnit ? ` ${qtyUnit}` : ''}` : '—'],
        ['Distance', d.totalKm != null ? `${d.totalKm} km` : '—'],
        ['Trip date', d.tripDate ? dayjs(d.tripDate).format('DD MMM YYYY') : '—'],
      ],
      paperwork,
      pending: paperwork.filter((p) => !p.ok).length,
      moneyRows,
      canClose: d.state === 'DISPATCHED',
      canUnload: d.state === 'CLOSED' && !un,
    };
  }, [tripApi]);

  return (
    <View style={styles.container}>
      <BackHeader
        title={t?.id || 'Trip'}
        subtitle={t?.route}
        onBack={() => navigation.goBack()}
        right={t ? <Pill tone={t.stateTone} label={t.stateLabel} /> : null}
      />
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
            <Card elevated="sm" padding={16}>
              <SectionHeader label="Vehicle" right={t.vehicleType ? <AppText variant="caption" mono muted>{t.vehicleType}</AppText> : null} />
              <AppText mono variant="h3" weight="semibold" style={{ marginTop: 6 }}>{t.vehicle}</AppText>
            </Card>

            <Card elevated="sm" padding={16}>
              <SectionHeader label="Trip" />
              {t.facts.map(([label, value]) => (
                <View key={label} style={styles.moneyRow}>
                  <AppText variant="small" muted>{label}</AppText>
                  <AppText mono variant="bodyStrong" weight="semibold">{value}</AppText>
                </View>
              ))}
            </Card>

            <Card elevated="sm" padding={16}>
              <SectionHeader
                label="Paperwork"
                right={<Pill tone={t.pending ? 'pending' : 'success'} label={t.pending ? `${t.pending} pending` : 'All clear'} />}
              />
              {t.paperwork.map((p, i) => (
                <View key={p.label} style={[styles.paperRow, i > 0 && styles.rowDivider]}>
                  <AppText variant="body" style={{ flex: 1 }}>{p.label}</AppText>
                  <Pill tone={p.ok ? 'success' : 'pending'} label={p.badge} />
                </View>
              ))}
            </Card>

            {t.moneyRows.length ? (
              <Card elevated="sm" padding={16}>
                <SectionHeader label="Trip money" />
                {t.moneyRows.map(([label, value]) => (
                  <View key={label} style={styles.moneyRow}>
                    <AppText variant="small" muted>{label}</AppText>
                    <AppText mono variant="bodyStrong" weight="semibold">{value}</AppText>
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>

      {t ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {t.canClose ? (
            <Button
              size="lg"
              label="Close trip"
              onPress={() => navigation.navigate('OpsCloseTrip', { id })}
            />
          ) : t.canUnload ? (
            <Button
              size="lg"
              label="Record unloading"
              onPress={() => navigation.navigate('OpsUnloading', { tripId: id })}
            />
          ) : (
            <Button
              size="lg"
              label={`Cannot action — ${t.stateLabel}`}
              disabled={true}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, gap: 12 },
  paperRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 8 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  moneyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, gap: 8 },
  footer: { paddingHorizontal: 18, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
