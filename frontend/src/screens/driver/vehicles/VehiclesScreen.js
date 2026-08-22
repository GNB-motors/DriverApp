import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, Badge, ProgressBar, Loading, EmptyState, colors, spacing, radius } from '../../../components/ui';
import dayjs from 'dayjs';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import vehicleService from '../../../services/vehicleService';
import fuelService from '../../../services/fuelService';

/**
 * 15 · Vehicles — my assigned truck. UI-only demo.
 */
export default function VehiclesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data: vehiclesApi, loading } = useApi(() => vehicleService.listVehicles(), [], { enabled, fallback: [] });
  const { data: fuelApi } = useApi(() => fuelService.listFuelLogs(), [], { enabled, fallback: [] });

  // First assigned vehicle → hero fields. (mapping to confirm against live API)
  const v = React.useMemo(() => {
    const rows = Array.isArray(vehiclesApi) ? vehiclesApi : (vehiclesApi?.results || vehiclesApi?.rows || vehiclesApi?.items || vehiclesApi?.data || []);
    const fv = rows[0];
    if (!fv) return null;
    return {
      plate: fv.registrationNumber || fv.regNumber || fv.plate || '—',
      spec: [fv.model, fv.capacity ? `${fv.capacity} t` : null, fv.year].filter(Boolean).join(' · ') || '—',
      odometer: fv.odometer != null ? Number(fv.odometer).toLocaleString('en-IN') : '—',
      mileage: fv.mileage != null ? String(fv.mileage) : '—',
      fastag: fv.fastagBalance != null ? `₹${Number(fv.fastagBalance).toLocaleString('en-IN')}` : (fv.fastag || '—'),
      papers: Array.isArray(fv.papers) ? fv.papers : [],
      serviceDueKm: fv.serviceDueKm || '—',
      servicePercent: fv.servicePercent != null ? fv.servicePercent : 0,
    };
  }, [vehiclesApi]);
  const duePapers = (v?.papers || []).filter((p) => !p.ok).length;

  // Most recent fuel log → "last refuel" tile. (mapping to confirm against live API)
  const lastRefuelText = React.useMemo(() => {
    const rows = Array.isArray(fuelApi) ? fuelApi : (fuelApi?.results || fuelApi?.rows || fuelApi?.items || fuelApi?.data || []);
    if (!rows.length) return '—';
    const f = [...rows].sort((a, b) => new Date(b.date || b.filledAt || b.createdAt || 0) - new Date(a.date || a.filledAt || a.createdAt || 0))[0];
    const litres = f.litres ?? f.liters ?? f.quantity;
    const when = f.date || f.filledAt || f.createdAt;
    return [litres != null ? `Last ${litres} L` : 'Last refuel', when ? dayjs(when).format('DD MMM') : null].filter(Boolean).join(' · ');
  }, [fuelApi]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <AppText variant="h2" weight="extrabold">Vehicles</AppText>
        <Pressable hitSlop={8} style={styles.iconBtn}><Ionicons name="search" size={20} color={colors.text} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Loading />
        ) : !v ? (
          <EmptyState icon="car-outline" title="No vehicle assigned" message="Once the owner assigns you a truck, it shows up here." />
        ) : (
          <>
            {/* Vehicle hero */}
            <Card variant="outline" elevated="sm" padding={16} style={styles.hero}>
              <View style={styles.heroTop}>
                <AppText mono variant="h3" weight="semibold">{v.plate}</AppText>
                <Badge tone="valid" label="Assigned to you" />
              </View>
              <AppText variant="small" muted>{v.spec}</AppText>
              <View style={styles.statGrid}>
                <View style={styles.stat}><AppText variant="caption" muted>Odometer</AppText><AppText mono variant="bodyStrong" weight="semibold">{v.odometer}</AppText></View>
                <View style={styles.stat}><AppText variant="caption" muted>Mileage</AppText><AppText mono variant="bodyStrong" weight="semibold">{v.mileage}</AppText></View>
                <View style={styles.stat}><AppText variant="caption" muted>Fastag</AppText><AppText mono variant="bodyStrong" weight="semibold">{v.fastag}</AppText></View>
              </View>
            </Card>

            {/* Papers */}
            <Card elevated="sm" padding={16} style={styles.gap}>
              <View style={styles.cardHead}>
                <AppText variant="label" muted>Vehicle papers</AppText>
                {duePapers ? <Badge tone="pending" label={`${duePapers} due`} /> : null}
              </View>
              {v.papers.map((p, i) => (
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

            {/* Next service */}
            <Card elevated="sm" padding={16} style={styles.gap}>
              <View style={styles.cardHead}>
                <AppText variant="label" muted>Next service</AppText>
                <AppText mono variant="small" weight="semibold">Due in {v.serviceDueKm}</AppText>
              </View>
              <ProgressBar label="" percent={v.servicePercent} value={`${v.servicePercent}%`} style={styles.gapSm} />
            </Card>
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
