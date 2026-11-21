import React, { useState, useEffect, useCallback, useMemo, Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Platform,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { BackHeader } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import { pickFromCamera, pickFromGallery } from '../../utils/pickImage';

// Service Category options (exact parity with web)
const SERVICE_CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'PERIODIC', label: 'Periodic / Scheduled' },
  { id: 'OIL', label: 'Oil & Lubrication' },
  { id: 'BRAKE', label: 'Brakes & Suspension' },
  { id: 'ELECTRICAL', label: 'Electrical & Battery' },
  { id: 'GENERAL', label: 'General Maintenance' },
];

// Repair Priority & Status options (exact parity with web)
const REPAIR_FILTERS = [
  { id: 'ALL', label: 'All Issues' },
  { id: 'P0', label: 'P0 Critical (Engine / Axle / Brakes)' },
  { id: 'P1', label: 'P1 High (Clutch / Suspension)' },
  { id: 'P2', label: 'P2 Medium (Tyres / Roadside)' },
  { id: 'P3', label: 'P3 Minor / Routine' },
  { id: 'OPEN', label: 'Open Issues Only' },
  { id: 'RESOLVED', label: 'Resolved Only' },
];

// Upcoming Service Sub-filters
const UPCOMING_FILTERS = [
  { id: 'ALL', label: 'All Tracked Trucks' },
  { id: 'OVERDUE', label: 'Overdue Only' },
  { id: 'DUE_SOON', label: 'Due Soon (Next 7-14 Days)' },
  { id: 'OK', label: 'On Track' },
];

const RISK_CONFIG = {
  OVERDUE: { label: 'Overdue', color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
  DUE_SOON: { label: 'Due Soon', color: '#EA580C', bg: '#FFEDD5', border: '#FDBA74' },
  OK: { label: 'On Track', color: '#16A34A', bg: '#DCFCE7', border: '#86EFAC' },
};

function safeFormatNumber(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return '0';
  try {
    return n.toLocaleString('en-IN');
  } catch {
    return String(Math.round(n));
  }
}

function formatMoney(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  return `₹${safeFormatNumber(amount)}`;
}

function formatKm(km) {
  if (km == null || isNaN(km)) return '—';
  return `${safeFormatNumber(km)} km`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateStr);
  }
}

