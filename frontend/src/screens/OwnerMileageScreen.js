import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, ScrollView, Pressable, ActivityIndicator, RefreshControl, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchMileageIntervals } from '../services/api';
import logger from '../utils/logger';
import { AppText, Button, ScreenHeader, colors, spacing, radius } from '../components/ui';

const STATUS_COLOR = { ONGOING: colors.primary, COMPLETED: colors.validText };

export default function OwnerMileageScreen({ navigation }) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [intervals, setIntervals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Applied filters (drive the list) vs. draft filters (edited inside the sheet, committed on Apply)
  const [filter, setFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState('all');
  const [draftVehicleFilter, setDraftVehicleFilter] = useState('all');

  const STATUS_OPTIONS = [
    { key: 'all', label: 'All' },
    { key: 'ONGOING', label: t('owner', 'ongoing') || 'Ongoing' },
    { key: 'COMPLETED', label: t('owner', 'completed') || 'Completed' },
  ];

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetchMileageIntervals(token, 1, 100);
      setIntervals(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      logger.error('OwnerMileage', `Error loading mileage intervals: ${err?.message}`);
      setIntervals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  // Vehicles present in the loaded intervals, for the vehicle filter list
  const vehicleOptions = useMemo(() => {
    const seen = new Map();
    for (const i of intervals) {
      const v = i.vehicleId;
      if (v?._id && !seen.has(String(v._id))) {
        seen.set(String(v._id), { id: String(v._id), label: v.registrationNumber || '—' });
      }
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [intervals]);

  const filteredIntervals = useMemo(() => {
    let list = filter === 'all' ? intervals : intervals.filter((i) => i.status === filter);
    if (vehicleFilter !== 'all') {
      list = list.filter((i) => String(i.vehicleId?._id) === vehicleFilter);
    }
    return [...list].sort((a, b) => dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf());
  }, [intervals, filter, vehicleFilter]);

  const stats = useMemo(() => {
    const distance = filteredIntervals.reduce((s, i) => s + (i.distanceKm || 0), 0);
    const fuel = filteredIntervals.reduce((s, i) => s + (i.fuelConsumedLiters || 0), 0);
    const avgKmpl = fuel > 0 ? distance / fuel : 0;
    return `${Math.round(distance).toLocaleString('en-IN')} km · ${avgKmpl.toFixed(1)} km/L ${t('owner', 'avgMileage') || 'avg'}`;
  }, [filteredIntervals, t]);

  const activeFilterCount = (filter !== 'all' ? 1 : 0) + (vehicleFilter !== 'all' ? 1 : 0);
  const selectedVehicleLabel = vehicleFilter === 'all' ? null : vehicleOptions.find((v) => v.id === vehicleFilter)?.label;

  const openFilterSheet = () => {
    setDraftFilter(filter);
    setDraftVehicleFilter(vehicleFilter);
    setFilterSheetOpen(true);
  };

  const applyFilters = () => {
    setFilter(draftFilter);
    setVehicleFilter(draftVehicleFilter);
    setFilterSheetOpen(false);
  };

  const clearFilters = () => {
    setDraftFilter('all');
    setDraftVehicleFilter('all');
  };

  const renderItem = ({ item }) => {
    const statusColor = STATUS_COLOR[item.status] || colors.textMuted;
    const plate = item.vehicleId?.registrationNumber || '—';
    const dateRange = item.endDate
      ? `${dayjs(item.startDate).format('D MMM')} – ${dayjs(item.endDate).format('D MMM')}`
      : `Since ${dayjs(item.startDate).format('D MMM')}`;
    const distance = item.distanceKm != null ? `${Math.round(item.distanceKm)} km` : '—';
    const mileage = item.mileageKmPerL != null ? `${item.mileageKmPerL.toFixed(1)} km/L` : '—';

    return (
      <View style={styles.card}>
        <View style={styles.iconTile}>
          <Ionicons name="speedometer" size={21} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText mono weight="bold" style={styles.cardMain}>{`${plate} · ${distance}`}</AppText>
          <AppText variant="caption" muted>{dateRange}</AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText mono weight="bold" style={styles.cardMileage}>{mileage}</AppText>
          <AppText variant="small" weight="bold" color={statusColor} style={styles.cardStatus}>
            {item.status === 'COMPLETED' ? (t('owner', 'completed') || 'Completed') : (t('owner', 'ongoing') || 'Ongoing')}
          </AppText>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScreenHeader
        title={t('owner', 'mileageTitle') || 'Mileage Logs'}
        subtitle={loading ? '' : stats}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <View style={styles.sheet}>
        {/* Filter bar */}
        <Pressable style={styles.filterBar} onPress={openFilterSheet}>
          <Ionicons name="options" size={18} color={colors.primary} />
          <AppText variant="bodyStrong" weight="bold" style={{ marginLeft: 8 }}>
            {t('owner', 'filters') || 'Filters'}
          </AppText>
          {filter !== 'all' ? (
            <View style={styles.filterTag}>
              <AppText variant="caption" weight="semibold" color={colors.primary}>
                {STATUS_OPTIONS.find((s) => s.key === filter)?.label}
              </AppText>
            </View>
          ) : null}
          {selectedVehicleLabel ? (
            <View style={styles.filterTag}>
              <AppText mono variant="caption" weight="semibold" color={colors.primary}>
                {selectedVehicleLabel}
              </AppText>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          {activeFilterCount > 0 ? (
            <Pressable onPress={() => { setFilter('all'); setVehicleFilter('all'); }} hitSlop={8}>
              <AppText variant="small" weight="bold" color={colors.textMuted}>
                {t('owner', 'clear') || 'Clear'}
              </AppText>
            </Pressable>
          ) : (
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          )}
        </Pressable>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredIntervals}
            keyExtractor={(item) => String(item._id)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="speedometer-outline" size={56} color={colors.border} />
                <AppText muted center style={{ marginTop: spacing.md }}>{t('owner', 'noMileageLogs') || 'No mileage logs found'}</AppText>
              </View>
            }
          />
        )}
      </View>

      {/* Filter bottom sheet */}
      <Modal visible={filterSheetOpen} transparent animationType="fade" onRequestClose={() => setFilterSheetOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setFilterSheetOpen(false)} />

          <View style={[styles.filterSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.grabber} />

            <View style={styles.filterSheetHeader}>
              <AppText variant="h3" weight="extrabold">{t('owner', 'filters') || 'Filters'}</AppText>
              <Pressable style={styles.closeBtn} onPress={() => setFilterSheetOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
            <AppText variant="label" muted style={styles.sectionLabel}>{t('owner', 'status') || 'Status'}</AppText>
            <View style={styles.optionRow}>
              {STATUS_OPTIONS.map((opt) => {
                const active = draftFilter === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setDraftFilter(opt.key)}
                    style={[styles.optionChip, active ? styles.optionChipActive : styles.optionChipIdle]}
                  >
                    <AppText variant="small" weight={active ? 'bold' : 'semibold'} color={active ? colors.white : colors.text}>
                      {opt.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {vehicleOptions.length > 0 ? (
              <>
                <AppText variant="label" muted style={styles.sectionLabel}>{t('owner', 'vehicles') || 'Vehicle'}</AppText>
                <View style={styles.vehicleList}>
                  <Pressable
                    style={[styles.vehicleRow, draftVehicleFilter === 'all' && styles.vehicleRowSelected]}
                    onPress={() => setDraftVehicleFilter('all')}
                  >
                    <AppText weight={draftVehicleFilter === 'all' ? 'bold' : 'medium'} color={draftVehicleFilter === 'all' ? colors.primary : colors.text}>
                      {t('owner', 'allVehicles') || 'All Vehicles'}
                    </AppText>
                    {draftVehicleFilter === 'all' ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                  </Pressable>
                  {vehicleOptions.map((v) => {
                    const active = draftVehicleFilter === v.id;
                    return (
                      <Pressable
                        key={v.id}
                        style={[styles.vehicleRow, active && styles.vehicleRowSelected]}
                        onPress={() => setDraftVehicleFilter(v.id)}
                      >
                        <AppText mono weight={active ? 'bold' : 'medium'} color={active ? colors.primary : colors.text}>
                          {v.label}
                        </AppText>
                        {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
            </ScrollView>

            <View style={styles.filterSheetFooter}>
              <Button variant="secondary" label={t('owner', 'clear') || 'Clear'} onPress={clearFilters} style={{ flex: 1 }} />
              <Button label={t('owner', 'apply') || 'Apply'} onPress={applyFilters} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
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

  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  filterTag: {
    backgroundColor: colors.tealTint,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 13,
    marginBottom: 11,
    shadowColor: '#102824',
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
  cardMileage: { fontSize: 14 },
  cardStatus: { fontSize: 11, marginTop: 2 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty: { alignItems: 'center', paddingTop: 60 },

  // Filter bottom sheet
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,40,36,0.55)' },
  filterSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
    maxHeight: '85%',
  },
  grabber: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E0E6E3',
    alignSelf: 'center',
    marginBottom: 18,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { marginBottom: 11, marginTop: 6 },
  optionRow: { flexDirection: 'row', gap: 9, marginBottom: 8 },
  optionChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full },
  optionChipActive: { backgroundColor: colors.primary },
  optionChipIdle: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },

  vehicleList: { gap: 8 },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  vehicleRowSelected: { backgroundColor: colors.tealTint, borderColor: colors.primary },

  filterSheetFooter: { flexDirection: 'row', gap: 12, marginTop: 22 },
});
