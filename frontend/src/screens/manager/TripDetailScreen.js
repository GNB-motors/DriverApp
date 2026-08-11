/**
 * TripDetailScreen.js
 *
 * Detailed view of an ERP trip for Managers/Owners.
 * Shows pipeline progress, full logistics metadata, and related records (Advances, CNs, PODs).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchErpTripById } from '../../services/erpApi';
import { AppText, Card, Badge, colors, spacing, radius } from '../../components/ui';
import VehicleLoader from '../../components/ui/VehicleLoader';

export default function TripDetailScreen({ route, navigation }) {
  const { tripId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrip = useCallback(async (isRefresh = false) => {
    if (!tripId) return;
    if (isRefresh) setRefreshing(true);
    
    try {
      const res = await fetchErpTripById(token, tripId);
      setTrip(res.trip || res.data || res);
    } catch (err) {
      console.warn('Failed to fetch trip detail', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, tripId]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.flex, { justifyContent: 'center', alignItems: 'center' }]}>
        <VehicleLoader visible={true} overlay={false} size={100} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <AppText variant="h2" weight="extrabold">Trip Detail</AppText>
        </View>
        <View style={styles.empty}>
          <AppText variant="body" weight="semibold" muted>Trip not found.</AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h2" weight="extrabold">Trip Detail</AppText>
          <AppText variant="small" muted>LR: {trip.lrNumber || 'Pending'}</AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTrip(true)} />}
      >
        {/* Route Card */}
        <Card elevated="sm" padding={20} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Badge tone="primary" label={`Stage ${trip.pipelineStage || 1}`} />
            <AppText variant="small" muted>{dayjs(trip.createdAt).format('DD MMM YYYY')}</AppText>
          </View>
          <AppText variant="h2" weight="extrabold" style={{ marginBottom: 6 }}>
            {trip.source}  <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />  {trip.destination}
          </AppText>
        </Card>

        {/* Assets Card */}
        <Card padding={16} style={{ marginBottom: 16 }}>
          <AppText variant="label" muted style={{ marginBottom: 12 }}>ASSETS</AppText>
          <InfoRow label="Vehicle" value={trip.vehicle?.registrationNumber || 'Pending'} />
          <InfoRow label="Driver" value={trip.driver ? `${trip.driver.firstName} ${trip.driver.lastName}` : 'Pending'} />
          <InfoRow label="Party" value={trip.party?.name || 'Pending'} border={false} />
        </Card>

        {/* Placement & Freight Card */}
        <Card padding={16} style={{ marginBottom: 16 }}>
          <AppText variant="label" muted style={{ marginBottom: 12 }}>COMMERCIALS</AppText>
          <InfoRow label="Placement Date" value={trip.placement?.placementDate ? dayjs(trip.placement.placementDate).format('DD MMM, hh:mm A') : '—'} />
          <InfoRow label="Supplier" value={trip.placement?.supplier?.name || '—'} />
          <InfoRow label="Fixed Freight" value={trip.placement?.fixedFreight ? `₹${trip.placement.fixedFreight.toLocaleString()}` : '—'} />
          <InfoRow label="Total Advance" value={trip.placement?.totalAdvance ? `₹${trip.placement.totalAdvance.toLocaleString()}` : '—'} border={false} />
        </Card>

        {/* Docs Card */}
        <Card padding={16} style={{ marginBottom: 30 }}>
          <AppText variant="label" muted style={{ marginBottom: 12 }}>DOCUMENTATION</AppText>
          <InfoRow label="Consignments (CN)" value={trip.consignments?.length || 0} />
          <InfoRow label="Advances" value={trip.advances?.length || 0} />
          <InfoRow label="PODs" value={trip.pods?.length || 0} />
          <InfoRow label="Unloading" value={trip.pipelineStage >= 8 ? 'Completed' : 'Pending'} border={false} />
        </Card>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, border = true }) {
  return (
    <View style={[styles.infoRow, border && styles.infoRowBorder]}>
      <AppText variant="small" muted weight="medium">{label}</AppText>
      <AppText variant="bodyStrong" weight="bold">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingBottom: 16, backgroundColor: colors.surface },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
});
