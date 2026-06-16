import React, { useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchDashboardSummary, fetchMileageIntervals } from '../services/api';
import logger from '../utils/logger';
import { AppText, Card, ScreenHeader, colors, spacing } from '../components/ui';

function KpiCard({ icon, label, value, sub }) {
  return (
    <Card variant="surface" elevated="sm" style={styles.kpiCard}>
      <View style={styles.kpiIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <AppText variant="h2" weight="extrabold" style={{ marginTop: 10 }}>{value}</AppText>
      <AppText variant="small" weight="semibold" muted style={{ marginTop: 2 }}>{label}</AppText>
      {sub ? <AppText variant="caption" muted style={{ marginTop: 2 }}>{sub}</AppText> : null}
    </Card>
  );
}

export default function OwnerOverviewScreen({ navigation }) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState(null);
  const [completedTrips, setCompletedTrips] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [data, mileageRes] = await Promise.all([
        fetchDashboardSummary(token),
        fetchMileageIntervals(token, 1, 200),
      ]);
      setSummary(data?.summaryCards || null);
      // Trips = completed mileage intervals (fuel-to-fuel cycles), not the trip-document workflow count.
      const intervals = Array.isArray(mileageRes?.data) ? mileageRes.data : [];
      setCompletedTrips(intervals.filter((i) => i.status === 'COMPLETED').length);
    } catch (err) {
      logger.error('OwnerOverview', `Error loading dashboard summary: ${err?.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { loadSummary(); }, [loadSummary]));

  const vehicles = summary?.vehicles || {};
  const drivers = summary?.drivers || {};
  const fuel = summary?.fuel || {};

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title={t('owner', 'overviewTitle') || 'Fleet Overview'} subtitle={t('owner', 'overviewSubtitle') || "Today's snapshot"} rounded />

      <View style={styles.sheet}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSummary(true)} tintColor={colors.primary} />}
          >
            <View style={styles.grid}>
              <KpiCard
                icon="car-sport"
                label={t('owner', 'vehicles') || 'Vehicles'}
                value={vehicles.total ?? '—'}
                sub={`${vehicles.onTrip ?? 0} ${t('owner', 'onTrip') || 'on trip'} · ${vehicles.maintenance ?? 0} ${t('owner', 'maintenance') || 'in maintenance'}`}
              />
              <KpiCard
                icon="people"
                label={t('owner', 'drivers') || 'Drivers'}
                value={drivers.total ?? '—'}
                sub={`${drivers.active ?? 0} active`}
              />
              <KpiCard
                icon="navigate"
                label={t('owner', 'trips') || 'Trips'}
                value={completedTrips}
              />
              <KpiCard
                icon="water"
                label={t('owner', 'fuel') || 'Fuel Cost'}
                value={fuel.totalCost != null ? `₹${Math.round(fuel.totalCost).toLocaleString('en-IN')}` : '—'}
                sub={fuel.avgKmpl != null ? `${fuel.avgKmpl.toFixed(1)} km/L avg` : null}
              />
            </View>

            <Card variant="surface" elevated="sm" onPress={() => navigation.navigate('OwnerMileage')} style={styles.mileageLink}>
              <View style={styles.mileageLinkRow}>
                <View style={styles.kpiIcon}>
                  <Ionicons name="speedometer" size={19} color={colors.primary} />
                </View>
                <AppText variant="bodyStrong" weight="bold" style={{ flex: 1, marginLeft: 12 }}>
                  {t('owner', 'mileageLogs') || 'Mileage Logs'}
                </AppText>
                <Ionicons name="chevron-forward" size={19} color="#B7C3BF" />
              </View>
            </Card>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '47%',
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mileageLink: { marginTop: 14 },
  mileageLinkRow: { flexDirection: 'row', alignItems: 'center' },
});
