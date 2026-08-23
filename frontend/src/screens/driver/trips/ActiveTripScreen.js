import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, StatusBadge, WarningBanner, Loading, EmptyState, colors, spacing, radius } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import tripService from '../../../services/tripService';

/**
 * 03 · Active trip — the 8-stage pipeline. Real data only.
 */
export default function ActiveTripScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const id = route?.params?.id;
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token;
  // With an id, fetch that trip; otherwise list trips and pick the active one.
  const { data, loading, error, refetch } = useApi(
    () => (id ? tripService.getTrip(id) : tripService.listTrips()),
    [id],
    { enabled, fallback: null },
  );

  // Resolve the trip: detail response, or the active/first row from the list.
  let raw;
  if (id) {
    raw = data || null;
  } else {
    const rows = Array.isArray(data) ? data : (data?.results || data?.rows || data?.items || data?.data || []);
    raw = rows.find((tr) => {
      const s = String(tr?.status || tr?.state || '').toLowerCase();
      return s.includes('transit') || s.includes('active') || s.includes('progress');
    }) || rows[0] || null;
  }

  // /app/v1/trips/:id → one ERP trip, scoped to this driver.
  const tripId = raw ? (raw.tripNumber || id || '—') : '';
  const plate = raw?.vehicleNumber || raw?.vehicleId?.registrationNumber || '';
  const subtitle = [tripId, plate].filter(Boolean).join(' · ');
  const status = raw?.state || 'PLACED';
  const routeText = raw ? [raw.fromLocation, raw.toLocation].filter(Boolean).join(' → ') : '';
  const distance = raw?.totalKm != null ? `${Number(raw.totalKm).toLocaleString('en-IN')} km` : '—';
  const litres = raw?.material || '—';
  const advance = raw?.plannedQty != null ? String(raw.plannedQty) : '—';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">Active trip</AppText>
          {subtitle ? <AppText variant="caption" mono muted>{subtitle}</AppText> : null}
        </View>
        {raw ? <StatusBadge status={status} /> : null}
      </View>

      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
      ) : !raw ? (
        <EmptyState icon="cube-outline" title="No active trip" message="You have no trip in progress right now." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {/* Trip figures — what the trip record actually reports. */}
          <Card elevated="sm" padding={16}>
            <View style={styles.cardHead}>
              <AppText variant="label" muted>Trip so far</AppText>
              <StatusBadge status={status === 'CANCELLED' ? 'rejected' : 'in_transit'} label={String(status).replace(/_/g, ' ')} />
            </View>
            <View style={styles.advRow}>
              <View>
                <AppText variant="caption" muted>Distance</AppText>
                <AppText mono variant="h3" weight="semibold">{distance}</AppText>
              </View>
              <View>
                <AppText variant="caption" muted>Material</AppText>
                <AppText mono variant="h3" weight="semibold">{litres}</AppText>
              </View>
            </View>
          </Card>

          {/* Fuel spend on this trip. */}
          <Card elevated="sm" padding={16} style={styles.gap}>
            <View style={styles.cardHead}>
              <AppText variant="bodyStrong" weight="bold">Planned quantity</AppText>
            </View>
            <View style={styles.advRow}>
              <AppText variant="caption" muted>{routeText}</AppText>
              <AppText mono variant="h3" weight="semibold">{advance}</AppText>
            </View>
          </Card>

          {/* Actions */}
          <View style={[styles.actions, styles.gap]}>
            <Button size="lg" icon="cloud-upload-outline" label="Submit consignment note" onPress={() => navigation.navigate('ConsignmentNote')} />
            <Button variant="secondary" size="lg" icon="camera-outline" label="Record POD at delivery" onPress={() => navigation.navigate('Pod')} />
            <Button variant="ghost" size="md" icon="add" label="Add a trip expense" onPress={() => navigation.navigate('AddBill')} />
          </View>

          <WarningBanner tone="info" message="Consignment note is needed before gate out." style={styles.gap} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 14 },
  gap: { marginTop: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  stepper: { marginTop: 2 },
  advRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { gap: 10 },
});
