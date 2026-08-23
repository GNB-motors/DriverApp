import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, Badge, StatusBadge, BarChart, Loading, EmptyState, colors, spacing, radius } from '../../../components/ui';
import dayjs from 'dayjs';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import fuelService from '../../../services/fuelService';

/**
 * 20 · Fuel log — history and mileage trend. Real data only.
 */
export default function FuelLogScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  const { data, loading, error, refetch } = useApi(() => fuelService.listFuelLogs(), [], { enabled, fallback: [] });

  // /fuel-logs → [{ litres, rate, totalAmount, odometerReading, refuelTime,
  //   location, fuelType, fillingType, calculatedMileage,
  //   vehicleId: { registrationNumber, vehicleType } }]
  // (fuelLog.service.js populates vehicleId / driverId / loggedBy.)
  // A fuel log has no approval status — every row here is a recorded fill.
  const { plate, mileage, trend, kpis, history, isEmpty } = React.useMemo(() => {
    const rows = Array.isArray(data)
      ? data
      : (data?.results || data?.rows || data?.items || data?.data || []);
    const when = (f) => f?.refuelTime || f?.createdAt;
    const km = (f) => Number(f?.calculatedMileage) || 0;
    const mileageRow = rows.find((f) => km(f) > 0);
    return {
      plate: rows[0]?.vehicleId?.registrationNumber || '—',
      mileage: mileageRow ? km(mileageRow).toFixed(1) : '—',
      trend: rows
        .filter((f) => km(f) > 0)
        .slice(0, 6)
        .reverse()
        .map((f) => ({ label: when(f) ? dayjs(when(f)).format('MMM') : '', value: km(f) })),
      kpis: [
        { label: 'Litres', value: rows.length ? String(Math.round(rows.reduce((n, f) => n + (Number(f?.litres) || 0), 0))) : '—' },
        { label: 'Spend', value: rows.length ? `₹${rows.reduce((n, f) => n + (Number(f?.totalAmount) || 0), 0).toLocaleString('en-IN')}` : '—' },
        { label: 'Fills', value: rows.length ? String(rows.length) : '—' },
      ],
      history: rows.map((f, i) => ({
        id: f?._id || String(i),
        litres: f?.litres != null ? `${Number(f.litres).toFixed(1)} L` : '',
        status: 'captured',
        statusLabel: f?.fillingType || 'Captured',
        meta: [
          when(f) ? dayjs(when(f)).format('DD MMM') : null,
          f?.location,
          km(f) > 0 ? `${km(f).toFixed(1)} km/L` : null,
        ].filter(Boolean).join(' · '),
        amount: f?.totalAmount != null ? `₹${Number(f.totalAmount).toLocaleString('en-IN')}` : '',
      })),
      isEmpty: rows.length === 0,
    };
  }, [data]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Fuel log</AppText>
          <AppText variant="caption" mono muted>{plate} · August</AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Trend */}
        <Card elevated="sm" padding={16}>
          <View style={styles.cardHead}>
            <View style={styles.trendVal}>
              <AppText mono weight="semibold" style={styles.bigVal}>{mileage}</AppText>
              <AppText variant="small" muted>km/L</AppText>
            </View>
            <Badge tone="valid" label="Improving" />
          </View>
          <BarChart data={trend} height={110} style={styles.chart} />
        </Card>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          {kpis.map((k) => (
            <Card key={k.label} elevated="sm" padding={14} style={styles.kpi}>
              <AppText variant="caption" muted>{k.label}</AppText>
              <AppText mono variant="h3" weight="semibold">{k.value}</AppText>
            </Card>
          ))}
        </View>

        {/* History */}
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} style={styles.gap} />
        ) : isEmpty ? (
          <EmptyState icon="water-outline" title="No fuel entries yet" message="Add a fuel fill and it will appear here." style={styles.gap} />
        ) : (
          <Card padding={0} elevated="sm" style={styles.gap}>
            {history.map((h, i) => (
              <View key={h.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.histRow}>
                  <View style={styles.histIcon}><Ionicons name="water" size={18} color={colors.primary} /></View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.histTop}>
                      <AppText mono variant="bodyStrong" weight="semibold">{h.litres}</AppText>
                      <StatusBadge status={h.status} label={h.statusLabel} />
                    </View>
                    <AppText variant="caption" mono muted>{h.meta}</AppText>
                  </View>
                  <AppText mono variant="bodyStrong" weight="semibold">{h.amount}</AppText>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Button size="lg" icon="add" label="Add fuel" onPress={() => navigation.navigate('FuelCapture')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 14 },
  gap: { marginTop: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendVal: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigVal: { fontSize: 26, lineHeight: 30 },
  chart: { marginTop: 14 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpi: { flex: 1, gap: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 13 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  histIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  histTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
