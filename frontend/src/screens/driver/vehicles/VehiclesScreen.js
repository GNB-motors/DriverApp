import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, Badge, StatusBadge, Loading, EmptyState, colors, spacing, radius } from '../../../components/ui';
import dayjs from 'dayjs';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import vehicleService from '../../../services/vehicleService';

/** Vehicle.status → StatusBadge vocabulary. */
const STATUS_BADGE = {
  AVAILABLE: { key: 'valid', label: 'Available' },
  ON_TRIP: { key: 'in_transit', label: 'On trip' },
  MAINTENANCE: { key: 'in_workshop', label: 'In workshop' },
};
import fuelService from '../../../services/fuelService';

/**
 * 15 · Vehicles — my assigned truck. UI-only demo.
 */
export default function VehiclesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data: vehiclesApi, loading, error, refetch: refetchVehicles } = useApi(() => vehicleService.listVehicles(), [], { enabled, fallback: [] });
  const { data: fuelApi, refetch: refetchFuel } = useApi(() => fuelService.listFuelLogs(), [], { enabled, fallback: [] });
  const onRefresh = () => { refetchVehicles(); refetchFuel(); refetchPapers(); };

  // /vehicles → [{ _id, registrationNumber, vehicleType, chassisNumber, model,
  //   status, manufacturer, vehicleCategory, classification }]
  // (VEHICLE_LIST_FIELDS in vehicle.service.js). Odometer, mileage, fastag and
  // service intervals are not on this payload, so the hero shows what is real.
  const v = React.useMemo(() => {
    const rows = Array.isArray(vehiclesApi)
      ? vehiclesApi
      : (vehiclesApi?.results || vehiclesApi?.rows || vehiclesApi?.items || vehiclesApi?.data || []);
    const fv = rows[0];
    if (!fv) return null;
    return {
      _id: fv._id,
      plate: fv.registrationNumber || '—',
      spec: [fv.manufacturer, fv.model, fv.vehicleType].filter(Boolean).join(' · ') || '—',
      status: fv.status || 'AVAILABLE',
      chassis: fv.chassisNumber || '—',
      category: fv.vehicleCategory || null,
    };
  }, [vehiclesApi]);

  // Papers come from the vehicle's own document set, not the vehicle record.
  const { data: papersApi, refetch: refetchPapers } = useApi(
    () => vehicleService.getVehicleDocuments(v?._id),
    [v?._id],
    { enabled: enabled && !!v?._id, fallback: null },
  );

  // /vehicles/:id/documents → [{ docType, expiryDate, files, uploadedAt }]
  const papers = React.useMemo(() => {
    const rows = Array.isArray(papersApi)
      ? papersApi
      : (papersApi?.results || papersApi?.rows || papersApi?.items || papersApi?.data || []);
    return rows.map((pp) => {
      const exp = pp?.expiryDate ? dayjs(pp.expiryDate) : null;
      const days = exp ? exp.diff(dayjs(), 'day') : null;
      return {
        label: String(pp?.docType || 'Document').replace(/_/g, ' '),
        date: exp ? exp.format('DD MMM YYYY') : 'no expiry',
        // "ok" means not expiring inside 30 days.
        ok: days == null || days > 30,
      };
    });
  }, [papersApi]);
  const duePapers = papers.filter((pp) => !pp.ok).length;

  // Most recent fuel log → the "last refuel" tile.
  // /fuel-logs → [{ litres, totalAmount, refuelTime, location }]
  const lastRefuelText = React.useMemo(() => {
    const rows = Array.isArray(fuelApi)
      ? fuelApi
      : (fuelApi?.results || fuelApi?.rows || fuelApi?.items || fuelApi?.data || []);
    if (!rows.length) return 'No refuel yet';
    const f = [...rows].sort(
      (a, b) => new Date(b?.refuelTime || b?.createdAt || 0) - new Date(a?.refuelTime || a?.createdAt || 0),
    )[0];
    const when = f?.refuelTime || f?.createdAt;
    return [
      f?.litres != null ? `Last ${f.litres} L` : 'Last refuel',
      when ? dayjs(when).format('DD MMM') : null,
    ].filter(Boolean).join(' · ');
  }, [fuelApi]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <AppText variant="h2" weight="extrabold">Vehicles</AppText>
        <Pressable hitSlop={8} style={styles.iconBtn}><Ionicons name="search" size={20} color={colors.text} /></Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={onRefresh} />
        ) : !v ? (
          <EmptyState icon="car-outline" title="No vehicle assigned" message="Once the owner assigns you a truck, it shows up here." />
        ) : (
          <>
            {/* Vehicle hero */}
            <Card variant="outline" elevated="sm" padding={16} style={styles.hero}>
              <View style={styles.heroTop}>
                <AppText mono variant="h3" weight="semibold">{v.plate}</AppText>
                <StatusBadge status={STATUS_BADGE[v.status]?.key || 'draft'} label={STATUS_BADGE[v.status]?.label || v.status} />
              </View>
              <AppText variant="small" muted>{v.spec}</AppText>
              <View style={styles.statGrid}>
                <View style={styles.stat}><AppText variant="caption" muted>Chassis</AppText><AppText mono variant="small" weight="semibold" numberOfLines={1}>{v.chassis}</AppText></View>
                {v.category ? (
                  <View style={styles.stat}><AppText variant="caption" muted>Category</AppText><AppText mono variant="small" weight="semibold" numberOfLines={1}>{v.category}</AppText></View>
                ) : null}
              </View>
            </Card>

            {/* Papers */}
            <Card elevated="sm" padding={16} style={styles.gap}>
              <View style={styles.cardHead}>
                <AppText variant="label" muted>Vehicle papers</AppText>
                {duePapers ? <Badge tone="pending" label={`${duePapers} due`} /> : null}
              </View>
              {papers.length === 0 ? (
                <AppText variant="small" muted style={{ marginTop: 8 }}>No papers uploaded yet.</AppText>
              ) : null}
              {papers.map((p, i) => (
                <View key={p.label} style={[styles.paperRow, i > 0 && styles.paperDivider]}>
                  <AppText variant="body" style={{ flex: 1 }}>{p.label}</AppText>
                  <AppText mono variant="small" color={p.ok ? colors.textMuted : colors.warning}>{p.date}</AppText>
                  <View style={[styles.dot, { backgroundColor: p.ok ? colors.dotGreen : colors.dotAmber }]} />
                </View>
              ))}
            </Card>

            {/* Action tiles */}
            <View style={[styles.tileRow, styles.gap]}>
              <Pressable style={styles.tile} onPress={() => navigation.navigate('FuelLog')}>
                <Ionicons name="water" size={22} color={colors.primary} />
                <AppText variant="bodyStrong" weight="bold">Fuel log</AppText>
                <AppText variant="caption" mono muted>{lastRefuelText}</AppText>
              </Pressable>
              <Pressable style={styles.tile} onPress={() => navigation.navigate('Repairs')}>
                <Ionicons name="build" size={22} color={colors.primary} />
                <AppText variant="bodyStrong" weight="bold">Repairs</AppText>
                <AppText variant="caption" mono muted>View logs</AppText>
              </Pressable>
            </View>

          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingBottom: 10,
  },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 22, paddingTop: 6, gap: 14 },
  gap: { marginTop: 0 },
  gapSm: { marginTop: 10 },
  hero: { borderColor: '#C7D0F7', gap: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statGrid: { flexDirection: 'row', gap: 10, marginTop: 4 },
  stat: { flex: 1, gap: 3 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  paperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  paperDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 9, height: 9, borderRadius: 5 },
  tileRow: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 6,
    borderWidth: 1, borderColor: colors.border,
  },
});
