import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Button,
  Card,
  StatusBadge,
  SkeletonCard,
  EmptyState,
  SegmentedControl,
  colors,
  spacing,
  radius,
} from '../../../components/ui';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { apiConfigured } from '../../../services/client';
import { useApi } from '../../../hooks/useApi';
import fuelService from '../../../services/fuelService';

/**
 * Fuel Log Screen — dedicated for Field Agents & Drivers.
 * Real data only; mileage trend card removed for Field Agents.
 */
export default function FuelLogScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, organization, token } = useAuth();
  const { t } = useLanguage();
  const c = (key, fallback) => t('fieldAgent', key) || fallback;

  const enabled = apiConfigured() && !!token;
  const isFieldAgent = user?.role === 'FIELD_AGENT';

  // Scope toggle: "My Uploads" vs "All Fleet"
  const [scope, setScope] = useState(isFieldAgent ? 'mine' : 'all');

  const queryParams = useMemo(() => {
    if (scope === 'mine' && user?._id) {
      return { driverId: user._id };
    }
    return {};
  }, [scope, user?._id]);

  const { data, loading, error, refetch } = useApi(
    () => fuelService.listFuelLogs(queryParams),
    [scope, user?._id],
    { enabled }
  );

  const rows = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }, [data]);

  const { kpis, history, isEmpty } = useMemo(() => {
    const when = (f) => f?.refuelTime || f?.createdAt;

    const totalLitres = rows.reduce((n, f) => n + (Number(f?.litres) || 0), 0);
    const totalSpend = rows.reduce((n, f) => n + (Number(f?.totalAmount) || 0), 0);

    return {
      kpis: [
        {
          label: c('totalLitres', 'Litres'),
          value: rows.length ? `${Math.round(totalLitres)} L` : '0 L',
        },
        {
          label: c('totalSpend', 'Spend'),
          value: rows.length ? `₹${totalSpend.toLocaleString('en-IN')}` : '₹0',
        },
        {
          label: c('totalFills', 'Receipts'),
          value: String(rows.length),
        },
      ],
      history: rows.map((f, i) => {
        const vehicleNum =
          f?.vehicleId?.registrationNumber ||
          f?.vehicleId?.vehicleNumber ||
          f?.vehicleNumber ||
          '—';
        return {
          id: f?._id || String(i),
          vehicleNumber: vehicleNum,
          litres: f?.litres != null ? `${Number(f.litres).toFixed(1)} L` : '',
          status: 'captured',
          statusLabel: f?.fillingType === 'FULL_TANK' ? 'Full Tank' : 'Partial',
          fuelType: f?.fuelType || 'DIESEL',
          meta: [
            when(f) ? dayjs(when(f)).format('DD MMM, hh:mm A') : null,
            f?.location || null,
          ].filter(Boolean).join(' · '),
          amount: f?.totalAmount != null ? `₹${Number(f.totalAmount).toLocaleString('en-IN')}` : '',
        };
      }),
      isEmpty: rows.length === 0,
    };
  }, [rows, c]);

  const company = organization?.companyName || organization?.name || '';
  const currentMonth = dayjs().format('MMMM YYYY');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <AppText variant="h3" weight="extrabold">
              {c('fuelLogs', 'Fuel logs')}
            </AppText>
            <AppText variant="caption" muted numberOfLines={1}>
              {company ? `${company} · ` : ''}{currentMonth}
            </AppText>
          </View>
        </View>

        {/* Scope selector */}
        {isFieldAgent ? (
          <View style={styles.scopeWrap}>
            <SegmentedControl
              options={[c('myUploads', 'My Uploads'), c('allFleet', 'All Fleet')]}
              value={scope === 'mine' ? c('myUploads', 'My Uploads') : c('allFleet', 'All Fleet')}
              onChange={(val) => setScope(val === c('allFleet', 'All Fleet') ? 'all' : 'mine')}
            />
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Real KPIs Summary */}
        <View style={styles.kpiRow}>
          {kpis.map((k) => (
            <Card key={k.label} elevated="sm" padding={12} style={styles.kpi}>
              <AppText variant="caption" muted numberOfLines={1}>
                {k.label}
              </AppText>
              <AppText mono variant="bodyStrong" weight="bold" numberOfLines={1}>
                {k.value}
              </AppText>
            </Card>
          ))}
        </View>

        {/* Quick Action Button */}
        <Button
          size="md"
          label={c('uploadReceipt', 'Upload Receipt')}
          onPress={() => navigation.navigate(isFieldAgent ? 'VehiclePicker' : 'FuelCapture')}
        />

        {/* Uploads History */}
        <View style={styles.sectionHead}>
          <AppText variant="label" muted>
            {scope === 'mine'
              ? c('recentUploads', 'My Recent Uploads')
              : c('allFleet', 'Fleet Fuel History')}
          </AppText>
          <AppText variant="caption" muted>
            {rows.length} {rows.length === 1 ? 'record' : 'records'}
          </AppText>
        </View>

        {loading && rows.length === 0 ? (
          <SkeletonCard count={4} />
        ) : error ? (
          <EmptyState
            error
            title={c('couldNotLoad', "Couldn't load")}
            message={c('checkConnection', 'Check your connection and try again.')}
            onAction={refetch}
            style={styles.gap}
          />
        ) : isEmpty ? (
          <EmptyState
            icon="water-outline"
            title={c('noFuelRecords', 'No fuel records found')}
            message={c(
              'noFuelRecordsPrompt',
              'Tap "Upload Receipt" above to log your first fuel bill.'
            )}
            style={styles.gap}
          />
        ) : (
          <Card padding={0} elevated="sm" style={styles.gap}>
            {history.map((h, i) => (
              <View key={h.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.histRow}>
                  <View style={styles.histIcon}>
                    <Ionicons name="water" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.histTop}>
                      <AppText variant="bodyStrong" weight="bold">
                        {h.vehicleNumber}
                      </AppText>
                      <StatusBadge status={h.status} label={h.statusLabel} />
                    </View>
                    <AppText variant="caption" muted numberOfLines={1}>
                      {h.meta || h.fuelType}
                    </AppText>
                  </View>
                  <View style={styles.histRight}>
                    <AppText mono variant="bodyStrong" weight="bold">
                      {h.amount || '—'}
                    </AppText>
                    <AppText variant="caption" muted>
                      {h.litres}
                    </AppText>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeWrap: {
    marginTop: 2,
  },
  scroll: {
    padding: 18,
    gap: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpi: {
    flex: 1,
    gap: 4,
    borderRadius: radius.md,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  gap: { marginTop: 4 },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  histIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  histTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  histRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },
});
