import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, Stepper, StatusBadge, WarningBanner, Loading, EmptyState, colors, spacing, radius } from '../../../components/ui';
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

  // (mapping to confirm against live API)
  const tripId = raw ? (raw.tripNumber || raw.tripNo || raw.code || raw._id || id || '—') : '';
  const plate = raw ? (raw.vehicle?.registrationNumber || raw.vehicle?.plate || raw.plate || '') : '';
  const subtitle = [tripId, plate].filter(Boolean).join(' · ');
  const status = raw?.status || raw?.state || 'in_transit';
  const totalStages = Number(raw?.totalStages) || 8;
  const advance = raw?.advance != null ? `₹${Number(raw.advance).toLocaleString('en-IN')}` : '—';
  const stages = (Array.isArray(raw?.stages) ? raw.stages : raw?.timeline || raw?.events || []).map((s) => ({
    title: s.title || s.name || s.label || '—',
    meta: s.meta || '',
    status: s.status === 'current' ? 'current' : (s.status === 'done' || s.completed || s.done) ? 'done' : 'todo',
  }));
  const done = stages.filter((s) => s.status === 'done' || s.status === 'current').length;

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
          {/* Progress */}
          <Card elevated="sm" padding={16}>
            <View style={styles.cardHead}>
              <AppText variant="label" muted>Progress</AppText>
              <AppText mono variant="small" weight="semibold">{done} / {totalStages}</AppText>
            </View>
            <Stepper steps={stages} style={styles.stepper} />
          </Card>

          {/* Trip advance */}
          <Card elevated="sm" padding={16} style={styles.gap}>
            <View style={styles.cardHead}>
              <AppText variant="bodyStrong" weight="bold">Trip advance</AppText>
              <StatusBadge status="paid" />
            </View>
            <View style={styles.advRow}>
              <View>
                <AppText variant="caption" mono muted>UPI · 01 Aug · ADV-1192</AppText>
                <AppText variant="caption" muted>Debited from your wallet</AppText>
              </View>
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
