import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, SectionList, Pressable, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchMyFuelLogs, fetchFieldAgentFuelLogs } from '../services/api';
import logger from '../utils/logger';
import { AppText, ScreenHeader, colors, spacing, radius } from '../components/ui';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

export default function FuelHistoryScreen({ navigation }) {
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user?._id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const isFieldAgent = user.role === 'FIELD_AGENT';
      const res = isFieldAgent
        ? await fetchFieldAgentFuelLogs(token, 1, 50)
        : await fetchMyFuelLogs(token, user._id, 1, 50);
      setLogs(res?.data || []);
      logger.info('FuelHistory', `Loaded ${res?.data?.length ?? 0} logs (${isFieldAgent ? 'field-agent' : 'driver'})`);
    } catch (err) {
      logger.warn('FuelHistory', `fetch error: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filter by date range, newest first ──
  const filteredLogs = useMemo(() => {
    let cutoff = null;
    if (filter === 'week') cutoff = dayjs().startOf('week');
    else if (filter === 'month') cutoff = dayjs().startOf('month');
    const list = logs.filter((l) => {
      if (!cutoff) return true;
      return l.refuelTime && dayjs(l.refuelTime).isAfter(cutoff);
    });
    return [...list].sort((a, b) => dayjs(b.refuelTime).valueOf() - dayjs(a.refuelTime).valueOf());
  }, [logs, filter]);

  // ── Aggregate stats for the current filter ──
  const stats = useMemo(() => {
    const litres = filteredLogs.reduce((s, l) => s + (l.litres || 0), 0);
    const amount = filteredLogs.reduce((s, l) => s + (l.totalAmount ?? (l.litres && l.rate ? l.litres * l.rate : 0)), 0);
    const suffix = filter === 'month' ? ' this month' : filter === 'week' ? ' this week' : '';
    return `${litres.toFixed(1)} L${suffix} · ₹${Math.round(amount).toLocaleString('en-IN')}`;
  }, [filteredLogs, filter]);

  // ── Group into Today / Yesterday / date sections ──
  const sections = useMemo(() => {
    const today = dayjs().startOf('day');
    const yesterday = today.subtract(1, 'day');
    const groups = [];
    const indexByLabel = {};
    for (const log of filteredLogs) {
      const d = dayjs(log.refuelTime).startOf('day');
      const label = d.isSame(today, 'day') ? 'Today'
        : d.isSame(yesterday, 'day') ? 'Yesterday'
        : d.format('D MMM YYYY');
      if (indexByLabel[label] == null) {
        indexByLabel[label] = groups.length;
        groups.push({ title: label, data: [] });
      }
      groups[indexByLabel[label]].data.push(log);
    }
    return groups;
  }, [filteredLogs]);

  const renderItem = ({ item }) => {
    const isFull = item.fillingType === 'FULL_TANK';
    const litres = item.litres != null ? `${Number(item.litres).toFixed(1)} L` : '—';
    const type = isFull ? 'Full' : 'Partial';
    const plate = item.vehicleId?.registrationNumber || '—';
    const time = item.refuelTime ? dayjs(item.refuelTime).format('h:mm A') : '';
    const amount = item.totalAmount ?? (item.litres && item.rate ? item.litres * item.rate : null);

    return (
      <View style={styles.card}>
        <View style={styles.iconTile}>
          <Ionicons name="water" size={21} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText mono weight="bold" style={styles.cardMain}>{`${litres} · ${type}`}</AppText>
          <AppText mono variant="caption" muted>{[plate, time].filter(Boolean).join(' · ')}</AppText>
        </View>
        {amount != null ? (
          <AppText mono weight="bold" style={styles.cardAmount}>{`₹${Math.round(amount).toLocaleString('en-IN')}`}</AppText>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScreenHeader
        title={t('fuelHistory', 'title')}
        subtitle={loading ? '' : stats}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.sheet}>
        {/* Filter chips */}
        <View style={styles.chips}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              >
                <AppText variant="small" weight={active ? 'bold' : 'semibold'} color={active ? colors.white : '#5D5D5E'}>
                  {f.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item._id)}
            renderItem={renderItem}
            renderSectionHeader={({ section }) => (
              <AppText variant="label" muted style={styles.sectionHeader}>{section.title}</AppText>
            )}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={56} color={colors.border} />
                <AppText muted center style={{ marginTop: spacing.md }}>{t('fuelHistory', 'noRecords')}</AppText>
              </View>
            }
          />
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
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -16,
    paddingHorizontal: 22,
    paddingTop: 20,
  },

  chips: { flexDirection: 'row', gap: 9, marginBottom: 18 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.full },
  chipActive: { backgroundColor: colors.primary },
  chipIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },

  sectionHeader: { marginBottom: 11, marginTop: 7 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 13,
    marginBottom: 11,
    shadowColor: '#0A1024',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMain: { fontSize: 15 },
  cardAmount: { fontSize: 15 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
});
