import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { AppText, Card, Stepper, StatusBadge, KeyValueTable, KeyValueRow, Loading, EmptyState, colors, spacing, radius } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import tripService from '../../../services/tripService';

/**
 * 05 · Trip detail — closed & settled. Real data only.
 */
export default function TripDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const id = route?.params?.id;
  const { token } = useAuth();
  const enabled = apiConfigured() && !!token && !!id;
  const { data, loading, error, refetch } = useApi(() => tripService.getTrip(id), [id], { enabled, fallback: null });

  // Map the trip → the detail shape this screen renders.
  // /app/v1/trips/:id → one ERP trip, scoped to this driver.
  const t = data && {
    id: data.tripNumber || (id || '—'),
    route: [
      [data.fromLocation, data.toLocation].filter(Boolean).join(' → '),
      data.tripDate && dayjs(data.tripDate).isValid() ? dayjs(data.tripDate).format('DD MMM') : null,
    ].filter(Boolean).join(' · ') || '—',
    status: data.state || '',
    timeline: [],
    summary: [
      { label: 'Vehicle', value: data.vehicleNumber || data.vehicleId?.registrationNumber || '—' },
      { label: 'Material', value: data.material || '—' },
      { label: 'Planned qty', value: data.plannedQty != null ? String(data.plannedQty) : '—' },
      { label: 'Loaded qty', value: data.loadedQty != null ? String(data.loadedQty) : '—' },
      { label: 'Distance', value: data.totalKm != null ? `${Number(data.totalKm).toLocaleString('en-IN')} km` : '—' },
      { label: 'Party', value: data.partyId?.name || '—' },
      { label: 'Delivery order', value: data.doId?.doNumber || '—' },
    ],
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText mono variant="h3" weight="semibold">{t?.id ?? 'Trip'}</AppText>
          {t?.route ? <AppText variant="caption" muted>{t.route}</AppText> : null}
        </View>
        {t?.status ? <StatusBadge status={t.status} /> : null}
      </View>

      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState error title="Couldn't load" message="Check your connection and try again." onAction={refetch} />
      ) : !t ? (
        <EmptyState icon="cube-outline" title="Trip not found" message="This trip could not be loaded." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {t.timeline.length ? (
            <Card elevated="sm" padding={16}>
              <AppText variant="label" muted style={{ marginBottom: 12 }}>Route</AppText>
              <Stepper steps={t.timeline} />
            </Card>
          ) : null}

          <KeyValueTable style={styles.gap}>
            {t.summary.map((s) => (
              <KeyValueRow key={s.label} label={s.label} value={s.value} mono valueColor={s.color === 'success' ? colors.success : undefined} />
            ))}
            <KeyValueRow label="Trip earning" value={t.earning} mono highlight valueColor={colors.success} />
          </KeyValueTable>

          <Card elevated="sm" padding={16} style={styles.gap}>
            <AppText variant="label" muted style={{ marginBottom: 12 }}>Documents</AppText>
            <View style={styles.docRow}>
              {t.docs.map((d) => (
                <View key={d.label} style={styles.docTile}>
                  <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                  <AppText variant="small" weight="bold">{d.label}</AppText>
                  <AppText variant="caption" mono muted>{d.sub}</AppText>
                </View>
              ))}
            </View>
          </Card>
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
  docRow: { flexDirection: 'row', gap: 10 },
  docTile: {
    flex: 1, backgroundColor: colors.background, borderRadius: radius.md, paddingVertical: 16, gap: 6,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
});
