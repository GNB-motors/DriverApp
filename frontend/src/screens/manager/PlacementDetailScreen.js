/**
 * PlacementDetailScreen.js — one placement in full.
 *
 * GET /api/erp/placements/:placementId
 *
 * Was a "Placement specifics will appear here" shell that imported the trip
 * fetcher and never called it.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchPlacementById } from '../../services/erpApi';
import {
  AppText, Card, Badge, SubHeader, MoneyText, colors, radius,
} from '../../components/ui';
import logger from '../../utils/logger';

const TONE = { PLACED: 'pending', COMPLETED: 'valid', CANCELLED: 'expired' };

export default function PlacementDetailScreen({ route, navigation }) {
  const placementId = route?.params?.placementId;
  const { token } = useAuth();

  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token || !placementId) return;
    try {
      setPlacement(await fetchPlacementById(token, placementId));
      setError(null);
    } catch (err) {
      logger.warn('PlacementDetail', `Load failed: ${err?.message}`);
      setError(err?.message || 'Could not load this placement.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, placementId]);

  useEffect(() => { load(); }, [load]);

  if (loading && !placement) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="Placement" onBack={() => navigation.goBack()} />
        <View style={styles.centre}><AppText variant="body" muted>Loading…</AppText></View>
      </View>
    );
  }

  if (!placement) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <SubHeader title="Placement" onBack={() => navigation.goBack()} />
        <View style={styles.centre}>
          <AppText variant="body" muted>{error || 'Placement not found.'}</AppText>
        </View>
      </View>
    );
  }

  const isHire = placement.vehicleType === 'HIRE';
  const emptyLegs = placement.emptyLegs || [];

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <SubHeader
        title={placement.placementNumber || 'Placement'}
        subtitle={`${placement.fromLocation || '—'} → ${placement.toLocation || '—'}`}
        onBack={() => navigation.goBack()}
        right={<Badge tone={TONE[placement.status] || 'neutral'} label={titleise(placement.status)} />}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
      >
        <Card padding={18} elevated="sm" style={styles.card}>
          <AppText variant="label" muted style={styles.cardTitle}>ORDER</AppText>
          <Row label="Delivery order" value={placement.doId?.doNumber || '—'} />
          <Row label="Party" value={placement.partyId?.name || placement.doId?.partyId?.name || '—'} />
          <Row label="Material" value={placement.material || '—'} />
          <Row
            label="Placed on"
            value={placement.placementDate ? dayjs(placement.placementDate).format('DD MMM YYYY') : '—'}
            border={false}
          />
        </Card>

        <Card padding={18} elevated="sm" style={styles.card}>
          <AppText variant="label" muted style={styles.cardTitle}>
            {isHire ? 'HIRE VEHICLE' : 'OWN VEHICLE'}
          </AppText>
          {isHire ? (
            <>
              <Row label="Vendor" value={placement.vendorId?.name || '—'} />
              <Row label="Vehicle" value={placement.hireVehicleNumber || '—'} />
              <Row label="Driver" value={placement.hireDriverName || '—'} />
              <Row label="Phone" value={placement.hireDriverPhone || '—'} />
              {placement.pbRate != null ? (
                <Row
                  label="PB rate"
                  value={`₹${placement.pbRate} / ${placement.pbRateUnit || 'KL'}${
                    placement.pbRateSource ? ` (${placement.pbRateSource.toLowerCase()})` : ''
                  }`}
                  border={false}
                />
              ) : null}
            </>
          ) : (
            <>
              <Row
                label="Vehicle"
                value={placement.vehicleNumber || placement.vehicleId?.registrationNumber || '—'}
              />
              <Row
                label="Driver"
                value={[placement.driverId?.firstName, placement.driverId?.lastName]
                  .filter(Boolean).join(' ') || '—'}
                border={false}
              />
            </>
          )}
        </Card>

        <Card padding={18} elevated="sm" style={styles.card}>
          <AppText variant="label" muted style={styles.cardTitle}>ROUTE</AppText>
          <Row label="From" value={placement.fromLocation || '—'} />
          <Row label="To" value={placement.toLocation || '—'} />
          <Row label="Distance" value={placement.totalKm ? `${placement.totalKm} km` : '—'} />
          {placement.previousCargo ? (
            <Row label="Previous cargo" value={placement.previousCargo} border={false} />
          ) : null}
        </Card>

        {/* Restriction snapshot — why this vehicle was allowed to take this load. */}
        {placement.restrictionSnapshot ? (
          <Card padding={18} elevated="sm" style={styles.card}>
            <AppText variant="label" muted style={styles.cardTitle}>RESTRICTION CHECK</AppText>
            <View style={styles.snapshotRow}>
              <Ionicons
                name={placement.restrictionSnapshot.allowed ? 'checkmark-circle' : 'alert-circle'}
                size={17}
                color={placement.restrictionSnapshot.allowed ? colors.success : colors.warning}
              />
              <AppText variant="small" weight="semibold" style={styles.snapshotText}>
                {placement.restrictionSnapshot.reason
                  || (placement.restrictionSnapshot.allowed
                    ? 'Compatible with the previous cargo.'
                    : 'Flagged at placement time.')}
              </AppText>
            </View>
          </Card>
        ) : null}

        {emptyLegs.length > 0 ? (
          <Card padding={18} elevated="sm" style={styles.card}>
            <AppText variant="label" muted style={styles.cardTitle}>EMPTY LEGS</AppText>
            {emptyLegs.map((leg, i) => (
              <View
                key={leg._id || i}
                style={[styles.legRow, i < emptyLegs.length - 1 && styles.legRowBorder]}
              >
                <View style={styles.legText}>
                  <AppText variant="small" weight="semibold" numberOfLines={1}>
                    {leg.fromLocation || '—'} → {leg.toLocation || '—'}
                  </AppText>
                  <AppText variant="caption" muted weight="medium">
                    {titleise(leg.reason)}
                  </AppText>
                </View>
                <MoneyText amount={leg.budgetAmount} variant="small" weight="bold" />
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </View>
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

const titleise = (s) =>
  String(s || '—').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22, paddingBottom: 48 },
  card: { marginBottom: 14 },
  cardTitle: { marginBottom: 4 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    gap: 16, paddingVertical: 11,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowValue: { flex: 1, textAlign: 'right' },
  snapshotRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 6 },
  snapshotText: { flex: 1 },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  legRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  legText: { flex: 1 },
});
