import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Alert,
  Platform,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, BackHeader } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://api.app.gnbedge.in/v1').replace(/\/+$/, '');

function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('file://') ||
    clean.startsWith('data:')
  ) {
    return clean;
  }
  const root = API_BASE.replace(/\/v1$/, '');
  const path = clean.startsWith('/') ? clean : `/${clean}`;
  return `${root}${path}`;
}

function formatINR(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatLitres(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return '—';
  return `${num.toLocaleString('en-IN', { maximumFractionDigits: 1 })} L`;
}

function formatDateTime(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(val);
  }
}

const STATUS_CONFIG = {
  VERIFIED: {
    label: 'Sensor Verified',
    icon: 'checkmark-circle',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    desc: 'Billed diesel matches tank sensor reading within tolerance',
  },
  FLAGGED: {
    label: 'Variance Flagged',
    icon: 'alert-circle',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    desc: 'Billed diesel differs significantly from tank sensor measurement',
  },
  SLIP_ONLY: {
    label: 'Slip Only',
    icon: 'receipt-outline',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    desc: 'Uploaded bill waiting for or without sensor rise detection',
  },
  UNVERIFIED: {
    label: 'Missing Slip',
    icon: 'time-outline',
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
    desc: 'Sensor detected refill, awaiting fuel receipt upload',
  },
  SENSOR_GLITCH: {
    label: 'Sensor Glitch',
    icon: 'pulse-outline',
    color: '#64748B',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    desc: 'Temporary fuel gauge fluctuation filtered by telemetry engine',
  },
};

