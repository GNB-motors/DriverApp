/**
 * TripDetailScreen.js — the trip 360°, mirroring the web's /erp/trips/:id.
 *
 * GET /api/erp/trips/:tripId returns the trip plus `advances[]`, `consignment`,
 * `pod`, `unloading`, `saleBill` and `purchaseBill` in a single call — the best
 * reuse opportunity in the codebase, and the reason this screen needs no other
 * requests.
 *
 * The action button comes from `nextActionFor()`, gated on the role, so it can
 * never offer a stage the backend will reject.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { fetchErpTripById } from '../../services/erpApi';
import {
  AppText, Card, Button, Badge, SubHeader, MoneyText, PipelineProgress,
  colors, radius,
} from '../../components/ui';
import {
  nextActionFor, stateLabel, stateTone, tripRoute, tripParty, tripQty,
} from '../../domain/tripState';
import logger from '../../utils/logger';

const badgeTone = (tone) => ({
  success: 'valid', warning: 'pending', danger: 'expired', info: 'info',
}[tone] || 'neutral');

export default function TripDetailScreen({ route, navigation }) {
  const tripId = route?.params?.tripId;
  const { user, token } = useAuth();
  const { can } = useAccess();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token || !tripId) return;
    try {
      setTrip(await fetchErpTripById(token, tripId));
      setError(null);
    } catch (err) {
      logger.warn('TripDetail', `Load failed: ${err?.message}`);
      setError(err?.message || 'Could not load this trip.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, tripId]);

  useEffect(() => { load(); }, [load]);

  // Coming back from a stage screen (close, unloading, CN, POD) must show the new
  // state. Transitions are worker-driven, so the reload is on focus rather than
  // optimistic — by the time the user navigates back the worker has usually run.
  useEffect(
    () => navigation.addListener('focus', () => load()),
    [navigation, load],
  );

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading && !trip) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="Trip" onBack={() => navigation.goBack()} />
        <View style={styles.centre}><AppText variant="body" muted>Loading…</AppText></View>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="Trip" onBack={() => navigation.goBack()} />
        <View style={styles.centre}>
          <AppText variant="body" muted>{error || 'Trip not found.'}</AppText>
        </View>
      </View>
    );
  }

  const r = tripRoute(trip);
  const action = nextActionFor(trip, user?.role);
  // Only the stages this screen can actually launch.
  const launch = {
    close: () => navigation.navigate('TripClose', { trip }),
    unloading: () => navigation.navigate('UnloadingForm', { trip }),
    cn: () => navigation.navigate('CnUpload', { trip }),
    pod: () => navigation.navigate('PodSubmit', { trip }),
  }[action?.key];

  const advance = trip.advances?.[0];

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <SubHeader
        title={trip.tripNumber || 'Trip'}
        subtitle={r.text}
        onBack={() => navigation.goBack()}
        right={<Badge tone={badgeTone(stateTone(trip.state))} label={stateLabel(trip.state)} />}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {error ? (
          <Card variant="outline" padding={13} style={[styles.card, styles.errorCard]}>
            <AppText variant="small" weight="semibold" color={colors.error}>{error}</AppText>
          </Card>
        ) : null}

        <Card padding={18} elevated="sm" style={styles.card}>
          <PipelineProgress trip={trip} />
          {action && launch && !action.wait ? (
            <Button label={action.label} onPress={launch} style={styles.actionBtn} />
          ) : action?.wait ? (
            <View style={styles.waitBanner}>
              <Ionicons name="time-outline" size={15} color={colors.textMuted} />
              <AppText variant="small" muted weight="medium" style={styles.waitText}>
                {action.label} — not your step.
              </AppText>
            </View>
          ) : null}
        </Card>

        <Card padding={18} elevated="sm" style={styles.card}>
          <AppText variant="label" muted style={styles.cardTitle}>LOAD</AppText>
          <Row label="Party" value={tripParty(trip)} />
          <Row label="Delivery order" value={trip.doId?.doNumber || '—'} />
          <Row label="Material" value={trip.material || '—'} />
          <Row label="Quantity" value={tripQty(trip)} />
          <Row label="Vehicle" value={`${trip.vehicleNumber || '—'} (${trip.vehicleType || '—'})`} />
          <Row label="Distance" value={trip.totalKm ? `${trip.totalKm} km` : '—'} />
          <Row
            label="Trip date"
            value={trip.tripDate ? dayjs(trip.tripDate).format('DD MMM YYYY') : '—'}
            border={false}
          />
        </Card>

        {/* ── Stage cards: only what exists, so the screen shrinks with the trip ── */}
        {can('advances.view') && advance ? (
          <StageCard
            title="ADVANCE"
            badge={{ tone: advance.status === 'PAID' ? 'valid' : 'pending', label: advance.status }}
          >
            <Row label="Number" value={advance.advanceNumber || '—'} />
            <MoneyRow label="Net payable" amount={advance.netPayable} />
            {Number(advance.totalDeductions) > 0 ? (
              <MoneyRow label="Deductions" amount={advance.totalDeductions} tone={colors.warning} />
            ) : null}
            <Row
              label="Paid"
              value={advance.paidAt
                ? `${advance.paymentMode || '—'} · ${dayjs(advance.paidAt).format('DD MMM')}`
                : 'Not yet'}
              border={false}
            />
          </StageCard>
        ) : null}

        {trip.consignment ? (
          <StageCard title="CONSIGNMENT NOTE" badge={{ tone: 'valid', label: 'Filed' }}>
            <Row label="CN number" value={trip.consignment.cnNumber || '—'} />
            <Row
              label="CN date"
              value={trip.consignment.cnDate ? dayjs(trip.consignment.cnDate).format('DD MMM YYYY') : '—'}
            />
            <Row
              label="Loaded"
              value={trip.consignment.loadedQty != null
                ? `${trip.consignment.loadedQty} ${trip.consignment.loadedQtyUnit || ''}`.trim()
                : '—'}
              border={false}
            />
          </StageCard>
        ) : null}

        {trip.pod ? (
          <StageCard title="PROOF OF DELIVERY" badge={{ tone: 'valid', label: 'Received' }}>
            <Row
              label="Received"
              value={trip.pod.receivedDate ? dayjs(trip.pod.receivedDate).format('DD MMM YYYY') : '—'}
            />
            <Row label="Copy" value={trip.pod.copyType || '—'} />
            <Row label="Via" value={humanise(trip.pod.receivedVia)} border={false} />
          </StageCard>
        ) : null}

        {trip.unloading ? (
          <StageCard title="UNLOADING" badge={{ tone: 'info', label: 'Settled' }}>
            <Row
              label="Unloaded"
              value={trip.unloading.unloadedQty != null
                ? `${trip.unloading.unloadedQty} ${trip.unloading.qtyUnit || ''}`.trim()
                : '—'}
            />
            {Number(trip.unloading.shortageQty) > 0 ? (
              <Row
                label="Shortage"
                value={`${trip.unloading.shortageQty} ${trip.unloading.qtyUnit || ''}`.trim()}
              />
            ) : null}
            {Number(trip.unloading.detentionDays) > 0 ? (
              <Row label="Detention" value={`${trip.unloading.detentionDays} days`} />
            ) : null}
            <MoneyRow label="Net receivable" amount={trip.unloading.netReceivable} border={false} />
          </StageCard>
        ) : null}

        {can('billing.view') && trip.saleBill ? (
          <StageCard
            title="SALE BILL"
            badge={{ tone: trip.saleBill.status === 'PAID' ? 'valid' : 'info', label: trip.saleBill.status }}
          >
            <Row label="Bill number" value={trip.saleBill.billNumber || '—'} />
            <Row
              label="Bill date"
              value={trip.saleBill.billDate ? dayjs(trip.saleBill.billDate).format('DD MMM YYYY') : '—'}
            />
            <MoneyRow label="Invoice total" amount={trip.saleBill.netAmount} />
            <MoneyRow
              label="Outstanding"
              amount={trip.saleBill.outstandingAmount}
              tone={Number(trip.saleBill.outstandingAmount) > 0 ? colors.warning : colors.success}
              border={false}
            />
          </StageCard>
        ) : null}

        {trip.tripClosedAt ? (
          <StageCard title="CLOSE">
            <Row label="Unloaded on" value={dayjs(trip.unloadedAt).format('DD MMM YYYY')} />
            <Row label="Location" value={trip.unloadLocation || '—'} />
            {trip.closeRemarks ? <Row label="Remarks" value={trip.closeRemarks} /> : null}
            <Row
              label="Closed by"
              value={[trip.tripClosedBy?.firstName, trip.tripClosedBy?.lastName]
                .filter(Boolean).join(' ') || '—'}
              border={false}
            />
          </StageCard>
        ) : null}
      </ScrollView>
    </View>
  );
}

