import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import {
  AppText,
  Card,
  Badge,
  Button,
  EmptyState,
  Loading,
  BackHeader,
  colors,
  spacing,
  radius,
  elevation,
} from '../../components/ui';
import {
  listKhataDrivers,
  listKhataVehicles,
  getKhataDriverLedger,
  getKhataVehicleLedger,
  getKhataExpenses,
} from '../../services/ownerService';
import { useManagerData } from '../context/ManagerDataContext';
import { useAuth } from '../../context/AuthContext';
import { apiConfigured } from '../../services/client';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const CATEGORY_CONFIG = {
  ALL: { label: 'All', icon: 'grid-outline', color: colors.primary, bg: '#EFF6FF' },
  FUEL: { label: 'Fuel', icon: 'water-outline', color: '#EF4444', bg: '#FEF2F2' },
  FUEL_EXPENSE: { label: 'Fuel', icon: 'water-outline', color: '#EF4444', bg: '#FEF2F2' },
  MAINTENANCE: { label: 'Maintenance', icon: 'construct-outline', color: '#F59E0B', bg: '#FFFBEB' },
  SERVICE: { label: 'Service', icon: 'construct-outline', color: '#F59E0B', bg: '#FFFBEB' },
  REPAIR: { label: 'Repair', icon: 'build-outline', color: '#F59E0B', bg: '#FFFBEB' },
  TRIP: { label: 'Trip', icon: 'navigate-outline', color: '#10B981', bg: '#F0FDF4' },
  TRIP_EXPENSE: { label: 'Trip', icon: 'navigate-outline', color: '#10B981', bg: '#F0FDF4' },
  DRIVER: { label: 'Driver', icon: 'person-outline', color: '#8B5CF6', bg: '#FAF5FF' },
  DRIVER_BILL: { label: 'Driver bill', icon: 'receipt-outline', color: '#8B5CF6', bg: '#FAF5FF' },
  MANUAL: { label: 'Manual', icon: 'document-text-outline', color: '#64748B', bg: '#F8FAFC' },
  MISCELLANEOUS: { label: 'Misc', icon: 'ellipsis-horizontal-circle-outline', color: '#64748B', bg: '#F8FAFC' },
};