// Error Boundary to prevent any unhandled crash from showing Redbox
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.warn('[FleetMaintenanceScreen ErrorBoundary]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 12, textAlign: 'center' }}>
            Service Intelligence temporarily unavailable
          </Text>
          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 6, textAlign: 'center' }}>
            {this.state.error?.message || 'Something went wrong while rendering maintenance logs.'}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 16, backgroundColor: '#1A56DB', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function FleetMaintenanceContent({ navigation }) {
  const insets = useSafeAreaInsets();
  const { service, branchId, data: managerData } = useManagerData?.() || {};

  // Active Tab: UPCOMING (Upcoming Service), SERVICE (Service Records), REPAIR (Repairs & Issues)
  const [activeTab, setActiveTab] = useState('UPCOMING');

  // General state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Dropdown filter state
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [repairFilter, setRepairFilter] = useState('ALL');
  const [upcomingFilter, setUpcomingFilter] = useState('ALL');
  const [dropdownModalOpen, setDropdownModalOpen] = useState(false);

  // Tab Data states
  const [upcomingRecords, setUpcomingRecords] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [repairRecords, setRepairRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, totalAmount: 0, last30: 0 });

  // Lightbox Image Preview
  const [lightboxUri, setLightboxUri] = useState(null);

  // Modals state - MUST BE DECLARED BEFORE ANY MEMO USING IT!
  const [addRecordModal, setAddRecordModal] = useState({
    visible: false,
    recordType: 'SERVICE', // 'SERVICE' or 'REPAIR'
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    currentKm: '',
    workshop: '',
    type: 'PERIODIC',
    priority: 'P2',
    amount: '',
    notes: '',
    attachment: null,
    submitting: false,
    error: '',
  });

  const [resolveModal, setResolveModal] = useState({
    visible: false,
    record: null,
    notes: '',
    submitting: false,
  });

  // Searchable Vehicle Picker state
  const [vehicleSearchText, setVehicleSearchText] = useState('');
  const [vehiclePickerModalOpen, setVehiclePickerModalOpen] = useState(false);

  // Vehicles list for dropdowns (memoized from managerData, augmented with predictions/records)
  const vehicles = useMemo(() => {
    const list = managerData?.vehicles || [];
    const map = new Map();
    list.forEach((v) => {
      const id = v.id || v._id;
      if (id) {
        map.set(id, { id, plate: v.plate || v.registrationNumber || v.number || 'Truck' });
      }
    });
    // augment from upcomingRecords if needed
    (upcomingRecords || []).forEach((r) => {
      const id = r.vehicleId || r.id;
      if (id && !map.has(id)) {
        map.set(id, { id, plate: r.registrationNumber || 'Truck' });
      }
    });
    return Array.from(map.values());
  }, [managerData, upcomingRecords]);

  const filteredVehiclesForPicker = useMemo(() => {
    if (!vehicleSearchText.trim()) return vehicles;
    const q = vehicleSearchText.trim().toLowerCase().replace(/[\s-]/g, '');
    return vehicles.filter((v) => {
      const p = String(v.plate || '').toLowerCase().replace(/[\s-]/g, '');
      return p.includes(q);
    });
  }, [vehicles, vehicleSearchText]);

  const selectedVehicleObj = useMemo(() => {
    return vehicles.find((v) => v.id === addRecordModal.vehicleId);
  }, [vehicles, addRecordModal.vehicleId]);

  // --------------------------------------------------------------------------
  // Fetch Data according to Active Tab
  // --------------------------------------------------------------------------
  const loadTabData = useCallback(
    async (isRefresh = false) => {
      if (!service) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const bId = branchId === 'all' ? undefined : branchId;

      try {
        if (activeTab === 'UPCOMING') {
          const res = await service.maintenancePredictions({}, bId);
          setUpcomingRecords(Array.isArray(res?.records) ? res.records : []);
        } else if (activeTab === 'SERVICE') {
          const [recRes, sumRes] = await Promise.all([
            service.maintenanceRecords({ recordType: 'SERVICE', limit: 100 }, bId),
            service.maintenanceSummary({ recordType: 'SERVICE' }, bId),
          ]);
          setServiceRecords(recRes?.data || []);
          setSummary(sumRes || { total: 0, totalAmount: 0, last30: 0 });
        } else if (activeTab === 'REPAIR') {
          const [recRes, sumRes] = await Promise.all([
            service.maintenanceRecords({ recordType: 'REPAIR', limit: 100 }, bId),
            service.maintenanceSummary({ recordType: 'REPAIR' }, bId),
          ]);
          setRepairRecords(recRes?.data || []);
          setSummary(sumRes || { total: 0, totalAmount: 0, last30: 0 });
        }
      } catch (err) {
        // Fallback gracefully
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [service, branchId, activeTab]
  );

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  // --------------------------------------------------------------------------
  // Tab Switching
  // --------------------------------------------------------------------------
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearch('');
  };

  // --------------------------------------------------------------------------
  // Open Add Service / Repair Modal
  // --------------------------------------------------------------------------
  const openAddModal = (recordType, preselectedVehicleId = '') => {
    const defaultType = recordType === 'SERVICE' ? 'PERIODIC' : 'Engine';
    const defaultPriority = recordType === 'SERVICE' ? 'ROUTINE' : 'P2';
    const initialVehicle = preselectedVehicleId || addRecordModal.vehicleId || vehicles[0]?.id || '';
    setAddRecordModal({
      visible: true,
      recordType,
      vehicleId: initialVehicle,
      date: new Date().toISOString().split('T')[0],
      currentKm: '',
      workshop: '',
      type: defaultType,
      priority: defaultPriority,
      amount: '',
      notes: '',
      attachment: null,
      submitting: false,
      error: '',
    });
  };

  // --------------------------------------------------------------------------
  // Submit Add Service / Repair Record
  // --------------------------------------------------------------------------
  const handleSubmitRecord = async () => {
    const { recordType, vehicleId, date, currentKm, workshop, type, priority, amount, notes, attachment } =
      addRecordModal;

    if (!vehicleId) {
      setAddRecordModal((p) => ({ ...p, error: 'Please select a vehicle' }));
      return;
    }
    if (!workshop.trim()) {
      setAddRecordModal((p) => ({ ...p, error: 'Please enter workshop or service center name' }));
      return;
    }

    setAddRecordModal((p) => ({ ...p, submitting: true, error: '' }));
    try {
      const bId = branchId === 'all' ? undefined : branchId;
      const payload = {
        recordType,
        vehicleId,
        date: date || new Date().toISOString().split('T')[0],
        workshop: workshop.trim(),
        type: type || 'General',
        priority: priority || 'P2',
        amount: amount ? Number(amount) : 0,
        notes: notes.trim(),
        currentKm: currentKm ? Number(currentKm) : undefined,
      };

      await service.createMaintenanceRecord(payload, attachment, bId);
      Alert.alert(
        'Recorded Successfully',
        `${recordType === 'SERVICE' ? 'Service record' : 'Repair job'} saved for vehicle.`
      );
      setAddRecordModal((p) => ({ ...p, visible: false, submitting: false }));
      loadTabData(true);
    } catch (err) {
      setAddRecordModal((p) => ({
        ...p,
        submitting: false,
        error: err?.message || 'Could not save maintenance record.',
      }));
    }
  };

  // --------------------------------------------------------------------------
  // Resolve Issue
  // --------------------------------------------------------------------------
  const handleResolveRecord = async () => {
    const { record, notes } = resolveModal;
    if (!record) return;

    setResolveModal((p) => ({ ...p, submitting: true }));
    try {
      const bId = branchId === 'all' ? undefined : branchId;
      await service.updateMaintenanceRecord(
        record.id || record._id,
        { status: 'RESOLVED', resolutionNote: notes.trim() },
        bId
      );
      Alert.alert('Issue Resolved', 'The repair ticket has been marked as resolved.');
      setResolveModal({ visible: false, record: null, notes: '', submitting: false });
      loadTabData(true);
    } catch (err) {
      setResolveModal((p) => ({ ...p, submitting: false }));
      Alert.alert('Error', err?.message || 'Failed to update issue status.');
    }
  };

  // --------------------------------------------------------------------------
  // Delete Record
  // --------------------------------------------------------------------------
  const handleDeleteRecord = (recordId) => {
    Alert.alert('Delete Record', 'Are you sure you want to permanently delete this maintenance record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const bId = branchId === 'all' ? undefined : branchId;
            await service.deleteMaintenanceRecord(recordId, bId);
            Alert.alert('Deleted', 'Maintenance record deleted.');
            loadTabData(true);
          } catch (err) {
            Alert.alert('Error', err?.message || 'Could not delete record.');
          }
        },
      },
    ]);
  };

  // --------------------------------------------------------------------------
  // Pick Photo Attachment (Camera or Gallery)
  // --------------------------------------------------------------------------
  const handlePickAttachment = () => {
    Alert.alert('Attach Document / Bill', 'Select photo source:', [
      {
        text: 'Camera',
        onPress: async () => {
          const file = await pickFromCamera();
          if (file) setAddRecordModal((p) => ({ ...p, attachment: file }));
        },
      },
      {
        text: 'Photo Gallery',
        onPress: async () => {
          const file = await pickFromGallery();
          if (file) setAddRecordModal((p) => ({ ...p, attachment: file }));
        },
      },
      {
        text: 'Files / PDF',
        onPress: async () => {
          const docRes = await DocumentPicker.getDocumentAsync({
            type: ['image/*', 'application/pdf'],
            copyToCacheDirectory: true,
          });
          if (!docRes.canceled && docRes.assets?.length) {
            const a = docRes.assets[0];
            setAddRecordModal((p) => ({
              ...p,
              attachment: { uri: a.uri, name: a.name || 'bill.pdf', type: a.mimeType || 'application/pdf' },
            }));
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // --------------------------------------------------------------------------
  // Filtered Data Computation
  // --------------------------------------------------------------------------
  const filteredUpcoming = useMemo(() => {
    return (upcomingRecords || []).filter((r) => {
      const riskKey = String(r?.risk || 'OK').toUpperCase();
      if (upcomingFilter !== 'ALL' && riskKey !== upcomingFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (r?.registrationNumber || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [upcomingRecords, upcomingFilter, search]);

  const filteredServices = useMemo(() => {
    return (serviceRecords || []).filter((r) => {
      if (serviceFilter !== 'ALL') {
        const t = String(r?.type || '').toUpperCase();
        if (serviceFilter === 'PERIODIC' && !t.includes('PERIODIC') && !t.includes('SCHEDULE')) return false;
        if (serviceFilter === 'OIL' && !t.includes('OIL') && !t.includes('LUB')) return false;
        if (serviceFilter === 'BRAKE' && !t.includes('BRAKE') && !t.includes('SUSP')) return false;
        if (serviceFilter === 'ELECTRICAL' && !t.includes('ELEC') && !t.includes('BATT')) return false;
        if (serviceFilter === 'GENERAL' && (t.includes('PERIODIC') || t.includes('OIL') || t.includes('BRAKE'))) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const plate = String(r?.vehicle?.registrationNumber || r?.vehicleRegistrationNumber || r?.vehicleId || '').toLowerCase();
        const shop = String(r?.workshop || '').toLowerCase();
        const notes = String(r?.notes || '').toLowerCase();
        return plate.includes(q) || shop.includes(q) || notes.includes(q);
      }
      return true;
    });
  }, [serviceRecords, serviceFilter, search]);

  const filteredRepairs = useMemo(() => {
    return (repairRecords || []).filter((r) => {
      if (repairFilter !== 'ALL') {
        if (repairFilter === 'OPEN' && r?.status === 'RESOLVED') return false;
        if (repairFilter === 'RESOLVED' && r?.status !== 'RESOLVED') return false;
        if (['P0', 'P1', 'P2', 'P3'].includes(repairFilter)) {
          const prio = String(r?.priority || '').toUpperCase();
          if (!prio.startsWith(repairFilter)) return false;
        }
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const plate = String(r?.vehicle?.registrationNumber || r?.vehicleRegistrationNumber || r?.vehicleId || '').toLowerCase();
        const shop = String(r?.workshop || '').toLowerCase();
        const notes = String(r?.notes || '').toLowerCase();
        return plate.includes(q) || shop.includes(q) || notes.includes(q);
      }
      return true;
    });
  }, [repairRecords, repairFilter, search]);

  // Counts for upcoming
  const overdueCount = (upcomingRecords || []).filter((r) => String(r?.risk || '').toUpperCase() === 'OVERDUE').length;
  const dueSoonCount = (upcomingRecords || []).filter((r) => String(r?.risk || '').toUpperCase() === 'DUE_SOON').length;
  const onTrackCount = (upcomingRecords || []).filter((r) => String(r?.risk || '').toUpperCase() === 'OK').length;

  // Counts for repairs
  const openRepairsCount = (repairRecords || []).filter((r) => r?.status !== 'RESOLVED').length;
  const resolvedRepairsCount = (repairRecords || []).filter((r) => r?.status === 'RESOLVED').length;

  return (
    <View style={s.container}>
      {/* Top Header */}
      <BackHeader
        title="Service & Maintenance"
        subtitle="Preventive maintenance, service predictions & repairs"
        onBack={() => navigation.goBack()}
      />

      {/* 3 Main Tabs */}
      <View style={s.tabContainer}>
        {[
          { id: 'UPCOMING', label: 'Upcoming Service', icon: 'calendar-outline' },
          { id: 'SERVICE', label: 'Service Records', icon: 'speedometer-outline' },
          { id: 'REPAIR', label: 'Repairs & Issues', icon: 'build-outline' },
        ].map((tab) => {
          const isSel = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[s.tabButton, isSel && s.tabButtonActive]}
              onPress={() => handleTabSwitch(tab.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={tab.icon} size={15} color={isSel ? '#1A56DB' : '#64748B'} />
              <Text style={[s.tabButtonText, isSel && s.tabButtonTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTabData(true)} colors={['#1A56DB']} />}
      >
        {/* =====================================================================
            TAB 1: UPCOMING SERVICE
        ===================================================================== */}
        {activeTab === 'UPCOMING' && (
          <View style={{ gap: 14 }}>
            {/* KPI Metrics */}
            <View style={s.kpiRow}>
              <View style={s.kpiCard}>
                <Text style={s.kpiVal}>{upcomingRecords.length}</Text>
                <Text style={s.kpiLabel}>Tracked</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={[s.kpiVal, { color: '#DC2626' }]}>{overdueCount}</Text>
                <Text style={s.kpiLabel}>Overdue</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={[s.kpiVal, { color: '#EA580C' }]}>{dueSoonCount}</Text>
                <Text style={s.kpiLabel}>Due Soon</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={[s.kpiVal, { color: '#16A34A' }]}>{onTrackCount}</Text>
                <Text style={s.kpiLabel}>On Track</Text>
              </View>
            </View>

            {/* Filter Row: Search & Status Dropdown */}
            <View style={s.actionFilterRow}>
              <View style={s.searchBox}>
                <Ionicons name="search-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Filter by plate number..."
                  placeholderTextColor="#94A3B8"
                  value={search}
                  onChangeText={setSearch}
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Status Dropdown Filter Pill */}
              <TouchableOpacity
                style={s.dropdownPill}
                onPress={() => setDropdownModalOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={s.dropdownPillText} numberOfLines={1}>
                  {UPCOMING_FILTERS.find((f) => f.id === upcomingFilter)?.label || 'Filter'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#1A56DB" />
              </TouchableOpacity>
            </View>

            {/* List */}
            {loading ? (
              <View style={s.centerBox}>
                <ActivityIndicator size="large" color="#1A56DB" />
                <Text style={s.loadingText}>Projecting vehicle service intervals...</Text>
              </View>
            ) : filteredUpcoming.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="checkmark-done-circle-outline" size={44} color="#16A34A" />
                <Text style={s.emptyTitle}>All Vehicles On Track</Text>
                <Text style={s.emptySubtitle}>No vehicles due for maintenance in this selection.</Text>
              </View>
            ) : (
              filteredUpcoming.map((r, index) => {
                const riskKey = String(r?.risk || 'OK').toUpperCase();
                const risk = RISK_CONFIG[riskKey] || RISK_CONFIG.OK;
                const kmDiff = r?.kmUntilDue;
                let kmLabel = null;
                if (kmDiff != null && !isNaN(kmDiff)) {
                  const numDiff = Number(kmDiff);
                  kmLabel = numDiff < 0
                    ? `${safeFormatNumber(Math.abs(numDiff))} km overdue`
                    : `${safeFormatNumber(numDiff)} km remaining`;
                }

                return (
                  <View key={r?.id || r?._id || r?.vehicleId || r?.registrationNumber || `upcoming-${index}`} style={s.predictionCard}>
                    <View style={s.predictionHeader}>
                      {/* Plate Badge */}
                      <View style={s.plateBadge}>
                        <View style={s.plateIndPill}>
                          <Text style={s.plateIndText}>IND</Text>
                        </View>
                        <Text style={s.plateNumberText}>{r?.registrationNumber || 'TRUCK'}</Text>
                      </View>

                      {/* Risk Badge */}
                      <View style={[s.riskBadge, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                        <Text style={[s.riskBadgeText, { color: risk.color }]}>{risk.label}</Text>
                      </View>
                    </View>

                    {/* Timeline & Due status */}
                    <View style={s.dueStatsGrid}>
                      <View style={s.dueStatItem}>
                        <Text style={s.dueStatLabel}>SERVICE DUE</Text>
                        <Text style={[s.dueStatVal, { color: risk.color }]}>
                          {r?.daysUntilDue != null
                            ? r.daysUntilDue < 0
                              ? `${Math.abs(r.daysUntilDue)} days overdue`
                              : `In ${r.daysUntilDue} days`
                            : 'Projected soon'}
                        </Text>
                      </View>

                      <View style={s.dueStatItem}>
                        <Text style={s.dueStatLabel}>DISTANCE</Text>
                        <Text style={s.dueStatVal}>{kmLabel || '—'}</Text>
                      </View>

                      <View style={s.dueStatItem}>
                        <Text style={s.dueStatLabel}>CURRENT ODO</Text>
                        <Text style={s.dueStatVal}>{formatKm(r?.currentOdometer)}</Text>
                      </View>
                    </View>

                    {/* Sub Info & Action */}
                    <View style={s.predictionFooter}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.predictionSubText}>
                          Due at {formatKm(r?.projectedServiceDueOdometer)} · Projected {formatDate(r?.projectedServiceDueDate)}
                        </Text>
                        {r?.avgKmPerDay ? (
                          <Text style={s.predictionSubText}>{Math.round(r.avgKmPerDay)} km/day telemetry average</Text>
                        ) : null}
                      </View>

                      <TouchableOpacity
                        style={s.logServiceBtn}
                        onPress={() => openAddModal('SERVICE', r?.vehicleId)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                        <Text style={s.logServiceBtnText}>Log Service</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* =====================================================================
            TAB 2: SERVICE RECORDS
        ===================================================================== */}
        {activeTab === 'SERVICE' && (
          <View style={{ gap: 14 }}>
            {/* KPI Metrics */}
            <View style={s.kpiRow}>
              <View style={s.kpiCard}>
                <Text style={s.kpiVal}>{summary?.total || serviceRecords.length}</Text>
                <Text style={s.kpiLabel}>Total Services</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={[s.kpiVal, { color: '#1A56DB' }]}>{formatMoney(summary?.totalAmount)}</Text>
                <Text style={s.kpiLabel}>Total Cost</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={[s.kpiVal, { color: '#0284C7' }]}>{formatMoney(summary?.last30)}</Text>
                <Text style={s.kpiLabel}>Last 30 Days</Text>
              </View>
            </View>

            {/* Filter Row: Search, Category Dropdown & Add Button */}
            <View style={s.actionFilterRow}>
              <View style={s.searchBox}>
                <Ionicons name="search-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search service logs..."
                  placeholderTextColor="#94A3B8"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              <TouchableOpacity
                style={s.dropdownPill}
                onPress={() => setDropdownModalOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={s.dropdownPillText} numberOfLines={1}>
                  {SERVICE_CATEGORIES.find((f) => f.id === serviceFilter)?.label || 'Category'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#1A56DB" />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.primaryActionBtn}
                onPress={() => openAddModal('SERVICE')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={s.primaryActionBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Service Records List */}
            {loading ? (
              <View style={s.centerBox}>
                <ActivityIndicator size="large" color="#1A56DB" />
                <Text style={s.loadingText}>Loading routine service records...</Text>
              </View>
            ) : filteredServices.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="speedometer-outline" size={44} color="#94A3B8" />
                <Text style={s.emptyTitle}>No Service Records</Text>
                <Text style={s.emptySubtitle}>No routine service logs found for this filter.</Text>
                <TouchableOpacity
                  style={s.emptyAddBtn}
                  onPress={() => openAddModal('SERVICE')}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={s.emptyAddBtnText}>Add First Service Record</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredServices.map((r, index) => {
                const plate = r?.vehicle?.registrationNumber || r?.vehicleRegistrationNumber || r?.vehiclePlate || 'TRUCK';
                const attachUrl = r?.attachments?.[0]?.url || r?.attachments?.[0]?.fileUrl;

                return (
                  <View key={r?.id || r?._id || `service-${index}`} style={s.recordCard}>
                    <View style={s.recordHeader}>
                      <View style={s.plateBadgeSmall}>
                        <Text style={s.plateNumberSmallText}>{plate}</Text>
                      </View>
                      <View style={s.categoryChip}>
                        <Text style={s.categoryChipText}>{r?.type || 'Routine Service'}</Text>
                      </View>
                      <Text style={s.amountText}>{formatMoney(r?.amount)}</Text>
                    </View>

                    <View style={s.recordBody}>
                      <View style={s.recordRow}>
                        <Ionicons name="calendar-outline" size={13} color="#64748B" />
                        <Text style={s.recordRowLabel}>Service Date:</Text>
                        <Text style={s.recordRowVal}>{formatDate(r?.date)}</Text>
                        {r?.currentKm ? (
                          <Text style={[s.recordRowVal, { marginLeft: 'auto', fontWeight: '700' }]}>
                            {formatKm(r.currentKm)}
                          </Text>
                        ) : null}
                      </View>

                      <View style={s.recordRow}>
                        <Ionicons name="business-outline" size={13} color="#64748B" />
                        <Text style={s.recordRowLabel}>Workshop:</Text>
                        <Text style={s.recordRowVal} numberOfLines={1}>
                          {r?.workshop || 'Authorized Garage'}
                        </Text>
                      </View>

                      {r?.notes ? (
                        <View style={s.notesBox}>
                          <Text style={s.notesText}>{r.notes}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Footer / Actions */}
                    <View style={s.recordFooter}>
                      {attachUrl ? (
                        <TouchableOpacity
                          style={s.billPreviewBtn}
                          onPress={() => setLightboxUri(attachUrl)}
                        >
                          <Ionicons name="receipt-outline" size={14} color="#1A56DB" />
                          <Text style={s.billPreviewBtnText}>View Bill</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={s.noBillText}>No invoice attached</Text>
                      )}

                      <TouchableOpacity
                        style={s.deleteRecordBtn}
                        onPress={() => handleDeleteRecord(r?.id || r?._id)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* =====================================================================
            TAB 3: REPAIRS & BREAKDOWN ISSUES
        ===================================================================== */}
        {activeTab === 'REPAIR' && (
          <View style={{ gap: 14 }}>
            {/* KPI Metrics */}
            <View style={s.kpiRow}>
              <View style={s.kpiCard}>
                <Text style={s.kpiVal}>{summary?.total || repairRecords.length}</Text>
                <Text style={s.kpiLabel}>Total Issues</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={[s.kpiVal, { color: '#DC2626' }]}>{openRepairsCount}</Text>
                <Text style={s.kpiLabel}>Open Issues</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={[s.kpiVal, { color: '#16A34A' }]}>{resolvedRepairsCount}</Text>
                <Text style={s.kpiLabel}>Resolved</Text>
              </View>
            </View>

            {/* Filter Row: Search, Priority Dropdown & Log Repair Button */}
            <View style={s.actionFilterRow}>
              <View style={s.searchBox}>
                <Ionicons name="search-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search repairs..."
                  placeholderTextColor="#94A3B8"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              <TouchableOpacity
                style={s.dropdownPill}
                onPress={() => setDropdownModalOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={s.dropdownPillText} numberOfLines={1}>
                  {REPAIR_FILTERS.find((f) => f.id === repairFilter)?.label || 'Priority / Status'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#1A56DB" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.primaryActionBtn, { backgroundColor: '#EA580C' }]}
                onPress={() => openAddModal('REPAIR')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={s.primaryActionBtnText}>Log</Text>
              </TouchableOpacity>
            </View>

            {/* Repair Records List */}
            {loading ? (
              <View style={s.centerBox}>
                <ActivityIndicator size="large" color="#1A56DB" />
                <Text style={s.loadingText}>Loading breakdown & repair tickets...</Text>
              </View>
            ) : filteredRepairs.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="build-outline" size={44} color="#94A3B8" />
                <Text style={s.emptyTitle}>No Repair Issues</Text>
                <Text style={s.emptySubtitle}>No open breakdown or repair jobs reported.</Text>
                <TouchableOpacity
                  style={[s.emptyAddBtn, { backgroundColor: '#EA580C' }]}
                  onPress={() => openAddModal('REPAIR')}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={s.emptyAddBtnText}>Log New Repair Job</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredRepairs.map((r, index) => {
                const plate = r?.vehicle?.registrationNumber || r?.vehicleRegistrationNumber || r?.vehiclePlate || 'TRUCK';
                const attachUrl = r?.attachments?.[0]?.url || r?.attachments?.[0]?.fileUrl;
                const isResolved = r?.status === 'RESOLVED';
                const prio = String(r?.priority || 'P2').toUpperCase();

                const isP0 = prio.startsWith('P0');
                const isP1 = prio.startsWith('P1');

                return (
                  <View key={r?.id || r?._id || `repair-${index}`} style={s.recordCard}>
                    <View style={s.recordHeader}>
                      <View style={s.plateBadgeSmall}>
                        <Text style={s.plateNumberSmallText}>{plate}</Text>
                      </View>

                      {/* Priority Tag */}
                      <View
                        style={[
                          s.priorityTag,
                          isP0
                            ? { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }
                            : isP1
                            ? { backgroundColor: '#FFEDD5', borderColor: '#FDBA74' }
                            : { backgroundColor: '#FEF9C3', borderColor: '#FDE047' },
                        ]}
                      >
                        <Text
                          style={[
                            s.priorityTagText,
                            isP0 ? { color: '#DC2626' } : isP1 ? { color: '#EA580C' } : { color: '#854D0E' },
                          ]}
                        >
                          {prio}
                        </Text>
                      </View>

                      {/* Status Tag */}
                      <View style={[s.statusTag, isResolved ? s.statusTagResolved : s.statusTagOpen]}>
                        <Text style={[s.statusTagText, isResolved ? s.statusTagResolvedText : s.statusTagOpenText]}>
                          {isResolved ? 'RESOLVED' : 'OPEN'}
                        </Text>
                      </View>

                      <Text style={[s.amountText, { marginLeft: 'auto' }]}>{formatMoney(r?.amount)}</Text>
                    </View>

                    <View style={s.recordBody}>
                      <View style={s.recordRow}>
                        <Ionicons name="alert-circle-outline" size={13} color="#64748B" />
                        <Text style={s.recordRowLabel}>Issue Type:</Text>
                        <Text style={[s.recordRowVal, { fontWeight: '700' }]}>{r?.type || 'Breakdown'}</Text>
                        <Text style={[s.recordRowVal, { marginLeft: 'auto', color: '#64748B' }]}>{formatDate(r?.date)}</Text>
                      </View>

                      <View style={s.recordRow}>
                        <Ionicons name="business-outline" size={13} color="#64748B" />
                        <Text style={s.recordRowLabel}>Workshop:</Text>
                        <Text style={s.recordRowVal} numberOfLines={1}>
                          {r?.workshop || 'On-site Repair'}
                        </Text>
                      </View>

                      {r?.notes ? (
                        <View style={s.notesBox}>
                          <Text style={s.notesText}>{r.notes}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Footer / Actions */}
                    <View style={s.recordFooter}>
                      {attachUrl ? (
                        <TouchableOpacity
                          style={s.billPreviewBtn}
                          onPress={() => setLightboxUri(attachUrl)}
                        >
                          <Ionicons name="receipt-outline" size={14} color="#1A56DB" />
                          <Text style={s.billPreviewBtnText}>View Bill</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={s.noBillText}>No invoice attached</Text>
                      )}

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                        {!isResolved ? (
                          <TouchableOpacity
                            style={s.resolveBtn}
                            onPress={() => setResolveModal({ visible: true, record: r, notes: '', submitting: false })}
                          >
                            <Ionicons name="checkmark-circle-outline" size={14} color="#FFFFFF" />
                            <Text style={s.resolveBtnText}>Mark Resolved</Text>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={s.deleteRecordBtn}
                          onPress={() => handleDeleteRecord(r?.id || r?._id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* =====================================================================
          MODAL 1: Filter Dropdown Selector (Bottom Sheet)
      ===================================================================== */}
      <Modal visible={dropdownModalOpen} animationType="slide" transparent onRequestClose={() => setDropdownModalOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.dropdownSheetCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>
                {activeTab === 'UPCOMING'
                  ? 'Filter Predictions'
                  : activeTab === 'SERVICE'
                  ? 'Filter Service Category'
                  : 'Filter Repair Issues'}
              </Text>
              <TouchableOpacity onPress={() => setDropdownModalOpen(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              {(activeTab === 'UPCOMING'
                ? UPCOMING_FILTERS
                : activeTab === 'SERVICE'
                ? SERVICE_CATEGORIES
                : REPAIR_FILTERS
              ).map((item) => {
                const currentVal =
                  activeTab === 'UPCOMING'
                    ? upcomingFilter
                    : activeTab === 'SERVICE'
                    ? serviceFilter
                    : repairFilter;
                const isSel = currentVal === item.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.dropdownItemRow, isSel && s.dropdownItemRowSelected]}
                    onPress={() => {
                      if (activeTab === 'UPCOMING') setUpcomingFilter(item.id);
                      else if (activeTab === 'SERVICE') setServiceFilter(item.id);
                      else setRepairFilter(item.id);
                      setDropdownModalOpen(false);
                    }}
                  >
                    <Ionicons
                      name={isSel ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isSel ? '#1A56DB' : '#94A3B8'}
                    />
                    <Text style={[s.dropdownItemText, isSel && s.dropdownItemTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 2: Add Service / Log Repair Form Modal
      ===================================================================== */}
      <Modal visible={addRecordModal.visible} animationType="slide" transparent onRequestClose={() => setAddRecordModal((p) => ({ ...p, visible: false }))}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.formModalCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalHeaderTitle}>
                  {addRecordModal.recordType === 'SERVICE' ? 'Add Routine Service' : 'Log Repair / Breakdown Job'}
                </Text>
                <Text style={s.modalHeaderSubtitle}>Record maintenance, bills and workshop job cards</Text>
              </View>
              <TouchableOpacity onPress={() => setAddRecordModal((p) => ({ ...p, visible: false }))} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
              {/* Searchable Vehicle Dropdown Trigger */}
              <View>
                <Text style={s.inputLabel}>Select Vehicle *</Text>
                <TouchableOpacity
                  style={[s.vehicleDropdownTrigger, !selectedVehicleObj && s.vehicleDropdownTriggerEmpty]}
                  onPress={() => {
                    setVehicleSearchText('');
                    setVehiclePickerModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={s.vehicleDropdownLeft}>
                    <View style={s.truckIconCircle}>
                      <Ionicons name="bus-outline" size={18} color="#1A56DB" />
                    </View>
                    {selectedVehicleObj ? (
                      <View style={{ gap: 2 }}>
                        <View style={s.plateBadge}>
                          <View style={s.plateIndPill}>
                            <Text style={s.plateIndText}>IND</Text>
                          </View>
                          <Text style={s.plateNumberText}>{selectedVehicleObj.plate}</Text>
                        </View>
                        <Text style={s.vehicleTapHint}>Tap to change selected truck</Text>
                      </View>
                    ) : (
                      <Text style={s.vehiclePlaceholderText}>Search & Select Truck (e.g. UP64...)</Text>
                    )}
                  </View>

                  <View style={s.dropdownChevronWrapper}>
                    <Ionicons name="search" size={14} color="#1A56DB" />
                    <Ionicons name="chevron-down" size={14} color="#64748B" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Date & Odometer Row */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={s.formInput}
                    value={addRecordModal.date}
                    onChangeText={(val) => setAddRecordModal((p) => ({ ...p, date: val }))}
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Current KM (Odometer)</Text>
                  <TextInput
                    style={s.formInput}
                    value={addRecordModal.currentKm}
                    onChangeText={(val) => setAddRecordModal((p) => ({ ...p, currentKm: val }))}
                    keyboardType="numeric"
                    placeholder="e.g. 145000"
                  />
                </View>
              </View>

              {/* Workshop Name */}
              <View>
                <Text style={s.inputLabel}>Workshop / Service Center Name *</Text>
                <TextInput
                  style={s.formInput}
                  value={addRecordModal.workshop}
                  onChangeText={(val) => setAddRecordModal((p) => ({ ...p, workshop: val }))}
                  placeholder="e.g. RK Auto Garage / Tata Authorized"
                />
              </View>

              {/* Category / Issue Type */}
              <View>
                <Text style={s.inputLabel}>
                  {addRecordModal.recordType === 'SERVICE' ? 'Service Category' : 'Problem / Component Type'}
                </Text>
                <TextInput
                  style={s.formInput}
                  value={addRecordModal.type}
                  onChangeText={(val) => setAddRecordModal((p) => ({ ...p, type: val }))}
                  placeholder={addRecordModal.recordType === 'SERVICE' ? 'e.g. Periodic / Oil Change' : 'e.g. Engine / Brakes / Axle'}
                />
              </View>

              {/* Amount Cost */}
              <View>
                <Text style={s.inputLabel}>Total Bill Amount (₹)</Text>
                <TextInput
                  style={s.formInput}
                  value={addRecordModal.amount}
                  onChangeText={(val) => setAddRecordModal((p) => ({ ...p, amount: val }))}
                  keyboardType="numeric"
                  placeholder="₹ 0"
                />
              </View>

              {/* Problem / Work Description Notes */}
              <View>
                <Text style={s.inputLabel}>Diagnostic & Work Notes</Text>
                <TextInput
                  style={[s.formInput, { height: 70, textAlignVertical: 'top', paddingTop: 8 }]}
                  value={addRecordModal.notes}
                  onChangeText={(val) => setAddRecordModal((p) => ({ ...p, notes: val }))}
                  multiline
                  placeholder="Enter details of parts replaced or work done..."
                />
              </View>

              {/* Invoice Attachment */}
              <View>
                <Text style={s.inputLabel}>Attach Bill / Job Sheet (Optional)</Text>
                <TouchableOpacity
                  style={s.attachBox}
                  onPress={handlePickAttachment}
                >
                  <Ionicons name="camera-outline" size={22} color="#1A56DB" />
                  <Text style={s.attachBoxText}>
                    {addRecordModal.attachment ? addRecordModal.attachment.name || 'Photo Attached' : 'Capture or Upload Bill / Invoice'}
                  </Text>
                </TouchableOpacity>
              </View>

              {addRecordModal.error ? <Text style={s.errorText}>{addRecordModal.error}</Text> : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[s.submitBtn, addRecordModal.submitting && { opacity: 0.7 }]}
                disabled={addRecordModal.submitting}
                onPress={handleSubmitRecord}
              >
                {addRecordModal.submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.submitBtnText}>
                    {addRecordModal.recordType === 'SERVICE' ? 'Save Service Record' : 'Save Repair Ticket'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =====================================================================
          MODAL 3: Resolve Issue Modal
      ===================================================================== */}
      <Modal visible={resolveModal.visible} animationType="fade" transparent onRequestClose={() => setResolveModal((p) => ({ ...p, visible: false }))}>
        <View style={s.modalOverlayCenter}>
          <View style={s.dialogCard}>
            <View style={s.resolveIconCircle}>
              <Ionicons name="checkmark-done" size={28} color="#16A34A" />
            </View>
            <Text style={s.dialogTitle}>Resolve Repair Issue?</Text>
            <Text style={s.dialogSubtitle}>Add completion notes before closing this issue.</Text>

            <TextInput
              style={[s.formInput, { height: 60, textAlignVertical: 'top', paddingTop: 8, width: '100%', marginVertical: 10 }]}
              placeholder="e.g. Parts replaced and road test completed."
              value={resolveModal.notes}
              onChangeText={(val) => setResolveModal((p) => ({ ...p, notes: val }))}
              multiline
            />

            <View style={s.dialogButtonRow}>
              <TouchableOpacity
                style={s.dialogCancelBtn}
                onPress={() => setResolveModal({ visible: false, record: null, notes: '', submitting: false })}
                disabled={resolveModal.submitting}
              >
                <Text style={s.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.dialogConfirmBtn, resolveModal.submitting && { opacity: 0.7 }]}
                onPress={handleResolveRecord}
                disabled={resolveModal.submitting}
              >
                {resolveModal.submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.dialogConfirmText}>Mark Resolved</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 4: Searchable Vehicle Dropdown Picker (Bottom Sheet)
      ===================================================================== */}
      <Modal
        visible={vehiclePickerModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setVehiclePickerModalOpen(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.vehiclePickerSheet}>
            {/* Picker Header */}
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalHeaderTitle}>Select Vehicle</Text>
                <Text style={s.modalHeaderSubtitle}>
                  {vehicles.length} trucks available in fleet
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setVehiclePickerModalOpen(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Bar Input */}
            <View style={s.pickerSearchWrapper}>
              <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={s.pickerSearchInput}
                placeholder="Search truck plate (e.g. UP64, 1234)..."
                placeholderTextColor="#94A3B8"
                value={vehicleSearchText}
                onChangeText={setVehicleSearchText}
                autoCorrect={false}
                autoCapitalize="characters"
              />
              {vehicleSearchText ? (
                <TouchableOpacity onPress={() => setVehicleSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Vehicle List */}
            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 10 }}
              keyboardShouldPersistTaps="handled"
            >
              {filteredVehiclesForPicker.length === 0 ? (
                <View style={s.pickerEmptyBox}>
                  <Ionicons name="search-outline" size={36} color="#94A3B8" />
                  <Text style={s.pickerEmptyTitle}>No truck found</Text>
                  <Text style={s.pickerEmptySubtitle}>
                    No vehicles matching "{vehicleSearchText}"
                  </Text>
                </View>
              ) : (
                filteredVehiclesForPicker.map((v) => {
                  const isSel = addRecordModal.vehicleId === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[s.pickerVehicleRow, isSel && s.pickerVehicleRowSelected]}
                      onPress={() => {
                        setAddRecordModal((p) => ({ ...p, vehicleId: v.id }));
                        setVehiclePickerModalOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={s.pickerVehicleLeft}>
                        <View style={[s.truckIconCircle, isSel && { backgroundColor: '#1A56DB' }]}>
                          <Ionicons name="bus" size={18} color={isSel ? '#FFFFFF' : '#1A56DB'} />
                        </View>
                        <View style={s.plateBadge}>
                          <View style={s.plateIndPill}>
                            <Text style={s.plateIndText}>IND</Text>
                          </View>
                          <Text style={s.plateNumberText}>{v.plate}</Text>
                        </View>
                      </View>

                      {isSel ? (
                        <View style={s.checkedCircle}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 5: Lightbox Full-screen Bill Preview
      ===================================================================== */}
      <Modal visible={!!lightboxUri} animationType="fade" transparent onRequestClose={() => setLightboxUri(null)}>
        <View style={s.lightboxOverlay}>
          <TouchableOpacity style={s.lightboxClose} onPress={() => setLightboxUri(null)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {lightboxUri ? (
            <Image source={{ uri: lightboxUri }} style={s.lightboxImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

export default function FleetMaintenanceScreen(props) {
  return (
    <ErrorBoundary>
      <FleetMaintenanceContent {...props} />
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabButtonActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tabButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: '#1A56DB',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  // Action & Filter Bar
  actionFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    maxWidth: 130,
  },
  dropdownPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1A56DB',
    flexShrink: 1,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A56DB',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },

  // Loading & Empty
  centerBox: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A56DB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // Prediction Cards (Tab 1)
  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 6,
  },
  plateIndPill: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  plateIndText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  plateNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  riskBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dueStatsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dueStatItem: {
    flex: 1,
  },
  dueStatLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  dueStatVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  predictionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  predictionSubText: {
    fontSize: 11,
    color: '#64748B',
  },
  logServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A56DB',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logServiceBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Record Cards (Tabs 2 & 3)
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plateBadgeSmall: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  plateNumberSmallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryChipText: {
    color: '#1A56DB',
    fontSize: 11,
    fontWeight: '700',
  },
  priorityTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTagOpen: {
    backgroundColor: '#FEE2E2',
  },
  statusTagOpenText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  statusTagResolved: {
    backgroundColor: '#DCFCE7',
  },
  statusTagResolvedText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 'auto',
  },
  recordBody: {
    gap: 4,
    marginTop: 2,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordRowLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  recordRowVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '500',
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  notesText: {
    fontSize: 11.5,
    color: '#334155',
  },
  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 2,
  },
  billPreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  billPreviewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A56DB',
  },
  noBillText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  resolveBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteRecordBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalHeaderSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  dropdownSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  dropdownItemRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownItemTextSelected: {
    fontWeight: '700',
    color: '#1A56DB',
  },

  // Form Modal
  formModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#0F172A',
  },
  vehiclePickChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  vehiclePickChipActive: {
    backgroundColor: '#1A56DB',
    borderColor: '#1A56DB',
  },
  vehiclePickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  vehiclePickChipTextActive: {
    color: '#FFFFFF',
  },
  attachBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    padding: 12,
    justifyContent: 'center',
  },
  attachBoxText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A56DB',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#1A56DB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Dialog Card
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '88%',
    maxWidth: 340,
    alignItems: 'center',
  },
  resolveIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  dialogSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  dialogButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  dialogCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  dialogConfirmBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  dialogConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  lightboxImage: {
    width: '92%',
    height: '75%',
  },

  // Searchable Vehicle Dropdown Trigger
  vehicleDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    minHeight: 52,
  },
  vehicleDropdownTriggerEmpty: {
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
  },
  vehicleDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  truckIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleTapHint: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  vehiclePlaceholderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  dropdownChevronWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },

  // Vehicle Picker Sheet
  vehiclePickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  pickerSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '600',
  },
  pickerVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerVehicleRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  pickerVehicleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1A56DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerEmptyBox: {
    padding: 30,
    alignItems: 'center',
    gap: 6,
  },
  pickerEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerEmptySubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
});