function StageCard({ title, badge, children }) {
  return (
    <Card padding={18} elevated="sm" style={styles.card}>
      <View style={styles.stageHead}>
        <AppText variant="label" muted>{title}</AppText>
        {badge ? <Badge tone={badge.tone} label={humanise(badge.label)} /> : null}
      </View>
      {children}
    </Card>
  );
}

function Row({ label, value, border = true }) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <AppText variant="small" muted weight="medium">{label}</AppText>
      <AppText variant="bodyStrong" weight="bold" style={styles.rowValue} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

function MoneyRow({ label, amount, tone, border = true }) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <AppText variant="small" muted weight="medium">{label}</AppText>
      <MoneyText amount={amount} variant="bodyStrong" weight="extrabold" color={tone} />
    </View>
  );
}

const humanise = (s) =>
  String(s || '—').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22, paddingBottom: 48 },
  card: { marginBottom: 14 },
  cardTitle: { marginBottom: 4 },
  errorCard: { borderColor: colors.error, backgroundColor: colors.expiredBg, borderRadius: radius.md },
  stageHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionBtn: { marginTop: 18 },
  waitBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16,
    padding: 12, backgroundColor: colors.background, borderRadius: radius.md,
  },
  waitText: { flex: 1 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    gap: 16, paddingVertical: 11,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowValue: { flex: 1, textAlign: 'right' },
});