export default function FleetFuelLogsScreen({ navigation, route = {} }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { service, branchId, data: managerData } = useManagerData();

  // Search & Filter state
  const [search, setSearch] = useState(route?.params?.plate || '');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, VERIFIED, FLAGGED, SLIP_ONLY, UNVERIFIED
  const [fuelTypeFilter, setFuelTypeFilter] = useState('ALL'); // ALL, DIESEL, DEF

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);

  // Selected Log for detail drawer modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Fullscreen receipt image lightbox preview
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Fetch fuel logs from unified endpoint
  const loadFuelLogs = useCallback(async (isRefresh = false) => {
    if (!service) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const bId = branchId === 'all' ? undefined : branchId;

    try {
      const res = await service.unifiedFuelLogs({ limit: 100 }, bId);
      const dataObj = res?.data || res;
      const items = dataObj?.items || dataObj?.records || (Array.isArray(dataObj) ? dataObj : []);
      setLogs(Array.isArray(items) ? items : []);
      if (dataObj?.meta) {
        setMeta(dataObj.meta);
      }
    } catch {
      // Fallback to standard fuel-logs if unified encounters error
      try {
        const fallbackRes = await service.fuelLogs({ limit: 100 }, bId);
        const fallbackItems = fallbackRes?.data?.items || fallbackRes?.data || (Array.isArray(fallbackRes) ? fallbackRes : []);
        setLogs(Array.isArray(fallbackItems) ? fallbackItems : []);
      } catch {
        setLogs([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [service, branchId]);

  useEffect(() => {
    loadFuelLogs();
  }, [loadFuelLogs]);

  // Normalized logs list
  const normalizedLogs = useMemo(() => {
    return logs.map((item) => {
      const slip = item.slip || (item.source === 'SLIP' ? item : null);
      const sensor = item.sensor || (item.source === 'SENSOR' ? item : null);
      const status = String(item.verificationStatus || item.status || 'SLIP_ONLY').toUpperCase();

      const litres = Number(item.litres || slip?.litres || sensor?.litres || 0);
      const amount = Number(slip?.totalAmount || slip?.amount || item.amount || 0);
      const rate = Number(slip?.rate || item.rate || (litres > 0 && amount > 0 ? (amount / litres).toFixed(2) : 0));
      const fuelType = String(slip?.fuelType || item.fuelType || (sensor ? 'DIESEL' : 'DIESEL')).toUpperCase();
      const fillingType = slip?.fillingType || item.fillingType || null;
      const station = slip?.stationName || item.station || item.place?.name || sensor?.fuelPumpName || null;
      const location = slip?.location || item.location || (station ? `${station}` : null);
      const odo = slip?.odometerReading || sensor?.odometer || item.odometerReading || null;
      const odoSource = slip?.odometerSource || (sensor?.odometer != null ? 'FLEETEDGE' : null);
      const driver = slip?.driverName || item.driverName || item.driver?.name || null;
      const date = item.at || item.refuelTime || slip?.createdAt || item.createdAt;

      // Variance between sensor and slip
      const varianceL = sensor?.billVarianceL != null ? Number(sensor.billVarianceL) : null;

      // Receipt image url
      const rawReceiptUrl = slip?.url || slip?.receiptUrl || slip?.fuelImageUrl || item.receipt?.url || item.receiptUrl;
      const receiptUrl = resolveImageUrl(rawReceiptUrl);

      return {
        id: item.id || item._id,
        raw: item,
        vehicleNumber: String(item.vehicleNumber || item.vehicleReg || item.registrationNumber || slip?.vehicleNumber || '').toUpperCase(),
        vehicleModel: item.vehicleModel || item.model || 'Heavy Commercial Vehicle',
        vehicleId: item.vehicleId,
        date,
        status,
        statusConf: STATUS_CONFIG[status] || STATUS_CONFIG.SLIP_ONLY,
        litres,
        amount,
        rate,
        fuelType,
        fillingType,
        station,
        location,
        odo,
        odoSource,
        driver,
        receiptUrl,
        documentId: slip?.documentId,
        sensorLitres: sensor?.litres != null ? Number(sensor.litres) : null,
        varianceL,
      };
    });
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return normalizedLogs.filter((log) => {
      // Search plate / station / driver
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const plateMatch = log.vehicleNumber.toLowerCase().includes(q);
        const stationMatch = (log.station || '').toLowerCase().includes(q);
        const locationMatch = (log.location || '').toLowerCase().includes(q);
        const driverMatch = (log.driver || '').toLowerCase().includes(q);
        if (!plateMatch && !stationMatch && !locationMatch && !driverMatch) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        if (log.status !== statusFilter) return false;
      }

      // Fuel Type Filter
      if (fuelTypeFilter !== 'ALL') {
        if (log.fuelType !== fuelTypeFilter) return false;
      }

      return true;
    });
  }, [normalizedLogs, search, statusFilter, fuelTypeFilter]);

  // Aggregate stats from meta or filtered list
  const stats = useMemo(() => {
    let spend = meta?.spend || 0;
    let litres = meta?.litres || 0;
    let verified = meta?.verified || 0;
    let flagged = meta?.flagged || 0;

    if (!spend || !litres) {
      spend = 0;
      litres = 0;
      verified = 0;
      flagged = 0;
      normalizedLogs.forEach((l) => {
        spend += l.amount;
        litres += l.litres;
        if (l.status === 'VERIFIED') verified++;
        if (l.status === 'FLAGGED') flagged++;
      });
    }

    const avgRate = litres > 0 ? (spend / litres).toFixed(2) : '—';

    return {
      totalRecords: normalizedLogs.length,
      spend,
      litres,
      avgRate,
      verified,
      flagged,
    };
  }, [meta, normalizedLogs]);

  // Open receipt in lightbox
  const handleOpenReceipt = (url) => {
    if (!url) {
      Alert.alert('No Photo', 'No receipt photo is attached to this fuel entry.');
      return;
    }
    setLightboxUrl(url);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* 1. Header */}
      <BackHeader
        title="Fuel Logs & Mileage"
        subtitle="Diesel fills, sensor verification & bills"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            style={s.headerRefreshBtn}
            onPress={() => loadFuelLogs(true)}
            hitSlop={8}
          >
            <Ionicons name="refresh-outline" size={20} color="#1A56DB" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadFuelLogs(true)} />
        }
      >
        {/* 2. Top KPI Summary Strip */}
        <View style={s.kpiGrid}>
          <View style={s.kpiCard}>
            <View style={s.kpiIconWrapBlue}>
              <Ionicons name="wallet-outline" size={18} color="#1A56DB" />
            </View>
            <View>
              <Text style={s.kpiLabel}>Total Spend</Text>
              <Text style={s.kpiValue} numberOfLines={1}>
                {formatINR(stats.spend)}
              </Text>
            </View>
          </View>

          <View style={s.kpiCard}>
            <View style={s.kpiIconWrapGreen}>
              <Ionicons name="water-outline" size={18} color="#059669" />
            </View>
            <View>
              <Text style={s.kpiLabel}>Volume</Text>
              <Text style={s.kpiValue} numberOfLines={1}>
                {formatLitres(stats.litres)}
              </Text>
            </View>
          </View>

          <View style={s.kpiCard}>
            <View style={s.kpiIconWrapEmerald}>
              <Ionicons name="checkmark-done" size={18} color="#10B981" />
            </View>
            <View>
              <Text style={s.kpiLabel}>Verified Fills</Text>
              <Text style={s.kpiValue} numberOfLines={1}>
                {stats.verified}
              </Text>
            </View>
          </View>

          <View style={s.kpiCard}>
            <View style={s.kpiIconWrapAmber}>
              <Ionicons name="alert" size={18} color="#D97706" />
            </View>
            <View>
              <Text style={s.kpiLabel}>Flagged Fills</Text>
              <Text style={s.kpiValue} numberOfLines={1}>
                {stats.flagged}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Search Bar */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by truck plate, pump, driver…"
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* 4. Filter Chips Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          <TouchableOpacity
            style={[s.filterChip, statusFilter === 'ALL' && s.filterChipActive]}
            onPress={() => setStatusFilter('ALL')}
          >
            <Text style={[s.filterChipText, statusFilter === 'ALL' && s.filterChipTextActive]}>
              All Fills ({normalizedLogs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.filterChip, statusFilter === 'VERIFIED' && s.filterChipActiveGreen]}
            onPress={() => setStatusFilter('VERIFIED')}
          >
            <View style={[s.chipDot, { backgroundColor: '#059669' }]} />
            <Text style={[s.filterChipText, statusFilter === 'VERIFIED' && s.filterChipTextGreen]}>
              Verified
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.filterChip, statusFilter === 'FLAGGED' && s.filterChipActiveAmber]}
            onPress={() => setStatusFilter('FLAGGED')}
          >
            <View style={[s.chipDot, { backgroundColor: '#D97706' }]} />
            <Text style={[s.filterChipText, statusFilter === 'FLAGGED' && s.filterChipTextAmber]}>
              Flagged Variance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.filterChip, statusFilter === 'SLIP_ONLY' && s.filterChipActiveBlue]}
            onPress={() => setStatusFilter('SLIP_ONLY')}
          >
            <View style={[s.chipDot, { backgroundColor: '#2563EB' }]} />
            <Text style={[s.filterChipText, statusFilter === 'SLIP_ONLY' && s.filterChipTextBlue]}>
              Slip Only
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.filterChip, statusFilter === 'UNVERIFIED' && s.filterChipActiveOrange]}
            onPress={() => setStatusFilter('UNVERIFIED')}
          >
            <View style={[s.chipDot, { backgroundColor: '#EA580C' }]} />
            <Text style={[s.filterChipText, statusFilter === 'UNVERIFIED' && s.filterChipTextOrange]}>
              Missing Slip
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 5. Fuel Type Sub-Filter */}
        <View style={s.subFilterRow}>
          <Text style={s.subFilterLabel}>Fuel Type:</Text>
          {['ALL', 'DIESEL', 'DEF'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.subChip, fuelTypeFilter === t && s.subChipActive]}
              onPress={() => setFuelTypeFilter(t)}
            >
              <Text style={[s.subChipText, fuelTypeFilter === t && s.subChipTextActive]}>
                {t === 'ALL' ? 'All' : t === 'DIESEL' ? 'Diesel' : 'AdBlue / DEF'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 6. List / Cards Container */}
        {loading && !refreshing ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color="#1A56DB" />
            <Text style={s.loadingText}>Loading fuel logs from server…</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="water-outline" size={44} color="#94A3B8" />
            <Text style={s.emptyTitle}>No Fuel Logs Found</Text>
            <Text style={s.emptySubtitle}>
              {search
                ? `No refuel events matching "${search}".`
                : 'No fuel records exist for the selected filters.'}
            </Text>
            {(search || statusFilter !== 'ALL' || fuelTypeFilter !== 'ALL') && (
              <TouchableOpacity
                style={s.resetFilterBtn}
                onPress={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setFuelTypeFilter('ALL');
                }}
              >
                <Text style={s.resetFilterText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const conf = log.statusConf;
            return (
              <Card key={log.id} padding={0} style={s.fuelCard}>
                {/* Card Header: Plate, Date & Verification Badge */}
                <View style={s.cardHeader}>
                  <View style={s.truckBlock}>
                    <View style={s.plateWrap}>
                      <Text style={s.plateText}>{log.vehicleNumber || 'UNASSIGNED'}</Text>
                    </View>
                    <Text style={s.modelText} numberOfLines={1}>
                      {log.vehicleModel}
                    </Text>
                  </View>

                  <View
                    style={[
                      s.statusBadge,
                      { backgroundColor: conf.bg, borderColor: conf.border },
                    ]}
                  >
                    <Ionicons name={conf.icon} size={13} color={conf.color} />
                    <Text style={[s.statusBadgeText, { color: conf.color }]}>
                      {conf.label}
                    </Text>
                  </View>
                </View>

                {/* Date & Time */}
                <View style={s.dateRow}>
                  <Ionicons name="time-outline" size={13} color="#64748B" />
                  <Text style={s.dateText}>{formatDateTime(log.date)}</Text>
                  {log.fillingType && (
                    <View style={s.fillingTypeBadge}>
                      <Text style={s.fillingTypeText}>
                        {log.fillingType === 'FULL_TANK' ? 'Full Tank' : log.fillingType}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Primary Metrics Grid: Litres, Amount, Rate */}
                <View style={s.metricsRow}>
                  <View style={s.metricItem}>
                    <Text style={s.metricLabel}>Diesel Filled</Text>
                    <Text style={s.metricValueGreen}>{formatLitres(log.litres)}</Text>
                  </View>

                  <View style={s.metricDivider} />

                  <View style={s.metricItem}>
                    <Text style={s.metricLabel}>Total Amount</Text>
                    <Text style={s.metricValueDark}>{formatINR(log.amount)}</Text>
                  </View>

                  <View style={s.metricDivider} />

                  <View style={s.metricItem}>
                    <Text style={s.metricLabel}>Rate / L</Text>
                    <Text style={s.metricValueMuted}>
                      {log.rate ? `₹${log.rate}` : '—'}
                    </Text>
                  </View>
                </View>

                {/* Sensor Reconciliation Strip if sensor exists */}
                {log.sensorLitres != null && (
                  <View style={s.sensorStrip}>
                    <View style={s.sensorLeft}>
                      <Ionicons name="hardware-chip-outline" size={14} color="#475569" />
                      <Text style={s.sensorText}>
                        Sensor rise: <Text style={s.sensorVal}>{formatLitres(log.sensorLitres)}</Text>
                      </Text>
                    </View>
                    {log.varianceL != null && (
                      <View style={s.variancePill}>
                        <Text style={s.varianceLabel}>Variance: </Text>
                        <Text
                          style={[
                            s.varianceVal,
                            { color: Math.abs(log.varianceL) > 5 ? '#D97706' : '#059669' },
                          ]}
                        >
                          {log.varianceL > 0 ? `+${log.varianceL.toFixed(1)} L` : `${log.varianceL.toFixed(1)} L`}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Location / Pump Details */}
                {(log.station || log.location) && (
                  <View style={s.locationRow}>
                    <Ionicons name="location-outline" size={14} color="#64748B" />
                    <Text style={s.locationText} numberOfLines={1}>
                      {log.station || log.location}
                    </Text>
                  </View>
                )}

                {/* Driver & Odometer */}
                <View style={s.footerInfoRow}>
                  {log.driver ? (
                    <View style={s.driverWrap}>
                      <Ionicons name="person-outline" size={13} color="#64748B" />
                      <Text style={s.driverText} numberOfLines={1}>
                        {log.driver}
                      </Text>
                    </View>
                  ) : (
                    <View />
                  )}

                  {log.odo ? (
                    <View style={s.odoWrap}>
                      <Ionicons name="speedometer-outline" size={13} color="#64748B" />
                      <Text style={s.odoText}>{log.odo.toLocaleString('en-IN')} km</Text>
                    </View>
                  ) : null}
                </View>

                {/* Bottom Action Footer: View Slip / View Details */}
                <View style={s.cardFooterRow}>
                  {log.receiptUrl ? (
                    <TouchableOpacity
                      style={s.receiptThumbnailBtn}
                      onPress={() => handleOpenReceipt(log.receiptUrl)}
                    >
                      <Image source={{ uri: log.receiptUrl }} style={s.thumbnailImg} />
                      <Ionicons name="eye-outline" size={14} color="#1A56DB" />
                      <Text style={s.receiptBtnText}>View Receipt</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.noReceiptBox}>
                      <Ionicons name="document-outline" size={14} color="#94A3B8" />
                      <Text style={s.noReceiptText}>No slip uploaded</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={s.inspectDetailBtn}
                    onPress={() => setSelectedLog(log)}
                  >
                    <Text style={s.inspectDetailText}>Inspect</Text>
                    <Ionicons name="chevron-forward" size={14} color="#1A56DB" />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* 7. Detailed Log Drawer / Modal */}
      {selectedLog && (
        <Modal
          visible={Boolean(selectedLog)}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedLog(null)}
        >
          <View style={s.modalOverlay}>
            <View style={[s.modalCard, { maxHeight: '85%', paddingBottom: Math.max(insets.bottom, 16) }]}>
              {/* Modal Header */}
              <View style={s.modalHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.modalPlate}>{selectedLog.vehicleNumber}</Text>
                    <View
                      style={[
                        s.statusBadge,
                        {
                          backgroundColor: selectedLog.statusConf.bg,
                          borderColor: selectedLog.statusConf.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={selectedLog.statusConf.icon}
                        size={12}
                        color={selectedLog.statusConf.color}
                      />
                      <Text style={[s.statusBadgeText, { color: selectedLog.statusConf.color }]}>
                        {selectedLog.statusConf.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.modalSubtitle}>{selectedLog.statusConf.desc}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedLog(null)}
                  style={s.closeModalBtn}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={22} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.modalScroll}>
                {/* Bill Section */}
                <View style={s.inspectorSection}>
                  <View style={s.sectionTitleRow}>
                    <Ionicons name="receipt-outline" size={16} color="#1A56DB" />
                    <Text style={s.sectionTitle}>Billed Fuel Details</Text>
                  </View>

                  <View style={s.inspectorGrid}>
                    <View style={s.inspectorItem}>
                      <Text style={s.inspectorLabel}>Billed Litres</Text>
                      <Text style={s.inspectorVal}>{formatLitres(selectedLog.litres)}</Text>
                    </View>
                    <View style={s.inspectorItem}>
                      <Text style={s.inspectorLabel}>Total Amount</Text>
                      <Text style={s.inspectorVal}>{formatINR(selectedLog.amount)}</Text>
                    </View>
                    <View style={s.inspectorItem}>
                      <Text style={s.inspectorLabel}>Fuel Rate</Text>
                      <Text style={s.inspectorVal}>
                        {selectedLog.rate ? `₹${selectedLog.rate} / L` : '—'}
                      </Text>
                    </View>
                    <View style={s.inspectorItem}>
                      <Text style={s.inspectorLabel}>Filling Mode</Text>
                      <Text style={s.inspectorVal}>
                        {selectedLog.fillingType || 'Full Tank'}
                      </Text>
                    </View>
                    <View style={s.inspectorItemFull}>
                      <Text style={s.inspectorLabel}>Petrol Pump / Station</Text>
                      <Text style={s.inspectorVal}>
                        {selectedLog.station || selectedLog.location || '—'}
                      </Text>
                    </View>
                    <View style={s.inspectorItem}>
                      <Text style={s.inspectorLabel}>Driver</Text>
                      <Text style={s.inspectorVal}>{selectedLog.driver || '—'}</Text>
                    </View>
                    <View style={s.inspectorItem}>
                      <Text style={s.inspectorLabel}>Odometer</Text>
                      <Text style={s.inspectorVal}>
                        {selectedLog.odo ? `${selectedLog.odo.toLocaleString('en-IN')} km` : '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tank Sensor Section */}
                <View style={s.inspectorSection}>
                  <View style={s.sectionTitleRow}>
                    <Ionicons name="hardware-chip-outline" size={16} color="#059669" />
                    <Text style={s.sectionTitle}>Tank Telemetry Sensor</Text>
                  </View>

                  <View style={s.inspectorGrid}>
                    <View style={s.inspectorItem}>
                      <Text style={s.inspectorLabel}>Detected Rise</Text>
                      <Text style={s.inspectorVal}>
                        {selectedLog.sensorLitres != null
                          ? formatLitres(selectedLog.sensorLitres)
                          : 'No Sensor Rise'}
                      </Text>
                    </View>
                    <View style={s.inspectorItem}>
                      <Text style={s.inspectorLabel}>Variance</Text>
                      <Text
                        style={[
                          s.inspectorVal,
                          {
                            color:
                              selectedLog.varianceL == null
                                ? '#475569'
                                : Math.abs(selectedLog.varianceL) > 5
                                ? '#D97706'
                                : '#059669',
                          },
                        ]}
                      >
                        {selectedLog.varianceL != null
                          ? `${selectedLog.varianceL > 0 ? '+' : ''}${selectedLog.varianceL.toFixed(1)} L`
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Receipt Image in Drawer */}
                {selectedLog.receiptUrl && (
                  <View style={s.inspectorSection}>
                    <View style={s.sectionTitleRow}>
                      <Ionicons name="image-outline" size={16} color="#475569" />
                      <Text style={s.sectionTitle}>Fuel Slip Photo</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleOpenReceipt(selectedLog.receiptUrl)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: selectedLog.receiptUrl }}
                        style={s.modalReceiptImage}
                        resizeMode="cover"
                      />
                      <View style={s.zoomHintBar}>
                        <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                        <Text style={s.zoomHintText}>Tap to inspect full photo</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* 8. Fullscreen Photo Lightbox Modal */}
      {lightboxUrl && (
        <Modal
          visible={Boolean(lightboxUrl)}
          animationType="fade"
          transparent
          onRequestClose={() => setLightboxUrl(null)}
        >
          <View style={s.lightboxOverlay}>
            <View style={[s.lightboxHeader, { paddingTop: Math.max(insets.top, 16) }]}>
              <Text style={s.lightboxTitle}>Fuel Slip Document</Text>
              <TouchableOpacity
                style={s.lightboxCloseBtn}
                onPress={() => setLightboxUrl(null)}
                hitSlop={12}
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={s.lightboxImageContainer}>
              <Image
                source={{ uri: lightboxUrl }}
                style={s.lightboxImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRefreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  kpiIconWrapBlue: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconWrapGreen: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconWrapEmerald: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconWrapAmber: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1A56DB',
    borderColor: '#1A56DB',
  },
  filterChipActiveGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  filterChipActiveAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  filterChipActiveBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  filterChipActiveOrange: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextGreen: {
    color: '#059669',
    fontWeight: '700',
  },
  filterChipTextAmber: {
    color: '#D97706',
    fontWeight: '700',
  },
  filterChipTextBlue: {
    color: '#2563EB',
    fontWeight: '700',
  },
  filterChipTextOrange: {
    color: '#EA580C',
    fontWeight: '700',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Sub Filter
  subFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  subChipActive: {
    backgroundColor: '#0F172A',
  },
  subChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  subChipTextActive: {
    color: '#FFFFFF',
  },

  // Cards
  fuelCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  truckBlock: {
    gap: 3,
  },
  plateWrap: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  plateText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    fontSize: 14,
    color: '#0F172A',
  },
  modelText: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  fillingTypeBadge: {
    marginLeft: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fillingTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  metricValueGreen: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  metricValueDark: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricValueMuted: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },

  // Sensor strip
  sensorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sensorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sensorText: {
    fontSize: 12,
    color: '#475569',
  },
  sensorVal: {
    fontWeight: '700',
    color: '#0F172A',
  },
  variancePill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  varianceLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  varianceVal: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },

  // Footer info
  footerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  driverText: {
    fontSize: 12,
    color: '#475569',
  },
  odoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  odoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // Card Footer Actions
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 2,
  },
  receiptThumbnailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thumbnailImg: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  receiptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A56DB',
  },
  noReceiptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noReceiptText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  inspectDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  inspectDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A56DB',
  },

  // Loading & Empty
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  resetFilterBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  resetFilterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A56DB',
  },

  // Inspector Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalPlate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  closeModalBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalScroll: {
    paddingTop: 16,
    gap: 16,
  },
  inspectorSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  inspectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inspectorItem: {
    width: (SCREEN_WIDTH - 84) / 2,
    gap: 2,
  },
  inspectorItemFull: {
    width: '100%',
    gap: 2,
  },
  inspectorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  inspectorVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalReceiptImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  zoomHintBar: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoomHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  lightboxTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  lightboxCloseBtn: {
    padding: 6,
  },
  lightboxImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  lightboxImage: {
    width: SCREEN_WIDTH - 20,
    height: '90%',
  },
});
