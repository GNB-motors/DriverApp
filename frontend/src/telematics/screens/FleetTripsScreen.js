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
  Alert,
  Platform,
  RefreshControl,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, BackHeader } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatDateTime(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(val);
  }
}

function formatKm(km) {
  const num = Number(km);
  if (!Number.isFinite(num)) return '—';
  return `${Math.round(num).toLocaleString('en-IN')} km`;
}

function formatDuration(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return null;
  const h = Math.floor(m / 60);
  const rem = Math.round(m % 60);
  if (h === 0) return `${rem}m`;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

const STATUS_CONFIG = {
  COMPLETE: {
    label: 'Delivered',
    icon: 'checkmark-circle',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  OPEN: {
    label: 'On the road',
    icon: 'navigate',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  NEEDS_REVIEW: {
    label: 'Needs your answer',
    icon: 'help-circle',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  CONFIRMED: {
    label: 'Confirmed',
    icon: 'shield-checkmark',
    color: '#10B981',
    bg: '#F0FDF4',
    border: '#BBF7D0',
  },
  DISMISSED: {
    label: 'Rejected',
    icon: 'close-circle',
    color: '#64748B',
    bg: '#F8FAFC',
    border: '#E2E8F0',
  },
  PLANNED: {
    label: 'Planned',
    icon: 'calendar',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
};

export default function FleetTripsScreen({ navigation, route = {} }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { service, branchId, data: managerData } = useManagerData();

  // Search & Filter state
  const targetPlate = route?.params?.plate || '';
  const targetVehicleId = route?.params?.vehicleId || null;

  const [search, setSearch] = useState(targetPlate);
  const [selectedTab, setSelectedTab] = useState('ALL'); // ALL, COMPLETE, OPEN, NEEDS_REVIEW
  const [timePreset, setTimePreset] = useState('ALL_TIME'); // ALL_TIME, TODAY, 7_DAYS, 30_DAYS

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState([]);
  const [tabCounts, setTabCounts] = useState(null);
  const [page, setPage] = useState(1);

  // Modals
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [missedTripModalOpen, setMissedTripModalOpen] = useState(false);

  // Schedule Trip Form
  const [scheduleForm, setScheduleForm] = useState({
    vehicleId: '',
    driverId: '',
    pickupName: '',
    dropName: '',
    startAt: '',
    endAt: '',
    note: '',
    submitting: false,
    error: '',
  });

  // Missed Trip Form
  const [missedForm, setMissedForm] = useState({
    vehicleId: '',
    driverId: '',
    startAt: '',
    endAt: '',
    pickupName: '',
    dropName: '',
    km: '',
    note: '',
    submitting: false,
    error: '',
  });

  // Calculate time bounds based on timePreset
  const timeBounds = useMemo(() => {
    const now = new Date();
    if (timePreset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: start.toISOString(), to: now.toISOString() };
    }
    if (timePreset === '7_DAYS') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    if (timePreset === '30_DAYS') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    return { from: undefined, to: undefined };
  }, [timePreset]);

  // Load Trips
  const loadTrips = useCallback(async (isRefresh = false) => {
    if (!service) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const bId = branchId === 'all' ? undefined : branchId;

    try {
      const params = {
        page: 1,
        limit: 100,
        withCounts: '1',
      };

      if (selectedTab !== 'ALL') {
        params.status = selectedTab;
      }

      if (timeBounds.from) params.from = timeBounds.from;
      if (timeBounds.to) params.to = timeBounds.to;
      if (targetVehicleId) params.vehicleId = targetVehicleId;

      let res;
      if (typeof service.autoTrips === 'function') {
        res = await service.autoTrips(params, bId);
      } else {
        res = await service.listTrips(1, bId, targetVehicleId);
      }

      const items = res?.items || (Array.isArray(res) ? res : []);
      setTrips(items);
      if (res?.tabCounts) {
        setTabCounts(res.tabCounts);
      }
    } catch {
      // Fallback
      try {
        const fallback = await service.listTrips(1, bId, targetVehicleId);
        setTrips(fallback?.items || []);
      } catch {
        setTrips([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [service, branchId, selectedTab, timeBounds, targetVehicleId]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  // Available vehicles and drivers for pickers
  const vehiclesList = useMemo(() => {
    return Array.isArray(managerData?.vehicles) ? managerData.vehicles : [];
  }, [managerData]);

  const driversList = useMemo(() => {
    return Array.isArray(managerData?.drivers) ? managerData.drivers : [];
  }, [managerData]);

  // Vehicles lookup
  const vehicleMap = useMemo(() => {
    const map = new Map();
    vehiclesList.forEach((v) => {
      map.set(String(v.id || v._id), v);
      if (v.plate) map.set(String(v.plate).toUpperCase().replace(/\s+/g, ''), v);
    });
    return map;
  }, [vehiclesList]);

  // Normalized Trips
  const normalizedTrips = useMemo(() => {
    return trips.map((trip) => {
      const vId = String(trip.vehicleId || trip.vehicle?._id || '');
      const matchedVeh = vehicleMap.get(vId) || trip.vehicle || null;
      const plate = String(
        trip.registrationNumber ||
        trip.vehicleNumber ||
        trip.plate ||
        matchedVeh?.plate ||
        matchedVeh?.registrationNumber ||
        'UNKNOWN'
      ).toUpperCase();

      const model = trip.vehicleModel || matchedVeh?.model || 'Commercial Vehicle';

      const status = String(trip.status || 'OPEN').toUpperCase();
      const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;

      const fromName = trip.from || trip.pickup?.name || trip.pickup?.address || 'Origin Plant';
      const toName =
        trip.to ||
        trip.drop?.name ||
        trip.drop?.areaName ||
        trip.drop?.address ||
        (status === 'OPEN' ? 'In transit to destination' : 'Destination Unspecified');

      const departedAt = trip.startedAt || trip.pickup?.departedAt || trip.pickup?.arrivedAt || trip.createdAt;
      const arrivedAt = trip.drop?.arrivedAt || trip.arrivedAt || null;

      const km = trip.distanceKm ?? trip.km?.laden ?? trip.km?.total ?? null;
      const durationMin =
        trip.durationMinutes ||
        (departedAt && arrivedAt
          ? Math.round((new Date(arrivedAt).getTime() - new Date(departedAt).getTime()) / 60000)
          : null);

      const driverName =
        trip.driver?.name ||
        (trip.driver ? `${trip.driver.firstName || ''} ${trip.driver.lastName || ''}`.trim() : null) ||
        null;
      const driverPhone = trip.driver?.phone || trip.driver?.mobileNumber || null;

      const stopsCount = Array.isArray(trip.stops) ? trip.stops.length : null;

      return {
        id: trip.id || trip._id,
        raw: trip,
        plate,
        model,
        status,
        statusConf,
        fromName,
        toName,
        departedAt,
        arrivedAt,
        km,
        durationMin,
        driverName,
        driverPhone,
        material: trip.material,
        tonnage: trip.tonnage,
        leg: trip.leg,
        sap: trip.sap,
        stopsCount,
      };
    });
  }, [trips, vehicleMap]);

  // Filtered trips by search query
  const filteredTrips = useMemo(() => {
    if (!search.trim()) return normalizedTrips;
    const q = search.trim().toLowerCase();
    return normalizedTrips.filter((t) => {
      const pMatch = t.plate.toLowerCase().includes(q);
      const fMatch = t.fromName.toLowerCase().includes(q);
      const toMatch = t.toName.toLowerCase().includes(q);
      const dMatch = (t.driverName || '').toLowerCase().includes(q);
      return pMatch || fMatch || toMatch || dMatch;
    });
  }, [normalizedTrips, search]);

  // KPI Counts & Typical Loaded Run
  const kpiData = useMemo(() => {
    let all = tabCounts?.total ?? normalizedTrips.length;
    let delivered = tabCounts?.COMPLETE ?? 0;
    let open = tabCounts?.OPEN ?? 0;
    let review = tabCounts?.NEEDS_REVIEW ?? 0;

    if (!tabCounts) {
      all = normalizedTrips.length;
      delivered = normalizedTrips.filter((t) => t.status === 'COMPLETE' || t.status === 'CONFIRMED').length;
      open = normalizedTrips.filter((t) => t.status === 'OPEN').length;
      review = normalizedTrips.filter((t) => t.status === 'NEEDS_REVIEW').length;
    }

    // Typical loaded run (median km of delivered runs)
    const deliveredKms = normalizedTrips
      .filter((t) => (t.status === 'COMPLETE' || t.status === 'CONFIRMED') && t.km > 0)
      .map((t) => t.km)
      .sort((a, b) => a - b);

    let typicalKm = null;
    if (deliveredKms.length > 0) {
      const mid = Math.floor(deliveredKms.length / 2);
      typicalKm = deliveredKms[mid];
    }

    return {
      all,
      delivered,
      open,
      review,
      typicalKm,
    };
  }, [tabCounts, normalizedTrips]);

  // Handle Schedule Trip Submit
  const handleScheduleSubmit = async () => {
    if (!scheduleForm.vehicleId) {
      setScheduleForm((prev) => ({ ...prev, error: 'Please select a vehicle.' }));
      return;
    }
    if (!scheduleForm.pickupName.trim() || !scheduleForm.dropName.trim()) {
      setScheduleForm((prev) => ({ ...prev, error: 'Please enter pickup and drop locations.' }));
      return;
    }

    setScheduleForm((prev) => ({ ...prev, submitting: true, error: '' }));
    const bId = branchId === 'all' ? undefined : branchId;

    try {
      const now = new Date();
      const startAt = scheduleForm.startAt ? new Date(scheduleForm.startAt).toISOString() : now.toISOString();
      const endAt = scheduleForm.endAt
        ? new Date(scheduleForm.endAt).toISOString()
        : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const body = {
        vehicleId: scheduleForm.vehicleId,
        driverId: scheduleForm.driverId || undefined,
        pickup: { name: scheduleForm.pickupName.trim() },
        drop: { name: scheduleForm.dropName.trim() },
        plannedStartAt: startAt,
        plannedEndAt: endAt,
        note: scheduleForm.note.trim() || undefined,
      };

      await service.createTripPlan(body, bId);
      Alert.alert('Trip Scheduled', 'Trip plan created successfully. Telematics will link GPS runs automatically.');
      setScheduleModalOpen(false);
      setScheduleForm({
        vehicleId: '',
        driverId: '',
        pickupName: '',
        dropName: '',
        startAt: '',
        endAt: '',
        note: '',
        submitting: false,
        error: '',
      });
      loadTrips(true);
    } catch (err) {
      setScheduleForm((prev) => ({ ...prev, submitting: false, error: err?.message || 'Could not schedule trip.' }));
    }
  };

  // Handle Add Missed Trip Submit
  const handleMissedTripSubmit = async () => {
    if (!missedForm.vehicleId) {
      setMissedForm((prev) => ({ ...prev, error: 'Please select a vehicle.' }));
      return;
    }
    if (!missedForm.pickupName.trim() || !missedForm.dropName.trim()) {
      setMissedForm((prev) => ({ ...prev, error: 'Please enter pickup and drop locations.' }));
      return;
    }

    setMissedForm((prev) => ({ ...prev, submitting: true, error: '' }));
    const bId = branchId === 'all' ? undefined : branchId;

    try {
      const now = new Date();
      const startAt = missedForm.startAt
        ? new Date(missedForm.startAt).toISOString()
        : new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();
      const endAt = missedForm.endAt ? new Date(missedForm.endAt).toISOString() : now.toISOString();

      const body = {
        vehicleId: missedForm.vehicleId,
        driverId: missedForm.driverId || undefined,
        startAt,
        endAt,
        pickup: { name: missedForm.pickupName.trim() },
        drop: { name: missedForm.dropName.trim() },
        km: missedForm.km ? Number(missedForm.km) : undefined,
        note: missedForm.note.trim() || undefined,
      };

      await service.addManualTrip(body, bId);
      Alert.alert('Trip Added', 'Missed trip added successfully and saved to fleet history.');
      setMissedTripModalOpen(false);
      setMissedForm({
        vehicleId: '',
        driverId: '',
        startAt: '',
        endAt: '',
        pickupName: '',
        dropName: '',
        km: '',
        note: '',
        submitting: false,
        error: '',
      });
      loadTrips(true);
    } catch (err) {
      setMissedForm((prev) => ({ ...prev, submitting: false, error: err?.message || 'Could not add manual trip.' }));
    }
  };

  // 30-Day GPS Recovery Backfill
  const handleBackfill = async () => {
    if (!missedForm.vehicleId) {
      Alert.alert('Select Truck', 'Please choose the vehicle first to recover past trips.');
      return;
    }
    const bId = branchId === 'all' ? undefined : branchId;
    try {
      await service.backfillVehicleTrips(missedForm.vehicleId, bId);
      Alert.alert(
        'GPS Recovery Started',
        'Reading this truck’s last 30 days of telemetry. Historical trips will appear shortly.'
      );
      setMissedTripModalOpen(false);
    } catch (err) {
      Alert.alert('Notice', err?.message || 'Could not start GPS backfill for this truck.');
    }
  };

  return (
    <View style={s.container}>
      {/* 1. Header */}
      <BackHeader
        title="Fleet Trips"
        subtitle="GPS-detected journeys & live routes"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            style={s.headerRefreshBtn}
            onPress={() => loadTrips(true)}
            hitSlop={8}
          >
            <Ionicons name="refresh-outline" size={20} color="#1A56DB" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTrips(true)} />}
      >
        {/* 2. Top 5 KPI Strip / Status Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.kpiStripRow}
        >
          {/* Tile 1: Trips (All) */}
          <TouchableOpacity
            style={[s.kpiTab, selectedTab === 'ALL' && s.kpiTabSelected]}
            onPress={() => setSelectedTab('ALL')}
            activeOpacity={0.8}
          >
            <Text style={s.kpiLabel}>Trips</Text>
            <Text style={s.kpiValue}>{kpiData.all}</Text>
            <Text style={s.kpiSub}>left a plant</Text>
          </TouchableOpacity>

          {/* Tile 2: Delivered */}
          <TouchableOpacity
            style={[s.kpiTab, selectedTab === 'COMPLETE' && s.kpiTabSelected]}
            onPress={() => setSelectedTab('COMPLETE')}
            activeOpacity={0.8}
          >
            <View style={s.labelWithDot}>
              <View style={[s.kpiDot, { backgroundColor: '#059669' }]} />
              <Text style={s.kpiLabel}>Delivered</Text>
            </View>
            <Text style={[s.kpiValue, { color: '#059669' }]}>{kpiData.delivered}</Text>
            <Text style={s.kpiSub}>
              {kpiData.all > 0 ? `${Math.round((kpiData.delivered / kpiData.all) * 100)}% of trips` : 'completed'}
            </Text>
          </TouchableOpacity>

          {/* Tile 3: On the road */}
          <TouchableOpacity
            style={[s.kpiTab, selectedTab === 'OPEN' && s.kpiTabSelected]}
            onPress={() => setSelectedTab('OPEN')}
            activeOpacity={0.8}
          >
            <View style={s.labelWithDot}>
              <View style={[s.kpiDot, { backgroundColor: '#2563EB' }]} />
              <Text style={s.kpiLabel}>On the road</Text>
            </View>
            <Text style={[s.kpiValue, { color: '#2563EB' }]}>{kpiData.open}</Text>
            <Text style={s.kpiSub}>no drop yet</Text>
          </TouchableOpacity>

          {/* Tile 4: Needs your answer */}
          <TouchableOpacity
            style={[s.kpiTab, selectedTab === 'NEEDS_REVIEW' && s.kpiTabSelected]}
            onPress={() => setSelectedTab('NEEDS_REVIEW')}
            activeOpacity={0.8}
          >
            <View style={s.labelWithDot}>
              <View style={[s.kpiDot, { backgroundColor: '#D97706' }]} />
              <Text style={s.kpiLabel}>Needs answer</Text>
            </View>
            <Text style={[s.kpiValue, { color: '#D97706' }]}>{kpiData.review}</Text>
            <Text style={s.kpiSub}>{kpiData.review > 0 ? 'drop review' : 'all clean'}</Text>
          </TouchableOpacity>

          {/* Tile 5: Typical loaded run */}
          <View style={s.kpiTabRun}>
            <Text style={s.kpiLabel}>Typical Run</Text>
            <Text style={s.kpiValue}>{kpiData.typicalKm ? formatKm(kpiData.typicalKm) : '—'}</Text>
            <Text style={s.kpiSub}>median loaded run</Text>
          </View>
        </ScrollView>

        {/* 3. Action Buttons Row: Schedule Trip & Add Missed Trip */}
        <View style={s.actionBtnRow}>
          <TouchableOpacity
            style={s.scheduleBtn}
            onPress={() => setScheduleModalOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
            <Text style={s.scheduleBtnText}>Schedule Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.missedTripBtn}
            onPress={() => setMissedTripModalOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={16} color="#1A56DB" />
            <Text style={s.missedTripBtnText}>Add Missed Trip</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Search & Time Filters */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search truck plate, origin, drop, driver…"
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

        {/* Time Presets Bar */}
        <View style={s.timePresetRow}>
          <Text style={s.timePresetLabel}>Period:</Text>
          {[
            { key: 'ALL_TIME', label: 'All Time' },
            { key: 'TODAY', label: 'Today' },
            { key: '7_DAYS', label: 'Last 7 Days' },
            { key: '30_DAYS', label: 'Last 30 Days' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[s.timeChip, timePreset === item.key && s.timeChipActive]}
              onPress={() => setTimePreset(item.key)}
            >
              <Text style={[s.timeChipText, timePreset === item.key && s.timeChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 5. Trip Cards List */}
        {loading && !refreshing ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color="#1A56DB" />
            <Text style={s.loadingText}>Loading trips from server…</Text>
          </View>
        ) : filteredTrips.length === 0 ? (
          <Card style={s.emptyCard}>
            <Ionicons name="navigate-outline" size={44} color="#94A3B8" />
            <Text style={s.emptyTitle}>No Trips Found</Text>
            <Text style={s.emptySubtitle}>
              {search
                ? `No trips matching query "${search}".`
                : 'No GPS-detected trips recorded in this period.'}
            </Text>
            {(search || selectedTab !== 'ALL' || timePreset !== 'ALL_TIME') && (
              <TouchableOpacity
                style={s.resetFilterBtn}
                onPress={() => {
                  setSearch('');
                  setSelectedTab('ALL');
                  setTimePreset('ALL_TIME');
                }}
              >
                <Text style={s.resetFilterText}>Reset Filters</Text>
              </TouchableOpacity>
            )}
          </Card>
        ) : (
          filteredTrips.map((trip) => {
            const conf = trip.statusConf;
            return (
              <Card key={trip.id} padding={0} style={s.tripCard}>
                {/* Card Top: Plate, Model & Status Pill */}
                <View style={s.cardHeader}>
                  <View style={s.truckBlock}>
                    <View style={s.plateWrap}>
                      <Text style={s.plateText}>{trip.plate}</Text>
                    </View>
                    <Text style={s.modelText} numberOfLines={1}>
                      {trip.model}
                    </Text>
                  </View>

                  <View
                    style={[
                      s.statusBadge,
                      { backgroundColor: conf.bg, borderColor: conf.border },
                    ]}
                  >
                    <Ionicons name={conf.icon} size={12} color={conf.color} />
                    <Text style={[s.statusBadgeText, { color: conf.color }]}>
                      {conf.label}
                    </Text>
                  </View>
                </View>

                {/* Journey Timeline View */}
                <View style={s.journeyBlock}>
                  {/* Origin */}
                  <View style={s.journeyPoint}>
                    <View style={s.originDot} />
                    <View style={s.pointContent}>
                      <Text style={s.placeNameText} numberOfLines={2}>
                        {trip.fromName}
                      </Text>
                      <Text style={s.timeText}>
                        Departed: {formatDateTime(trip.departedAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Connecting Line with Distance Pill */}
                  <View style={s.connectingSegment}>
                    <View style={s.dashedLine} />
                    <View style={s.distanceBadge}>
                      <Ionicons name="speedometer-outline" size={12} color="#1A56DB" />
                      <Text style={s.distanceText}>{formatKm(trip.km)}</Text>
                      {trip.durationMin && (
                        <Text style={s.durationText}>· {formatDuration(trip.durationMin)}</Text>
                      )}
                    </View>
                  </View>

                  {/* Destination */}
                  <View style={s.journeyPoint}>
                    <View
                      style={[
                        s.destinationDot,
                        trip.status === 'OPEN' && { backgroundColor: '#3B82F6' },
                      ]}
                    />
                    <View style={s.pointContent}>
                      <Text style={s.placeNameText} numberOfLines={2}>
                        {trip.toName}
                      </Text>
                      <Text style={s.timeText}>
                        {trip.status === 'OPEN'
                          ? 'Status: In transit on highway'
                          : `Arrived: ${formatDateTime(trip.arrivedAt)}`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Metadata Tags: Driver, Material, SAP Lane */}
                <View style={s.metaChipsRow}>
                  {trip.driverName && (
                    <View style={s.metaChip}>
                      <Ionicons name="person-outline" size={12} color="#475569" />
                      <Text style={s.metaChipText} numberOfLines={1}>
                        {trip.driverName}
                      </Text>
                    </View>
                  )}

                  {trip.material && (
                    <View style={s.metaChip}>
                      <Ionicons name="cube-outline" size={12} color="#475569" />
                      <Text style={s.metaChipText}>
                        {trip.material}
                        {trip.tonnage ? ` · ${trip.tonnage} T` : ''}
                      </Text>
                    </View>
                  )}

                  {trip.leg && (
                    <View style={s.metaChip}>
                      <Ionicons name="git-branch-outline" size={12} color="#475569" />
                      <Text style={s.metaChipText}>
                        {trip.leg === 'REPOSITION' ? 'Plant to plant' : trip.leg}
                      </Text>
                    </View>
                  )}

                  {trip.sap?.lane && (
                    <View style={s.sapChip}>
                      <Text style={s.sapChipText}>SAP: {trip.sap.lane}</Text>
                    </View>
                  )}
                </View>

                {/* Card Action Footer: Inspect Historical Replay */}
                <TouchableOpacity
                  style={s.cardFooter}
                  onPress={() => navigation.navigate('Manager trip', { id: trip.id })}
                  activeOpacity={0.8}
                >
                  <View style={s.cardFooterLeft}>
                    <Ionicons name="map-outline" size={15} color="#1A56DB" />
                    <Text style={s.cardFooterText}>Replay GPS Route & Stop Dwell Times</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#1A56DB" />
                </TouchableOpacity>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* 6. Schedule Trip Modal */}
      {scheduleModalOpen && (
        <Modal
          visible={scheduleModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setScheduleModalOpen(false)}
        >
          <View style={s.modalOverlay}>
            <View style={[s.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalHeading}>Schedule a Trip</Text>
                  <Text style={s.modalSub}>Link planned route to future GPS run</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setScheduleModalOpen(false)}
                  style={s.modalCloseBtn}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={22} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.modalFormScroll}>
                {scheduleForm.error ? (
                  <View style={s.modalErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={s.modalErrorText}>{scheduleForm.error}</Text>
                  </View>
                ) : null}

                {/* Vehicle Picker */}
                <Text style={s.inputLabel}>Select Vehicle *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pickerRow}>
                  {vehiclesList.slice(0, 15).map((v) => (
                    <TouchableOpacity
                      key={v.id || v._id}
                      style={[
                        s.pickerItem,
                        scheduleForm.vehicleId === String(v.id || v._id) && s.pickerItemSelected,
                      ]}
                      onPress={() =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          vehicleId: String(v.id || v._id),
                        }))
                      }
                    >
                      <Text
                        style={[
                          s.pickerItemText,
                          scheduleForm.vehicleId === String(v.id || v._id) && s.pickerItemTextSelected,
                        ]}
                      >
                        {v.plate}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Driver Picker (Optional) */}
                <Text style={s.inputLabel}>Assign Driver (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pickerRow}>
                  {driversList.slice(0, 15).map((d) => (
                    <TouchableOpacity
                      key={d.id || d._id}
                      style={[
                        s.pickerItem,
                        scheduleForm.driverId === String(d.id || d._id) && s.pickerItemSelected,
                      ]}
                      onPress={() =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          driverId:
                            scheduleForm.driverId === String(d.id || d._id)
                              ? ''
                              : String(d.id || d._id),
                        }))
                      }
                    >
                      <Text
                        style={[
                          s.pickerItemText,
                          scheduleForm.driverId === String(d.id || d._id) && s.pickerItemTextSelected,
                        ]}
                      >
                        {d.name || d.firstName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Pickup Location */}
                <Text style={s.inputLabel}>Pickup / Loading Plant *</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. Dalla Cement Plant, Sonebhadra"
                  placeholderTextColor="#94A3B8"
                  value={scheduleForm.pickupName}
                  onChangeText={(text) =>
                    setScheduleForm((prev) => ({ ...prev, pickupName: text }))
                  }
                />

                {/* Drop Location */}
                <Text style={s.inputLabel}>Drop Destination *</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. Varanasi Logistics Yard"
                  placeholderTextColor="#94A3B8"
                  value={scheduleForm.dropName}
                  onChangeText={(text) =>
                    setScheduleForm((prev) => ({ ...prev, dropName: text }))
                  }
                />

                {/* Notes */}
                <Text style={s.inputLabel}>Notes / Instructions</Text>
                <TextInput
                  style={[s.textInput, { height: 64 }]}
                  placeholder="Optional trip notes or consignment details…"
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={scheduleForm.note}
                  onChangeText={(text) =>
                    setScheduleForm((prev) => ({ ...prev, note: text }))
                  }
                />

                {/* Submit Button */}
                <TouchableOpacity
                  style={[s.primaryModalBtn, scheduleForm.submitting && { opacity: 0.7 }]}
                  onPress={handleScheduleSubmit}
                  disabled={scheduleForm.submitting}
                >
                  {scheduleForm.submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={s.primaryModalBtnText}>Schedule Trip</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* 7. Add Missed Trip Modal */}
      {missedTripModalOpen && (
        <Modal
          visible={missedTripModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setMissedTripModalOpen(false)}
        >
          <View style={s.modalOverlay}>
            <View style={[s.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalHeading}>Add Missed Trip</Text>
                  <Text style={s.modalSub}>Reconstruct undetected GPS trip or manual run</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setMissedTripModalOpen(false)}
                  style={s.modalCloseBtn}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={22} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.modalFormScroll}>
                {missedForm.error ? (
                  <View style={s.modalErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={s.modalErrorText}>{missedForm.error}</Text>
                  </View>
                ) : null}

                {/* Vehicle Picker */}
                <Text style={s.inputLabel}>Select Vehicle *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pickerRow}>
                  {vehiclesList.slice(0, 15).map((v) => (
                    <TouchableOpacity
                      key={v.id || v._id}
                      style={[
                        s.pickerItem,
                        missedForm.vehicleId === String(v.id || v._id) && s.pickerItemSelected,
                      ]}
                      onPress={() =>
                        setMissedForm((prev) => ({
                          ...prev,
                          vehicleId: String(v.id || v._id),
                        }))
                      }
                    >
                      <Text
                        style={[
                          s.pickerItemText,
                          missedForm.vehicleId === String(v.id || v._id) && s.pickerItemTextSelected,
                        ]}
                      >
                        {v.plate}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 30-Day GPS Recovery Strip */}
                {missedForm.vehicleId ? (
                  <View style={s.backfillBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.backfillTitle}>Added this truck recently?</Text>
                      <Text style={s.backfillSub}>
                        Recover all trips from the truck's past 30 days of telemetry.
                      </Text>
                    </View>
                    <TouchableOpacity style={s.backfillBtn} onPress={handleBackfill}>
                      <Text style={s.backfillBtnText}>Recover GPS</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Pickup Location */}
                <Text style={s.inputLabel}>Pickup Location *</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. Renukoot Terminal"
                  placeholderTextColor="#94A3B8"
                  value={missedForm.pickupName}
                  onChangeText={(text) =>
                    setMissedForm((prev) => ({ ...prev, pickupName: text }))
                  }
                />

                {/* Drop Location */}
                <Text style={s.inputLabel}>Drop Location *</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. Mirzapur Depot"
                  placeholderTextColor="#94A3B8"
                  value={missedForm.dropName}
                  onChangeText={(text) =>
                    setMissedForm((prev) => ({ ...prev, dropName: text }))
                  }
                />

                {/* Distance override */}
                <Text style={s.inputLabel}>Distance in KM (Optional)</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. 185"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={missedForm.km}
                  onChangeText={(text) =>
                    setMissedForm((prev) => ({ ...prev, km: text }))
                  }
                />

                {/* Notes */}
                <Text style={s.inputLabel}>Notes</Text>
                <TextInput
                  style={[s.textInput, { height: 60 }]}
                  placeholder="Reason for manual entry…"
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={missedForm.note}
                  onChangeText={(text) =>
                    setMissedForm((prev) => ({ ...prev, note: text }))
                  }
                />

                {/* Submit Button */}
                <TouchableOpacity
                  style={[s.primaryModalBtn, missedForm.submitting && { opacity: 0.7 }]}
                  onPress={handleMissedTripSubmit}
                  disabled={missedForm.submitting}
                >
                  {missedForm.submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={s.primaryModalBtnText}>Save Missed Trip</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
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

  // KPI Strip
  kpiStripRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
  },
  kpiTab: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    gap: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  kpiTabRun: {
    width: 130,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  kpiTabSelected: {
    borderColor: '#1A56DB',
    backgroundColor: '#F0F5FF',
  },
  labelWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  kpiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // Action Buttons
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleBtn: {
    flex: 1,
    backgroundColor: '#1A56DB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#1A56DB',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  scheduleBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  missedTripBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  missedTripBtnText: {
    color: '#1A56DB',
    fontWeight: '700',
    fontSize: 13,
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

  // Time presets
  timePresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timePresetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 2,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  timeChipActive: {
    backgroundColor: '#0F172A',
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },

  // Trip Card
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 12,
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
    gap: 2,
  },
  plateWrap: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  plateText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    fontSize: 13,
    color: '#0F172A',
  },
  modelText: {
    fontSize: 11,
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

  // Journey Timeline
  journeyBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  journeyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
    marginTop: 4,
  },
  destinationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
    marginTop: 4,
  },
  pointContent: {
    flex: 1,
    gap: 2,
  },
  placeNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
  },
  connectingSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    paddingLeft: 4,
    gap: 8,
  },
  dashedLine: {
    width: 2,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  durationText: {
    fontSize: 11,
    color: '#64748B',
  },

  // Meta Chips
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  metaChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  sapChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sapChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A56DB',
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardFooterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A56DB',
  },

  // Empty & Loading
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
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  resetFilterBtn: {
    marginTop: 8,
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

  // Modals
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalFormScroll: {
    paddingTop: 14,
    gap: 10,
    paddingBottom: 20,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    borderRadius: 8,
  },
  modalErrorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  pickerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerItemSelected: {
    backgroundColor: '#1A56DB',
    borderColor: '#1A56DB',
  },
  pickerItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  pickerItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  backfillBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  backfillTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  backfillSub: {
    fontSize: 11,
    color: '#3B82F6',
  },
  backfillBtn: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  backfillBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  primaryModalBtn: {
    backgroundColor: '#1A56DB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryModalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
