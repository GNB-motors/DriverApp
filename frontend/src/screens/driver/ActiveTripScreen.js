/**
 * ActiveTripScreen.js
 *
 * The driver's current trip: where it is going, what stage it's at, and the one
 * thing they can do about it right now.
 *
 * Data: GET /api/erp/trips/my-active (driver-scoped, reduced projection).
 * Fields are the real ones — `state`, `tripNumber`, `fromLocation`,
 * `toLocation`, `advanceGate`, `cnGate` — not a numeric stage. The action button
 * is derived from `nextActionFor()` so it can never offer a step the backend
 * would reject.
 */

import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useErp } from '../../context/ErpContext';
import { useAuth } from '../../context/AuthContext';
import {
  AppText, Card, Button, Badge, SubHeader, EmptyState, MoneyText,
  PipelineProgress, colors, radius,
} from '../../components/ui';
import {
  nextActionFor, stateLabel, stateTone, tripRoute, tripQty, tripParty,
  ADVANCE_GATE_LABELS,
} from '../../domain/tripState';

const badgeTone = (tone) => ({
  success: 'valid', warning: 'pending', danger: 'expired', info: 'info',
}[tone] || 'neutral');

export default function ActiveTripScreen({ navigation }) {
  const { user } = useAuth();
  const { activeTrip: trip, isLoading, error, refetch } = useErp();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  if (!trip) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="My Trip" onBack={() => navigation.goBack()} />
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />}
        >
          <EmptyState
            icon="map-outline"
            title={error ? 'Could not load your trip' : 'No trip assigned'}
            message={
              error
                ? 'Pull down to try again.'
                : 'When your manager assigns a trip, it will show up here.'
            }
          />
        </ScrollView>
      </View>
    );
  }

  const route = tripRoute(trip);
  const action = nextActionFor(trip, user?.role);
  const advance = trip.advance;

  // Where an action goes. Only CN and POD are ever the driver's to take.
  const handleAction = () => {
    if (action?.key === 'cn') navigation.navigate('CnUpload', { trip });
    else if (action?.key === 'pod') navigation.navigate('PodSubmit', { trip });
  };

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <SubHeader
        title="My Trip"
        subtitle={trip.tripNumber}
        onBack={() => navigation.goBack()}
        right={<Badge tone={badgeTone(stateTone(trip.state))} label={stateLabel(trip.state)} />}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />}
      >
        {/* ── Route + stage ── */}
        <Card padding={20} elevated="sm" style={styles.card}>
          <View style={styles.routeRow}>
            <View style={styles.routeSide}>
              <AppText variant="caption" muted weight="medium">FROM</AppText>
              <AppText variant="h3" weight="extrabold" numberOfLines={2}>{route.from}</AppText>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.textMuted} style={styles.routeArrow} />
            <View style={[styles.routeSide, styles.routeSideEnd]}>
              <AppText variant="caption" muted weight="medium">TO</AppText>
              <AppText variant="h3" weight="extrabold" numberOfLines={2}>{route.to}</AppText>
            </View>
          </View>

          <View style={styles.divider} />

          <PipelineProgress trip={trip} />

          {action && !action.wait && (action.key === 'cn' || action.key === 'pod') && (
            <Button
              label={action.driverLabel || action.label}
              iconRight={action.key === 'cn' ? 'document-attach' : 'mail-open'}
              onPress={handleAction}
              style={styles.actionBtn}
            />
          )}

          {action?.wait && (
            <View style={styles.waitBanner}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <AppText variant="small" muted weight="medium" style={styles.waitText}>
                {action.key === 'close'
                  ? 'Your manager will close this trip after unloading.'
                  : `Next: ${action.label.toLowerCase()} — handled by the office.`}
              </AppText>
            </View>
          )}
        </Card>

        {/* ── Advance: parallel financial track, never a pipeline step ── */}
        {advance ? (
          <Card padding={18} elevated="sm" style={styles.card}>
            <View style={styles.cardHead}>
              <AppText variant="label" muted>TRIP ADVANCE</AppText>
              <Badge
                tone={advance.status === 'PAID' ? 'valid' : 'pending'}
                label={ADVANCE_GATE_LABELS[trip.advanceGate] || advance.status}
              />
            </View>
            <MoneyText amount={advance.netPayable} variant="h1" weight="extrabold" />
            <AppText variant="small" muted style={styles.advanceMeta}>
              {advance.paidAt
                ? `${advance.paymentMode || 'Paid'} · ${dayjs(advance.paidAt).format('DD MMM YYYY')}`
                : 'Not yet paid out'}
              {advance.advanceNumber ? ` · ${advance.advanceNumber}` : ''}
            </AppText>
          </Card>
        ) : null}

        {/* ── Load details ── */}
        <Card padding={18} elevated="sm" style={styles.card}>
          <AppText variant="label" muted style={styles.cardTitle}>LOAD</AppText>
          <InfoRow label="Party" value={tripParty(trip)} />
          <InfoRow label="Material" value={trip.material || '—'} />
          <InfoRow label="Quantity" value={tripQty(trip)} />
          <InfoRow label="Vehicle" value={trip.vehicleNumber || '—'} />
          <InfoRow label="Distance" value={trip.totalKm ? `${trip.totalKm} km` : '—'} />
          <InfoRow
            label="Trip date"
            value={trip.tripDate ? dayjs(trip.tripDate).format('DD MMM YYYY') : '—'}
            border={false}
          />
        </Card>

        {/* ── Paperwork ── */}
        <Card padding={18} elevated="sm" style={styles.card}>
          <AppText variant="label" muted style={styles.cardTitle}>PAPERWORK</AppText>
          <InfoRow
            label="Consignment note"
            value={trip.consignment?.cnNumber || 'Not filed yet'}
            tone={trip.consignment ? 'ok' : 'pending'}
          />
          <InfoRow
            label="Proof of delivery"
            value={
              trip.pod?.receivedDate
                ? `Received ${dayjs(trip.pod.receivedDate).format('DD MMM')}`
                : 'Not submitted yet'
            }
            tone={trip.pod ? 'ok' : 'pending'}
            border={false}
          />
        </Card>

        {trip.unloadedAt ? (
          <Card padding={18} elevated="sm" style={styles.card}>
            <AppText variant="label" muted style={styles.cardTitle}>UNLOADING</AppText>
            <InfoRow label="Unloaded on" value={dayjs(trip.unloadedAt).format('DD MMM YYYY')} />
            <InfoRow label="Location" value={trip.unloadLocation || '—'} border={false} />
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, tone, border = true }) {
  const color = tone === 'ok' ? colors.success : tone === 'pending' ? colors.warning : undefined;
  return (
    <View style={[styles.infoRow, border && styles.infoRowBorder]}>
      <AppText variant="small" muted weight="medium">{label}</AppText>
      <AppText variant="bodyStrong" weight="bold" color={color} style={styles.infoValue} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 22, paddingBottom: 48 },
  emptyScroll: { flexGrow: 1 },
  card: { marginBottom: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { marginBottom: 6 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  routeSide: { flex: 1 },
  routeSideEnd: { alignItems: 'flex-end' },
  routeArrow: { marginHorizontal: 12, marginTop: 20 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 18 },
  actionBtn: { marginTop: 18 },
  waitBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16,
    padding: 12, backgroundColor: colors.background, borderRadius: radius.md,
  },
  waitText: { flex: 1 },
  advanceMeta: { marginTop: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingVertical: 11 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoValue: { flex: 1, textAlign: 'right' },
});