export default function KhataLedgerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { token, organization } = useAuth();
  const { branchId, branches } = useManagerData();
  const activeBranch = useMemo(
    () => branches?.find((b) => b.id === branchId || b._id === branchId),
    [branches, branchId]
  );

  // Filters & Navigation state
  const [activeTab, setActiveTab] = useState('DRIVERS'); // DRIVERS | VEHICLES | TRANSACTIONS
  const [rangeFilter, setRangeFilter] = useState('30d'); // 7d | 30d | all
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Primary Data
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Drilldown Modal state
  const [detailModal, setDetailModal] = useState({ open: false, type: null, entity: null });
  const [detailLedger, setDetailLedger] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchKhataData = useCallback(async () => {
    if (!apiConfigured() || !token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError(null);
    try {
      const params = {};
      if (branchId && branchId !== 'all') params.branchId = branchId;
      if (rangeFilter === '7d') {
        params.startDate = dayjs().subtract(7, 'day').startOf('day').toISOString();
      } else if (rangeFilter === '30d') {
        params.startDate = dayjs().subtract(30, 'day').startOf('day').toISOString();
      }

      const [dRes, vRes, tRes] = await Promise.allSettled([
        listKhataDrivers({ ...params, limit: 100 }),
        listKhataVehicles({ ...params, limit: 100 }),
        getKhataExpenses({ ...params, limit: 100, includeTripExpenses: true }),
      ]);

      const driverRows = dRes.status === 'fulfilled' && dRes.value
        ? (dRes.value.results || dRes.value.items || (Array.isArray(dRes.value) ? dRes.value : []))
        : [];
      const vehicleRows = vRes.status === 'fulfilled' && vRes.value
        ? (vRes.value.results || vRes.value.items || (Array.isArray(vRes.value) ? vRes.value : []))
        : [];
      const txRows = tRes.status === 'fulfilled' && tRes.value
        ? (tRes.value.results || tRes.value.items || (Array.isArray(tRes.value) ? tRes.value : []))
        : [];

      setDrivers(driverRows);
      setVehicles(vehicleRows);
      setTransactions(txRows);
    } catch (err) {
      setError(err?.message || 'Could not load khata records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, branchId, rangeFilter]);

  useEffect(() => {
    setLoading(true);
    fetchKhataData();
  }, [fetchKhataData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchKhataData();
  }, [fetchKhataData]);

  // Executive Rollup Metrics
  const summaryKpis = useMemo(() => {
    let total = 0;
    let driverSpend = 0;
    drivers.forEach((d) => {
      driverSpend += Number(d.totalAmount || 0);
    });
    let vehicleSpend = 0;
    vehicles.forEach((v) => {
      vehicleSpend += Number(v.totalAmount || 0);
    });

    if (transactions.length > 0) {
      total = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    } else {
      total = Math.max(driverSpend, vehicleSpend);
    }

    return {
      totalFormatted: money(total),
      driversCount: drivers.length,
      vehiclesCount: vehicles.length,
      transactionsCount: transactions.length,
    };
  }, [drivers, vehicles, transactions]);

  // Open Driver/Vehicle Drilldown Modal
  const openDetail = async (type, entity) => {
    setDetailModal({ open: true, type, entity });
    setDetailLoading(true);
    setDetailLedger([]);
    try {
      let res;
      if (type === 'DRIVER') {
        res = await getKhataDriverLedger(entity._id || entity.driverId);
      } else {
        res = await getKhataVehicleLedger(entity._id || entity.vehicleId);
      }
      const list = res?.results || res?.items || (Array.isArray(res) ? res : []);
      setDetailLedger(list);
    } catch {
      setDetailLedger([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailModal({ open: false, type: null, entity: null });
    setDetailLedger([]);
  };

  // Search filter
  const q = search.trim().toLowerCase();

  const filteredDrivers = useMemo(() => {
    if (!q) return drivers;
    return drivers.filter((d) => {
      const name = `${d.firstName || ''} ${d.lastName || ''} ${d.name || ''}`.toLowerCase();
      const phone = String(d.mobileNumber || d.phone || '');
      return name.includes(q) || phone.includes(q);
    });
  }, [drivers, q]);

  const filteredVehicles = useMemo(() => {
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      const reg = String(v.registrationNumber || v.plate || '').toLowerCase();
      const model = String(v.model || '').toLowerCase();
      return reg.includes(q) || model.includes(q);
    });
  }, [vehicles, q]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (categoryFilter !== 'ALL') {
        const cat = (t.category || t.source || '').toUpperCase();
        if (!cat.includes(categoryFilter)) return false;
      }
      if (!q) return true;
      const title = String(t.title || t.narration || '').toLowerCase();
      const desc = String(t.description || '').toLowerCase();
      const reg = String(t.vehicle?.registrationNumber || '').toLowerCase();
      const driver = String(t.driver?.firstName || t.driver?.name || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || reg.includes(q) || driver.includes(q);
    });
  }, [transactions, categoryFilter, q]);

  const subtitle = [
    organization?.companyName,
    activeBranch?.name,
    rangeFilter === '7d' ? 'Last 7 days' : rangeFilter === '30d' ? 'Last 30 days' : 'All time',
  ].filter(Boolean).join(' · ');

  return (
    <View style={s.screen}>
      {focused && <StatusBar style="dark" />}
      <BackHeader
        title="Khata ledger"
        subtitle={subtitle}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Executive Hero KPI Card */}
        <Card elevated="sm" padding={18} style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={{ gap: 2 }}>
              <AppText variant="caption" weight="semibold" color="#64748B" style={s.eyebrow}>
                FLEET KHATA LEDGER
              </AppText>
              <AppText variant="h1" weight="extrabold" color={colors.text} style={s.heroAmount}>
                {summaryKpis.totalFormatted}
              </AppText>
            </View>

            {/* Time Filter Pills */}
            <View style={s.rangePills}>
              {[
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: 'all', label: 'All' },
              ].map((pill) => {
                const on = rangeFilter === pill.id;
                return (
                  <Pressable
                    key={pill.id}
                    onPress={() => setRangeFilter(pill.id)}
                    style={[s.rangePill, on && s.rangePillOn]}
                  >
                    <AppText
                      variant="caption"
                      weight={on ? 'bold' : 'semibold'}
                      color={on ? colors.white : '#64748B'}
                    >
                      {pill.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={s.heroDivider} />

          {/* Quick Metrics Bar */}
          <View style={s.microMetrics}>
            <View style={s.microMetric}>
              <View style={[s.microIcon, { backgroundColor: '#FAF5FF' }]}>
                <Ionicons name="people" size={14} color="#8B5CF6" />
              </View>
              <View>
                <AppText variant="caption" muted>Drivers</AppText>
                <AppText variant="small" weight="bold">{summaryKpis.driversCount}</AppText>
              </View>
            </View>

            <View style={s.metricSeparator} />

            <View style={s.microMetric}>
              <View style={[s.microIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="bus" size={14} color={colors.primary} />
              </View>
              <View>
                <AppText variant="caption" muted>Trucks</AppText>
                <AppText variant="small" weight="bold">{summaryKpis.vehiclesCount}</AppText>
              </View>
            </View>

            <View style={s.metricSeparator} />

            <View style={s.microMetric}>
              <View style={[s.microIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="receipt" size={14} color="#10B981" />
              </View>
              <View>
                <AppText variant="caption" muted>Records</AppText>
                <AppText variant="small" weight="bold">{summaryKpis.transactionsCount}</AppText>
              </View>
            </View>
          </View>
        </Card>

        {/* Primary Segment Tabs */}
        <View style={s.tabContainer}>
          {[
            { id: 'DRIVERS', label: 'Drivers', icon: 'people-outline', count: drivers.length },
            { id: 'VEHICLES', label: 'Vehicles', icon: 'bus-outline', count: vehicles.length },
            { id: 'TRANSACTIONS', label: 'Transactions', icon: 'receipt-outline', count: transactions.length },
          ].map((tab) => {
            const on = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[s.tabButton, on && s.tabButtonOn]}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={on ? colors.primary : '#64748B'}
                />
                <AppText
                  variant="small"
                  weight={on ? 'bold' : 'semibold'}
                  color={on ? colors.primary : '#475569'}
                >
                  {tab.label}
                </AppText>
                {tab.count > 0 && (
                  <View style={[s.tabCount, on && s.tabCountOn]}>
                    <AppText
                      variant="caption"
                      weight="bold"
                      color={on ? colors.primary : '#64748B'}
                      style={{ fontSize: 11 }}
                    >
                      {tab.count}
                    </AppText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Search Bar */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={s.searchInput}
            placeholder={
              activeTab === 'DRIVERS'
                ? 'Search driver by name or phone...'
                : activeTab === 'VEHICLES'
                ? 'Search truck plate or model...'
                : 'Search narration or description...'
            }
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {/* Category Pills (Visible in Transactions Tab) */}
        {activeTab === 'TRANSACTIONS' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catPillRow}
          >
            {['ALL', 'FUEL', 'DRIVER', 'MAINTENANCE', 'TRIP', 'MANUAL'].map((catKey) => {
              const on = categoryFilter === catKey;
              const cfg = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.MANUAL;
              return (
                <Pressable
                  key={catKey}
                  onPress={() => setCategoryFilter(catKey)}
                  style={[s.catPill, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <AppText
                    variant="caption"
                    weight={on ? 'bold' : 'medium'}
                    color={on ? colors.white : '#475569'}
                  >
                    {cfg.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Content Area */}
        {loading ? (
          <View style={{ paddingVertical: 40 }}>
            <Loading message="Loading khata ledger..." />
          </View>
        ) : error ? (
          <EmptyState
            error
            title="Couldn't load ledger"
            message={error}
            onAction={fetchKhataData}
          />
        ) : activeTab === 'DRIVERS' ? (
          // Drivers Tab
          filteredDrivers.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No drivers found"
              message={search ? 'No drivers match your search.' : 'Driver khata records will appear here.'}
            />
          ) : (
            <View style={s.list}>
              {filteredDrivers.map((driver) => {
                const name = `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || driver.name || 'Unnamed Driver';
                const initial = (name.charAt(0) || 'D').toUpperCase();
                const totalAmt = money(driver.totalAmount);
                const count = driver.entryCount || driver.count || 0;
                const vehiclesAttributed = Object.keys(driver.vehicleSplit || {});

                return (
                  <Card
                    key={driver._id || driver.driverId || name}
                    elevated="sm"
                    padding={14}
                    style={s.itemCard}
                    onPress={() => openDetail('DRIVER', { ...driver, name })}
                  >
                    <View style={s.itemRow}>
                      <View style={s.driverAvatar}>
                        <AppText weight="bold" color="#8B5CF6">{initial}</AppText>
                      </View>

                      <View style={{ flex: 1, gap: 3 }}>
                        <AppText variant="bodyStrong" weight="bold" numberOfLines={1}>
                          {name}
                        </AppText>
                        <AppText variant="caption" color="#64748B" mono>
                          {driver.mobileNumber || 'No mobile linked'}
                        </AppText>

                        {vehiclesAttributed.length > 0 && (
                          <View style={s.tagRow}>
                            {vehiclesAttributed.slice(0, 2).map((plate) => (
                              <View key={plate} style={s.plateTag}>
                                <Ionicons name="bus-outline" size={10} color="#0284C7" />
                                <AppText variant="caption" mono weight="semibold" color="#0369A1" style={{ fontSize: 10 }}>
                                  {plate}
                                </AppText>
                              </View>
                            ))}
                            {vehiclesAttributed.length > 2 && (
                              <AppText variant="caption" muted style={{ fontSize: 10 }}>
                                +{vehiclesAttributed.length - 2} more
                              </AppText>
                            )}
                          </View>
                        )}
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 3 }}>
                        <AppText variant="bodyStrong" weight="extrabold" color={colors.text}>
                          {totalAmt}
                        </AppText>
                        <Badge
                          tone="neutral"
                          label={`${count} ${count === 1 ? 'entry' : 'entries'}`}
                        />
                      </View>

                      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" style={{ marginLeft: 4 }} />
                    </View>
                  </Card>
                );
              })}
            </View>
          )
        ) : activeTab === 'VEHICLES' ? (
          // Vehicles Tab
          filteredVehicles.length === 0 ? (
            <EmptyState
              icon="bus-outline"
              title="No vehicles found"
              message={search ? 'No vehicles match your search.' : 'Truck khata records will appear here.'}
            />
          ) : (
            <View style={s.list}>
              {filteredVehicles.map((vehicle) => {
                const reg = vehicle.registrationNumber || vehicle.plate || 'Unknown Truck';
                const model = vehicle.model || 'Heavy Commercial Vehicle';
                const totalAmt = money(vehicle.totalAmount);
                const count = vehicle.entryCount || vehicle.count || 0;
                const driversAttributed = Object.keys(vehicle.driverSplit || {});

                return (
                  <Card
                    key={vehicle._id || vehicle.vehicleId || reg}
                    elevated="sm"
                    padding={14}
                    style={s.itemCard}
                    onPress={() => openDetail('VEHICLE', { ...vehicle, reg, model })}
                  >
                    <View style={s.itemRow}>
                      <View style={s.truckIconBox}>
                        <Ionicons name="bus" size={18} color={colors.primary} />
                      </View>

                      <View style={{ flex: 1, gap: 3 }}>
                        <AppText variant="bodyStrong" weight="extrabold" mono numberOfLines={1}>
                          {reg}
                        </AppText>
                        <AppText variant="caption" color="#64748B" numberOfLines={1}>
                          {model}
                        </AppText>

                        {driversAttributed.length > 0 && (
                          <View style={s.tagRow}>
                            {driversAttributed.slice(0, 2).map((drv) => (
                              <View key={drv} style={s.driverTag}>
                                <Ionicons name="person-outline" size={10} color="#7C3AED" />
                                <AppText variant="caption" weight="medium" color="#6D28D9" style={{ fontSize: 10 }}>
                                  {drv}
                                </AppText>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 3 }}>
                        <AppText variant="bodyStrong" weight="extrabold" color={colors.text}>
                          {totalAmt}
                        </AppText>
                        <Badge
                          tone="neutral"
                          label={`${count} ${count === 1 ? 'entry' : 'entries'}`}
                        />
                      </View>

                      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" style={{ marginLeft: 4 }} />
                    </View>
                  </Card>
                );
              })}
            </View>
          )
        ) : (
          // Transactions Tab
          filteredTransactions.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No transactions found"
              message={search || categoryFilter !== 'ALL' ? 'No transactions match filters.' : 'Fleet transactions will show here.'}
            />
          ) : (
            <View style={s.list}>
              {filteredTransactions.map((tx, idx) => {
                const catKey = (tx.category || tx.source || 'MANUAL').toUpperCase();
                const cfg = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.MANUAL;
                const title = tx.title || tx.narration || `${cfg.label} expense`;
                const dateStr = tx.expenseDate || tx.createdAt ? dayjs(tx.expenseDate || tx.createdAt).format('DD MMM YYYY') : '';
                const reg = tx.vehicle?.registrationNumber || tx.vehicleId?.registrationNumber;
                const driverName = tx.driver ? `${tx.driver.firstName || ''} ${tx.driver.lastName || ''}`.trim() : null;

                return (
                  <Card key={tx._id || `tx-${idx}`} elevated="sm" padding={14} style={s.itemCard}>
                    <View style={s.itemRow}>
                      <View style={[s.txIconBox, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                      </View>

                      <View style={{ flex: 1, gap: 3 }}>
                        <AppText variant="bodyStrong" weight="bold" numberOfLines={1}>
                          {title}
                        </AppText>

                        {tx.description ? (
                          <AppText variant="caption" color="#64748B" numberOfLines={1}>
                            {tx.description}
                          </AppText>
                        ) : null}

                        <View style={s.tagRow}>
                          {dateStr ? (
                            <AppText variant="caption" mono color="#94A3B8" style={{ fontSize: 11 }}>
                              {dateStr}
                            </AppText>
                          ) : null}
                          {reg ? (
                            <View style={s.plateTag}>
                              <AppText variant="caption" mono weight="semibold" color="#0369A1" style={{ fontSize: 10 }}>
                                {reg}
                              </AppText>
                            </View>
                          ) : null}
                          {driverName ? (
                            <View style={s.driverTag}>
                              <AppText variant="caption" weight="medium" color="#6D28D9" style={{ fontSize: 10 }}>
                                {driverName}
                              </AppText>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 3 }}>
                        <AppText variant="bodyStrong" weight="extrabold" color={colors.text}>
                          {money(tx.amount)}
                        </AppText>
                        <Badge
                          tone={tx.status === 'CONFIRMED' ? 'positive' : tx.status === 'PENDING' ? 'warning' : 'neutral'}
                          label={tx.status || 'RECORDED'}
                        />
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )
        )}
      </ScrollView>

      {/* Drilldown BottomSheet for Driver / Vehicle Itemized Records */}
      <Modal
        visible={detailModal.open}
        transparent
        animationType="slide"
        onRequestClose={closeDetail}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={s.modalFill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={s.scrim} onPress={closeDetail} />
          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={s.sheetHandle} />

            {/* Sheet Header */}
            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" weight="semibold" color="#64748B" style={s.eyebrow}>
                  {detailModal.type === 'DRIVER' ? 'DRIVER KHATA LEDGER' : 'VEHICLE KHATA LEDGER'}
                </AppText>
                <AppText variant="h2" weight="extrabold" numberOfLines={1}>
                  {detailModal.type === 'DRIVER'
                    ? detailModal.entity?.name
                    : detailModal.entity?.reg}
                </AppText>
                <AppText variant="caption" color="#64748B">
                  {detailModal.type === 'DRIVER'
                    ? detailModal.entity?.mobileNumber || 'Driver Ledger Account'
                    : detailModal.entity?.model || 'Vehicle Ledger Account'}
                </AppText>
              </View>

              <Pressable onPress={closeDetail} hitSlop={12} style={s.closeBtn}>
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            {/* Total Spend Badge */}
            <View style={s.sheetTotalBar}>
              <View>
                <AppText variant="caption" color="#475569">Total Recorded Spend</AppText>
                <AppText variant="h2" weight="extrabold" color={colors.primary}>
                  {money(detailModal.entity?.totalAmount)}
                </AppText>
              </View>
              <Badge
                tone="primary"
                label={`${detailModal.entity?.entryCount || detailLedger.length} Records`}
              />
            </View>

            {/* Itemized Entries List */}
            <AppText variant="label" weight="bold" color="#1E293B" style={{ marginTop: 6 }}>
              Itemized Ledger Entries
            </AppText>

            <ScrollView style={s.sheetScroll} showsVerticalScrollIndicator={false}>
              {detailLoading ? (
                <View style={{ paddingVertical: 30 }}>
                  <Loading message="Fetching records..." />
                </View>
              ) : detailLedger.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Ionicons name="receipt-outline" size={32} color="#CBD5E1" />
                  <AppText variant="caption" muted style={{ marginTop: 6 }}>
                    No itemized entries found for this period.
                  </AppText>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {detailLedger.map((item, i) => {
                    const catKey = (item.category || item.source || 'MANUAL').toUpperCase();
                    const cfg = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.MANUAL;
                    const dateStr = item.expenseDate || item.createdAt
                      ? dayjs(item.expenseDate || item.createdAt).format('DD MMM YYYY')
                      : '';
                    const title = item.title || item.narration || `${cfg.label} expense`;

                    return (
                      <View key={item._id || i} style={s.ledgerEntryCard}>
                        <View style={[s.txMiniIcon, { backgroundColor: cfg.bg }]}>
                          <Ionicons name={cfg.icon} size={15} color={cfg.color} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText variant="small" weight="bold" numberOfLines={1}>
                            {title}
                          </AppText>
                          {item.description ? (
                            <AppText variant="caption" color="#64748B" numberOfLines={1}>
                              {item.description}
                            </AppText>
                          ) : null}
                          <AppText variant="caption" mono color="#94A3B8" style={{ fontSize: 10 }}>
                            {dateStr}
                          </AppText>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                          <AppText variant="small" weight="extrabold" color={colors.text}>
                            {money(item.amount)}
                          </AppText>
                          <Badge
                            tone={item.status === 'CONFIRMED' ? 'positive' : 'neutral'}
                            label={item.status || 'CONFIRMED'}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <Button
              label="Close"
              variant="secondary"
              onPress={closeDetail}
              style={{ marginTop: 10 }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    ...elevation.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    letterSpacing: 0.8,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  rangePills: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  rangePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  rangePillOn: {
    backgroundColor: colors.primary,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  microMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  microMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  microIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricSeparator: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 5,
  },
  tabButtonOn: {
    backgroundColor: '#FFFFFF',
    ...elevation.sm,
  },
  tabCount: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabCountOn: {
    backgroundColor: '#DBEAFE',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 0,
  },
  catPillRow: {
    gap: 8,
    paddingVertical: 2,
  },
  catPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  list: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...elevation.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  truckIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  plateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  driverTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  // Modal Sheet Styles
  modalFill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
    gap: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTotalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetScroll: {
    maxHeight: 280,
  },
  ledgerEntryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  txMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
