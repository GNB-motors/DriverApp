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
  Share,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { BackHeader } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import { pickFromCamera, pickFromGallery } from '../../utils/pickImage';

// ----------------------------------------------------------------------------
// DEF Status Configuration (exact parity with web defLedgerStatus.js)
// ----------------------------------------------------------------------------
const STATUS_CONFIG = {
  COMPLIANT: { label: 'In band', color: '#16A34A', bg: '#DCFCE7', border: '#86EFAC', icon: 'checkmark-circle' },
  FLAGGED: { label: 'Needs review', color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', icon: 'alert-circle' },
  DEFICIT: { label: 'Unlogged burn', color: '#EA580C', bg: '#FFEDD5', border: '#FDBA74', icon: 'warning' },
  LOW_DOSING: { label: 'Low dosing', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', icon: 'trending-down' },
  HIGH_DOSING: { label: 'High dosing', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', icon: 'trending-up' },
  HELD_BACK: { label: 'Held back', color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1', icon: 'information-circle' },
  NOT_ASSESSED: { label: 'Not assessed', color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1', icon: 'information-circle' },
  NOT_APPLICABLE: { label: 'Not applicable', color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1', icon: 'remove-circle' },
  NOT_REPORTED: { label: 'DEF not reported', color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1', icon: 'alert-circle' },
  NO_DATA: { label: 'No telemetry', color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0', icon: 'cloud-offline' },
};

const STATUS_NOTES = {
  COMPLIANT: 'DEF dosing is within the normal share of diesel burned.',
  FLAGGED: 'The CAN DEF level dropped by more than the engine burned, or a logged fill is larger than the tank.',
  DEFICIT: 'The truck burned more DEF than the AdBlue logged for it. Fills may be missing.',
  LOW_DOSING: 'DEF is running below the normal share of diesel. Check for faulty or bypassed SCR system.',
  HIGH_DOSING: 'DEF is running above the normal share of diesel. Check for leaks or a faulty dosing unit.',
  HELD_BACK: 'Findings were computed, but alerts are held back for this account.',
  NOT_ASSESSED: 'Dosing is shown without a calibrated assessment band for this vehicle.',
  NOT_APPLICABLE: 'Vehicle data explicitly identifies that SCR dosing is not required.',
  NOT_REPORTED: "Telematics sends 0 DEF on every hour despite real diesel burn.",
  NO_DATA: 'No hourly FleetEdge telemetry has arrived for this vehicle yet.',
};

const FILTER_CHIPS = [
  { id: 'all', label: 'All vehicles' },
  { id: 'review', label: 'Needs review' },
  { id: 'compliant', label: 'In band (Compliant)' },
  { id: 'deficit', label: 'Unlogged burn (Deficit)' },
  { id: 'dosing', label: 'Dosing out of band' },
  { id: 'heldBack', label: 'Held back' },
  { id: 'noData', label: 'No telemetry' },
];

const FRESHNESS_FILTERS = [
  { id: 'all', label: 'All telemetry' },
  { id: 'fresh', label: 'Fresh telemetry' },
  { id: 'stale', label: 'Stale telemetry' },
  { id: 'none', label: 'No telemetry' },
];

// ----------------------------------------------------------------------------
// Bulletproof Formatter Helpers (No Hermes / Intl RangeError crashes)
// ----------------------------------------------------------------------------
function safeNumber(val, decimals = 1) {
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function safeFormatNumber(val, decimals = 0) {
  const n = Number(val);
  if (!Number.isFinite(n)) return '0';
  try {
    return n.toLocaleString('en-IN', { maximumFractionDigits: decimals });
  } catch {
    return String(Math.round(n));
  }
}

function formatLitres(val, decimals = 1) {
  if (val == null || isNaN(val)) return '—';
  const num = safeNumber(val, decimals);
  return num == null ? '—' : `${safeFormatNumber(num, decimals)} L`;
}

function signedLitres(val, decimals = 1) {
  if (val == null || isNaN(val)) return '—';
  const num = safeNumber(val, decimals);
  if (num == null) return '—';
  const sign = num > 0 ? '+' : '';
  return `${sign}${safeFormatNumber(num, decimals)} L`;
}

function formatMoney(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  return `₹${safeFormatNumber(amount, 0)}`;
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

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${hour12}:${m} ${ampm}`;
  } catch {
    return String(dateStr);
  }
}

function humanizeFlagType(type) {
  if (type === 'DEF_DRAIN_SENSOR') return 'Drain beyond burn';
  if (type === 'IMPOSSIBLE_CLAIM') return 'Impossible fill';
  if (type === 'NEGATIVE_BALANCE') return 'Unlogged burn';
  const str = String(type || 'Flag').toLowerCase().replace(/_/g, ' ');
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ----------------------------------------------------------------------------
// Error Boundary
// ----------------------------------------------------------------------------
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.warn('[DefLedgerScreen ErrorBoundary]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 12, textAlign: 'center' }}>
            AdBlue / DEF Ledger temporarily unavailable
          </Text>
          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 6, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering the ledger.'}
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

// ----------------------------------------------------------------------------
// Main Content
// ----------------------------------------------------------------------------
function DefLedgerContent({ navigation }) {
  const insets = useSafeAreaInsets();
  const { service, branchId, data: managerData } = useManagerData?.() || {};

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [driverList, setDriverList] = useState([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [freshFilter, setFreshFilter] = useState('all');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [freshModalOpen, setFreshModalOpen] = useState(false);

  // Evidence Drawer modal state
  const [evidenceVehicle, setEvidenceVehicle] = useState(null);

  // Log AdBlue Modal state (declared at top before any memo)
  const [logModal, setLogModal] = useState({
    visible: false,
    vehicleId: '',
    driverId: '',
    litres: '',
    amount: '',
    place: '',
    attachment: null,
    submitting: false,
    error: '',
  });

  // Pickers state
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [vehicleSearchText, setVehicleSearchText] = useState('');
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [driverSearchText, setDriverSearchText] = useState('');

  // --------------------------------------------------------------------------
  // Load Ledger Data
  // --------------------------------------------------------------------------
  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!service) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const bId = branchId === 'all' ? undefined : branchId;

      try {
        const [res, driversRes] = await Promise.all([
          service.defLedger(bId),
          service.fuelDrivers ? service.fuelDrivers().catch(() => []) : Promise.resolve([]),
        ]);
        setLedgerData(res || { vehicles: [], totals: {} });
        if (Array.isArray(driversRes) && driversRes.length > 0) {
          setDriverList(driversRes);
        }
      } catch (err) {
        console.warn('[DefLedgerScreen] loadData error', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [service, branchId]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract records & totals
  const rawVehicles = useMemo(() => ledgerData?.vehicles || [], [ledgerData]);
  const totals = useMemo(() => ledgerData?.totals || {}, [ledgerData]);
  const claimsTracked = Boolean(ledgerData?.claimsTracked);

  // Vehicles list for pickers (from ledger + managerData)
  const allFleetVehicles = useMemo(() => {
    const map = new Map();
    // From ledger data
    rawVehicles.forEach((v) => {
      const id = v.vehicleId || v._id || v.id;
      if (id) {
        map.set(id, { id, plate: v.registrationNumber || 'Truck' });
      }
    });
    // From managerData
    (managerData?.vehicles || []).forEach((v) => {
      const id = v.id || v._id;
      if (id && !map.has(id)) {
        map.set(id, { id, plate: v.plate || v.registrationNumber || v.number || 'Truck' });
      }
    });
    return Array.from(map.values());
  }, [rawVehicles, managerData]);

  const filteredVehiclesForPicker = useMemo(() => {
    if (!vehicleSearchText.trim()) return allFleetVehicles;
    const q = vehicleSearchText.trim().toLowerCase().replace(/[\s-]/g, '');
    return allFleetVehicles.filter((v) => {
      const p = String(v.plate || '').toLowerCase().replace(/[\s-]/g, '');
      return p.includes(q);
    });
  }, [allFleetVehicles, vehicleSearchText]);

  const filteredDriversForPicker = useMemo(() => {
    if (!driverSearchText.trim()) return driverList;
    const q = driverSearchText.trim().toLowerCase();
    return driverList.filter((d) => {
      const name = `${d.firstName || d.name || ''} ${d.lastName || ''}`.trim().toLowerCase();
      const lic = String(d.licenseNo || '').toLowerCase();
      return name.includes(q) || lic.includes(q);
    });
  }, [driverList, driverSearchText]);

  const selectedVehicleObj = useMemo(() => {
    return allFleetVehicles.find((v) => v.id === logModal.vehicleId);
  }, [allFleetVehicles, logModal.vehicleId]);

  const selectedDriverObj = useMemo(() => {
    return driverList.find((d) => (d.id || d._id) === logModal.driverId);
  }, [driverList, logModal.driverId]);

  // Stale & Freshness calculations
  const staleCount = useMemo(() => {
    return rawVehicles.filter((v) => v?.freshness?.status === 'STALE').length;
  }, [rawVehicles]);

  const coverageRange = useMemo(() => {
    let from = null;
    let to = null;
    for (const v of rawVehicles) {
      if (v?.coverageFrom && (!from || new Date(v.coverageFrom) < new Date(from))) from = v.coverageFrom;
      if (v?.coverageTo && (!to || new Date(v.coverageTo) > new Date(to))) to = v.coverageTo;
    }
    return { from: formatDate(from), to: formatDate(to) };
  }, [rawVehicles]);

  // Filter computation
  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/[\s-]/g, '');

    return rawVehicles.filter((v) => {
      // Plate search
      if (q) {
        const plate = String(v.registrationNumber || '').toLowerCase().replace(/[\s-]/g, '');
        if (!plate.includes(q)) return false;
      }

      // Status chip filter
      if (statusFilter !== 'all') {
        const st = String(v.status || '').toUpperCase();
        if (statusFilter === 'review' && st !== 'FLAGGED') return false;
        if (statusFilter === 'compliant' && st !== 'COMPLIANT') return false;
        if (statusFilter === 'deficit' && st !== 'DEFICIT') return false;
        if (statusFilter === 'dosing' && st !== 'LOW_DOSING' && st !== 'HIGH_DOSING') return false;
        if (statusFilter === 'heldBack' && !v.alertsSuppressed) return false;
        if (statusFilter === 'noData' && st !== 'NO_DATA') return false;
      }

      // Freshness filter
      if (freshFilter !== 'all') {
        const fs = v?.freshness?.status;
        if (freshFilter === 'fresh' && fs === 'STALE') return false;
        if (freshFilter === 'stale' && fs !== 'STALE') return false;
        if (freshFilter === 'none' && v.status !== 'NO_DATA') return false;
      }

      return true;
    });
  }, [rawVehicles, search, statusFilter, freshFilter]);

  // --------------------------------------------------------------------------
  // Open Log AdBlue Form Modal
  // --------------------------------------------------------------------------
  const openLogModal = async (preselectedVehicleId = '') => {
    const vId = preselectedVehicleId || (allFleetVehicles[0]?.id || '');
    let initialDriverId = '';

    // Auto-fetch driver assignment for this truck if available
    if (vId && service?.fuelAssignment) {
      try {
        const asg = await service.fuelAssignment(vId);
        if (asg?.driverId) {
          initialDriverId = typeof asg.driverId === 'object' ? asg.driverId._id || asg.driverId.id : asg.driverId;
        }
      } catch {
        // Fallback to first driver
      }
    }
    if (!initialDriverId && driverList[0]) {
      initialDriverId = driverList[0].id || driverList[0]._id || '';
    }

    setLogModal({
      visible: true,
      vehicleId: vId,
      driverId: initialDriverId,
      litres: '',
      amount: '',
      place: '',
      attachment: null,
      submitting: false,
      error: '',
    });
  };

  // When vehicle is selected in picker
  const handleSelectVehicle = async (v) => {
    setLogModal((p) => ({ ...p, vehicleId: v.id }));
    setVehiclePickerOpen(false);

    // Auto check assigned driver
    if (service?.fuelAssignment) {
      try {
        const asg = await service.fuelAssignment(v.id);
        if (asg?.driverId) {
          const dId = typeof asg.driverId === 'object' ? asg.driverId._id || asg.driverId.id : asg.driverId;
          setLogModal((p) => ({ ...p, driverId: dId }));
        }
      } catch {
        // Keep existing
      }
    }
  };

  // --------------------------------------------------------------------------
  // Submit Log AdBlue
  // --------------------------------------------------------------------------
  const handleSubmitAdBlue = async () => {
    const { vehicleId, driverId, litres, amount, place, attachment } = logModal;

    if (!vehicleId) {
      setLogModal((p) => ({ ...p, error: 'Please select a vehicle.' }));
      return;
    }
    if (!driverId) {
      setLogModal((p) => ({ ...p, error: 'Please select or assign a driver.' }));
      return;
    }
    if (!litres || isNaN(litres) || Number(litres) <= 0) {
      setLogModal((p) => ({ ...p, error: 'Please enter valid AdBlue litres filled.' }));
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) < 0) {
      setLogModal((p) => ({ ...p, error: 'Please enter total bill amount in ₹.' }));
      return;
    }

    setLogModal((p) => ({ ...p, submitting: true, error: '' }));
    try {
      const bId = branchId === 'all' ? undefined : branchId;
      const payload = {
        vehicleId,
        driverId,
        litres: Number(litres),
        amount: Number(amount),
        place: place.trim(),
        filledAt: new Date().toISOString(),
      };

      await service.createAdBlueLog(payload, attachment, bId);
      Alert.alert('Recorded Successfully', 'AdBlue purchase log saved to ledger.');
      setLogModal((p) => ({ ...p, visible: false, submitting: false }));
      loadData(true);
    } catch (err) {
      setLogModal((p) => ({
        ...p,
        submitting: false,
        error: err?.response?.data?.message || err?.message || 'Could not save AdBlue log.',
      }));
    }
  };

  // --------------------------------------------------------------------------
  // Export CSV Feature (using React Native Share)
  // --------------------------------------------------------------------------
  const handleExportCSV = async () => {
    if (!filteredVehicles.length) {
      Alert.alert('Export', 'No vehicles available to export.');
      return;
    }

    try {
      const headers = [
        'Vehicle',
        'Logged AdBlue (L)',
        'DEF Burned (L)',
        'Sensor Fills (L)',
        'Balance (L)',
        'DEF % Diesel',
        'Status',
        'Flags',
        'Alert State',
        'Telemetry Window',
      ];

      const rows = filteredVehicles.map((v) => {
        const coverage = v.coverageFrom && v.coverageTo ? `${formatDate(v.coverageFrom)} - ${formatDate(v.coverageTo)}` : 'No telemetry';
        return [
          `"${v.registrationNumber || 'TRUCK'}"`,
          v.claimedAdblueL != null ? v.claimedAdblueL : 'Not logged',
          v.telemetryDefL != null ? v.telemetryDefL : '—',
          v.sensorFillL != null ? v.sensorFillL : '—',
          v.expectedBalanceL != null ? v.expectedBalanceL : '—',
          v.dosingRatioPct != null ? `${v.dosingRatioPct}%` : '—',
          `"${(STATUS_CONFIG[v.status] || STATUS_CONFIG.NO_DATA).label}"`,
          v.flagCount ?? (v.flags?.length || 0),
          v.alertsSuppressed ? 'Held back' : 'Active',
          `"${coverage}"`,
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');

      await Share.share({
        title: 'AdBlue-DEF-Ledger.csv',
        message: csvContent,
      });
    } catch (err) {
      Alert.alert('Export Error', err?.message || 'Could not share CSV export.');
    }
  };

  // --------------------------------------------------------------------------
  // Pick Photo Attachment (Camera or Gallery)
  // --------------------------------------------------------------------------
  const handlePickAttachment = () => {
    Alert.alert('Attach Bill / Fuel Slip', 'Select photo source:', [
      {
        text: 'Camera',
        onPress: async () => {
          const file = await pickFromCamera();
          if (file) setLogModal((p) => ({ ...p, attachment: file }));
        },
      },
      {
        text: 'Photo Gallery',
        onPress: async () => {
          const file = await pickFromGallery();
          if (file) setLogModal((p) => ({ ...p, attachment: file }));
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
            setLogModal((p) => ({
              ...p,
              attachment: { uri: a.uri, name: a.name || 'slip.pdf', type: a.mimeType || 'application/pdf' },
            }));
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={s.container}>
      {/* Top Back Header */}
      <BackHeader
        title="AdBlue / DEF Ledger"
        subtitle="Logged purchases, telemetry consumption & sensor reconciliation"
        onBack={() => navigation.goBack()}
      />

      {/* Action Bar: Log AdBlue, Export CSV & Refresh */}
      <View style={s.topActionBar}>
        <TouchableOpacity
          style={s.logAdBluePrimaryBtn}
          onPress={() => openLogModal()}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={17} color="#FFFFFF" />
          <Text style={s.logAdBluePrimaryBtnText}>Log AdBlue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.exportOutlineBtn}
          onPress={handleExportCSV}
          activeOpacity={0.8}
        >
          <Ionicons name="share-outline" size={16} color="#1A56DB" />
          <Text style={s.exportOutlineBtnText}>Export CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.refreshIconBtn}
          onPress={() => loadData(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={['#1A56DB']} />}
      >
        {/* KPI Metric Summary Grid */}
        <View style={s.kpiGrid}>
          {/* Card 1: Registered Trucks */}
          <View style={s.kpiCard}>
            <View style={s.kpiIconCircle}>
              <Ionicons name="bus-outline" size={18} color="#1A56DB" />
            </View>
            <Text style={s.kpiVal}>{totals.vehicles ?? rawVehicles.length}</Text>
            <Text style={s.kpiLabel}>Registered Trucks</Text>
            <Text style={s.kpiNote}>
              {totals.withData ?? rawVehicles.length} with data
              {staleCount > 0 ? ` · ${staleCount} stale` : ''}
            </Text>
          </View>

          {/* Card 2: AdBlue Logged */}
          <View style={s.kpiCard}>
            <View style={[s.kpiIconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="receipt-outline" size={18} color="#4F46E5" />
            </View>
            <Text style={[s.kpiVal, { color: '#4F46E5' }]}>
              {claimsTracked ? formatLitres(totals.claimedAdblueL, 0) : 'Not logged'}
            </Text>
            <Text style={s.kpiLabel}>AdBlue Logged</Text>
            <Text style={s.kpiNote}>
              Sensors saw {formatLitres(totals.sensorFillL, 0)} go in
            </Text>
          </View>

          {/* Card 3: DEF Burned */}
          <View style={s.kpiCard}>
            <View style={[s.kpiIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="flame-outline" size={18} color="#16A34A" />
            </View>
            <Text style={[s.kpiVal, { color: '#16A34A' }]}>
              {formatLitres(totals.telemetryDefL, 0)}
            </Text>
            <Text style={s.kpiLabel}>DEF Burned</Text>
            <Text style={s.kpiNote}>
              Dosing {totals.dosingRatioPct != null ? `${totals.dosingRatioPct}%` : '—'} of diesel
            </Text>
          </View>

          {/* Card 4: Needs Review */}
          <View style={s.kpiCard}>
            <View style={[s.kpiIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            </View>
            <Text style={[s.kpiVal, { color: '#DC2626' }]}>
              {totals.flagged ?? 0}
            </Text>
            <Text style={s.kpiLabel}>Needs Review</Text>
            <Text style={s.kpiNote}>Drains & impossible fills</Text>
          </View>
        </View>

        {/* Telemetry Window Banner */}
        <View style={s.windowBanner}>
          <View style={s.windowRow}>
            <Ionicons name="time-outline" size={14} color="#1A56DB" />
            <Text style={s.windowTitle}>Telemetry Coverage Window:</Text>
            <Text style={s.windowSpan}>
              {coverageRange.from !== '—' && coverageRange.to !== '—'
                ? `${coverageRange.from} – ${coverageRange.to}`
                : 'No telemetry span'}
            </Text>
          </View>
          <Text style={s.windowNote}>
            Telemetry older than 48h is marked stale. Each truck covers its own span.
          </Text>
        </View>

        {/* Search & Filter Bar */}
        <View style={s.filterRow}>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search truck plate (e.g. UP64)..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="characters"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Status Dropdown Pill */}
          <TouchableOpacity
            style={s.filterDropdownPill}
            onPress={() => setFilterModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={s.filterDropdownPillText} numberOfLines={1}>
              {FILTER_CHIPS.find((c) => c.id === statusFilter)?.label || 'Status'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#1A56DB" />
          </TouchableOpacity>

          {/* Freshness Dropdown Pill */}
          <TouchableOpacity
            style={[s.filterDropdownPill, { maxWidth: 110 }]}
            onPress={() => setFreshModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={s.filterDropdownPillText} numberOfLines={1}>
              {FRESHNESS_FILTERS.find((f) => f.id === freshFilter)?.label || 'Freshness'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#1A56DB" />
          </TouchableOpacity>
        </View>

        {/* Ledger Vehicles List */}
        {loading ? (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color="#1A56DB" />
            <Text style={s.loadingText}>Loading fleet DEF consumption ledger...</Text>
          </View>
        ) : filteredVehicles.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="flask-outline" size={44} color="#94A3B8" />
            <Text style={s.emptyTitle}>No Vehicles Found</Text>
            <Text style={s.emptySubtitle}>No trucks matching the selected status or plate query.</Text>
            <TouchableOpacity style={s.emptyResetBtn} onPress={() => { setSearch(''); setStatusFilter('all'); setFreshFilter('all'); }}>
              <Text style={s.emptyResetBtnText}>Reset All Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredVehicles.map((v, index) => {
            const statusCfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.NO_DATA;
            const isVerified = claimsTracked && (v.flagCount ?? (v.flags?.length || 0)) === 0;
            const flagsCount = v.flagCount ?? (v.flags?.length || 0);
            const fillsCount = v.sensorFillCount ?? (v.fills?.length || 0);
            const band = v.defBand || {};
            const isNegativeBalance = v.expectedBalanceL != null && v.expectedBalanceL < 0;

            return (
              <View
                key={v.vehicleId || v.registrationNumber || `def-truck-${index}`}
                style={s.truckCard}
              >
                {/* Truck Header */}
                <View style={s.truckCardHeader}>
                  <View style={s.plateBadge}>
                    <View style={s.plateIndPill}>
                      <Text style={s.plateIndText}>IND</Text>
                    </View>
                    <Text style={s.plateNumberText}>{v.registrationNumber || 'TRUCK'}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isVerified && (
                      <View style={s.verifiedTag}>
                        <Ionicons name="checkmark-circle" size={12} color="#166534" />
                        <Text style={s.verifiedTagText}>Verified</Text>
                      </View>
                    )}

                    <View style={[s.statusTag, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
                      <Text style={[s.statusTagText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                  </View>
                </View>

                {/* 4 Core Metrics Grid */}
                <View style={s.metricsGrid}>
                  <View style={s.metricBox}>
                    <Text style={s.metricBoxLabel}>LOGGED ADBLUE</Text>
                    <Text style={s.metricBoxVal}>
                      {claimsTracked ? formatLitres(v.claimedAdblueL) : 'Not logged'}
                    </Text>
                  </View>

                  <View style={s.metricBox}>
                    <Text style={s.metricBoxLabel}>DEF BURNED</Text>
                    <Text style={[s.metricBoxVal, { color: '#0F172A' }]}>
                      {formatLitres(v.telemetryDefL)}
                    </Text>
                  </View>

                  <View style={s.metricBox}>
                    <Text style={s.metricBoxLabel}>SENSOR FILLS</Text>
                    <Text style={[s.metricBoxVal, { color: '#0284C7' }]}>
                      {formatLitres(v.sensorFillL)}
                    </Text>
                  </View>

                  <View style={s.metricBox}>
                    <Text style={s.metricBoxLabel}>BALANCE</Text>
                    <Text
                      style={[
                        s.metricBoxVal,
                        isNegativeBalance ? { color: '#DC2626' } : { color: '#16A34A' },
                      ]}
                    >
                      {claimsTracked ? signedLitres(v.expectedBalanceL) : '—'}
                    </Text>
                  </View>
                </View>

                {/* Dosing Details & Coverage */}
                <View style={s.dosingRow}>
                  <Ionicons name="water-outline" size={14} color="#64748B" />
                  <Text style={s.dosingText}>
                    DEF{' '}
                    <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                      {v.dosingRatioPct != null ? `${v.dosingRatioPct}%` : '—'}
                    </Text>{' '}
                    of {formatLitres(v.fuelUsedL, 0)} diesel
                    {band.min != null && band.max != null ? ` · normal ${band.min}–${band.max}%` : ''}
                  </Text>
                </View>

                {/* Card Actions Footer */}
                <View style={s.truckCardFooter}>
                  <TouchableOpacity
                    style={s.evidenceBtn}
                    onPress={() => setEvidenceVehicle(v)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={14} color="#1A56DB" />
                    <Text style={s.evidenceBtnText}>
                      View Evidence {flagsCount > 0 ? `(${flagsCount} flags)` : fillsCount > 0 ? `(${fillsCount} fills)` : ''}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.logBtnOnCard}
                    onPress={() => openLogModal(v.vehicleId)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                    <Text style={s.logBtnOnCardText}>Log AdBlue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* =====================================================================
          MODAL 1: Status Filter Bottom Sheet
      ===================================================================== */}
      <Modal visible={filterModalOpen} animationType="slide" transparent onRequestClose={() => setFilterModalOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.sheetCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>Filter by DEF Status</Text>
              <TouchableOpacity onPress={() => setFilterModalOpen(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              {FILTER_CHIPS.map((chip) => {
                const isSel = statusFilter === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[s.sheetOptionRow, isSel && s.sheetOptionRowSelected]}
                    onPress={() => {
                      setStatusFilter(chip.id);
                      setFilterModalOpen(false);
                    }}
                  >
                    <Ionicons
                      name={isSel ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isSel ? '#1A56DB' : '#94A3B8'}
                    />
                    <Text style={[s.sheetOptionText, isSel && s.sheetOptionTextSelected]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 2: Freshness Filter Bottom Sheet
      ===================================================================== */}
      <Modal visible={freshModalOpen} animationType="slide" transparent onRequestClose={() => setFreshModalOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.sheetCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>Filter by Telemetry Freshness</Text>
              <TouchableOpacity onPress={() => setFreshModalOpen(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              {FRESHNESS_FILTERS.map((f) => {
                const isSel = freshFilter === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[s.sheetOptionRow, isSel && s.sheetOptionRowSelected]}
                    onPress={() => {
                      setFreshFilter(f.id);
                      setFreshModalOpen(false);
                    }}
                  >
                    <Ionicons
                      name={isSel ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isSel ? '#1A56DB' : '#94A3B8'}
                    />
                    <Text style={[s.sheetOptionText, isSel && s.sheetOptionTextSelected]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 3: Slide-Up Evidence Drawer (Exact Parity with Web DefDetailDrawer)
      ===================================================================== */}
      <Modal visible={!!evidenceVehicle} animationType="slide" transparent onRequestClose={() => setEvidenceVehicle(null)}>
        <View style={s.modalOverlay}>
          <View style={s.drawerSheetCard}>
            {/* Drawer Header */}
            <View style={s.modalHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={s.plateBadge}>
                    <View style={s.plateIndPill}>
                      <Text style={s.plateIndText}>IND</Text>
                    </View>
                    <Text style={s.plateNumberText}>{evidenceVehicle?.registrationNumber || 'TRUCK'}</Text>
                  </View>
                  {evidenceVehicle && (
                    <View
                      style={[
                        s.statusTag,
                        {
                          backgroundColor: (STATUS_CONFIG[evidenceVehicle.status] || STATUS_CONFIG.NO_DATA).bg,
                          borderColor: (STATUS_CONFIG[evidenceVehicle.status] || STATUS_CONFIG.NO_DATA).border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.statusTagText,
                          { color: (STATUS_CONFIG[evidenceVehicle.status] || STATUS_CONFIG.NO_DATA).color },
                        ]}
                      >
                        {(STATUS_CONFIG[evidenceVehicle.status] || STATUS_CONFIG.NO_DATA).label}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={s.modalHeaderSubtitle}>
                  {evidenceVehicle?.coverageFrom && evidenceVehicle?.coverageTo
                    ? `Telemetry: ${formatDate(evidenceVehicle.coverageFrom)} – ${formatDate(evidenceVehicle.coverageTo)}`
                    : 'No telemetry span'}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setEvidenceVehicle(null)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
              {evidenceVehicle && (
                <>
                  {/* Status Explanation Card */}
                  <View style={s.drawerExplanationBox}>
                    <Text style={s.drawerExplanationText}>
                      {STATUS_NOTES[evidenceVehicle.status] || STATUS_NOTES.NO_DATA}
                    </Text>
                    {evidenceVehicle.lastComputedAt && (
                      <Text style={s.drawerComputedAtText}>
                        Calculated: {formatDateTime(evidenceVehicle.lastComputedAt)}
                      </Text>
                    )}
                  </View>

                  {/* 4 Reconciliation Metrics Grid */}
                  <View style={s.metricsGrid}>
                    <View style={s.metricBox}>
                      <Text style={s.metricBoxLabel}>LOGGED ADBLUE</Text>
                      <Text style={s.metricBoxVal}>
                        {claimsTracked ? formatLitres(evidenceVehicle.claimedAdblueL) : 'Not logged'}
                      </Text>
                    </View>

                    <View style={s.metricBox}>
                      <Text style={s.metricBoxLabel}>DEF BURNED</Text>
                      <Text style={s.metricBoxVal}>
                        {formatLitres(evidenceVehicle.telemetryDefL)}
                      </Text>
                    </View>

                    <View style={s.metricBox}>
                      <Text style={s.metricBoxLabel}>SENSOR FILLS</Text>
                      <Text style={s.metricBoxVal}>
                        {formatLitres(evidenceVehicle.sensorFillL)}
                      </Text>
                    </View>

                    <View style={s.metricBox}>
                      <Text style={s.metricBoxLabel}>BALANCE</Text>
                      <Text
                        style={[
                          s.metricBoxVal,
                          evidenceVehicle.expectedBalanceL != null && evidenceVehicle.expectedBalanceL < 0
                            ? { color: '#DC2626' }
                            : { color: '#16A34A' },
                        ]}
                      >
                        {claimsTracked ? signedLitres(evidenceVehicle.expectedBalanceL) : '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Review Flags Section */}
                  <View>
                    <View style={s.sectionHeaderRow}>
                      <Ionicons name="warning-outline" size={16} color="#DC2626" />
                      <Text style={s.sectionHeaderTitle}>
                        Review Flags ({evidenceVehicle.flags?.length || 0})
                      </Text>
                    </View>

                    {(!evidenceVehicle.flags || evidenceVehicle.flags.length === 0) ? (
                      <View style={s.emptySectionBox}>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#16A34A" />
                        <Text style={s.emptySectionText}>No flags recorded for this vehicle.</Text>
                      </View>
                    ) : (
                      evidenceVehicle.flags.map((flag, idx) => (
                        <View key={`${flag.type}-${idx}`} style={s.flagItemCard}>
                          <View style={s.flagHeader}>
                            <View style={s.flagBadge}>
                              <Text style={s.flagBadgeText}>{humanizeFlagType(flag.type)}</Text>
                            </View>
                            {flag.litres != null && (
                              <Text style={s.flagLitresText}>{formatLitres(flag.litres)}</Text>
                            )}
                          </View>
                          <Text style={s.flagMessageText}>{flag.message}</Text>
                          {flag.at && (
                            <Text style={s.flagTimestamp}>{formatDateTime(flag.at)}</Text>
                          )}
                        </View>
                      ))
                    )}
                  </View>

                  {/* Sensor Fills Section */}
                  <View>
                    <View style={s.sectionHeaderRow}>
                      <Ionicons name="water" size={16} color="#0284C7" />
                      <Text style={s.sectionHeaderTitle}>
                        Sensor Fills Detected ({evidenceVehicle.fills?.length || 0})
                      </Text>
                    </View>

                    {(!evidenceVehicle.fills || evidenceVehicle.fills.length === 0) ? (
                      <View style={s.emptySectionBox}>
                        <Ionicons name="information-circle-outline" size={24} color="#94A3B8" />
                        <Text style={s.emptySectionText}>No CAN-level tank fills detected yet.</Text>
                      </View>
                    ) : (
                      evidenceVehicle.fills.map((fill, idx) => (
                        <View key={`${fill.at}-${idx}`} style={s.fillItemRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="water" size={14} color="#0284C7" />
                            <Text style={s.fillTimestamp}>{formatDateTime(fill.at)}</Text>
                          </View>
                          <Text style={s.fillLitresText}>+{formatLitres(fill.litres)}</Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Action in Drawer */}
                  <TouchableOpacity
                    style={s.drawerLogBtn}
                    onPress={() => {
                      const vId = evidenceVehicle.vehicleId;
                      setEvidenceVehicle(null);
                      openLogModal(vId);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                    <Text style={s.drawerLogBtnText}>Log AdBlue for this truck</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 4: Log AdBlue Form Modal
      ===================================================================== */}
      <Modal visible={logModal.visible} animationType="slide" transparent onRequestClose={() => setLogModal((p) => ({ ...p, visible: false }))}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.formModalCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalHeaderTitle}>Log AdBlue Top-up</Text>
                <Text style={s.modalHeaderSubtitle}>Record manual AdBlue purchase and bill invoice</Text>
              </View>
              <TouchableOpacity onPress={() => setLogModal((p) => ({ ...p, visible: false }))} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
              {/* Vehicle Dropdown Trigger */}
              <View>
                <Text style={s.inputLabel}>Select Vehicle *</Text>
                <TouchableOpacity
                  style={[s.vehicleDropdownTrigger, !selectedVehicleObj && s.vehicleDropdownTriggerEmpty]}
                  onPress={() => {
                    setVehicleSearchText('');
                    setVehiclePickerOpen(true);
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

              {/* Driver Dropdown Trigger */}
              <View>
                <Text style={s.inputLabel}>Driver *</Text>
                <TouchableOpacity
                  style={s.vehicleDropdownTrigger}
                  onPress={() => {
                    setDriverSearchText('');
                    setDriverPickerOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={s.vehicleDropdownLeft}>
                    <View style={[s.truckIconCircle, { backgroundColor: '#F0FDF4' }]}>
                      <Ionicons name="person-outline" size={18} color="#16A34A" />
                    </View>
                    {selectedDriverObj ? (
                      <View style={{ gap: 1 }}>
                        <Text style={s.driverNameText}>
                          {`${selectedDriverObj.firstName || selectedDriverObj.name || 'Driver'} ${selectedDriverObj.lastName || ''}`.trim()}
                        </Text>
                        <Text style={s.vehicleTapHint}>
                          Lic: {selectedDriverObj.licenseNo || 'Available on file'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={s.vehiclePlaceholderText}>Select Assigned Driver</Text>
                    )}
                  </View>
                  <View style={s.dropdownChevronWrapper}>
                    <Ionicons name="chevron-down" size={14} color="#64748B" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Litres & Amount Inputs */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>AdBlue Litres *</Text>
                  <TextInput
                    style={s.formInput}
                    value={logModal.litres}
                    onChangeText={(val) => setLogModal((p) => ({ ...p, litres: val }))}
                    keyboardType="numeric"
                    placeholder="e.g. 20"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Total Amount (₹) *</Text>
                  <TextInput
                    style={s.formInput}
                    value={logModal.amount}
                    onChangeText={(val) => setLogModal((p) => ({ ...p, amount: val }))}
                    keyboardType="numeric"
                    placeholder="₹ 1200"
                  />
                </View>
              </View>

              {/* Location / Depot */}
              <View>
                <Text style={s.inputLabel}>Filling Location / Station (Optional)</Text>
                <TextInput
                  style={s.formInput}
                  value={logModal.place}
                  onChangeText={(val) => setLogModal((p) => ({ ...p, place: val }))}
                  placeholder="e.g. Delhi Ring Road Fuel Depot"
                />
              </View>

              {/* Invoice Attachment */}
              <View>
                <Text style={s.inputLabel}>Attach AdBlue Slip / Bill Photo (Optional)</Text>
                <TouchableOpacity
                  style={s.attachBox}
                  onPress={handlePickAttachment}
                >
                  <Ionicons name="camera-outline" size={22} color="#1A56DB" />
                  <Text style={s.attachBoxText}>
                    {logModal.attachment ? logModal.attachment.name || 'Photo Attached' : 'Capture or Upload Bill / Invoice'}
                  </Text>
                </TouchableOpacity>
              </View>

              {logModal.error ? <Text style={s.errorText}>{logModal.error}</Text> : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[s.submitBtn, logModal.submitting && { opacity: 0.7 }]}
                disabled={logModal.submitting}
                onPress={handleSubmitAdBlue}
              >
                {logModal.submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.submitBtnText}>Save AdBlue Entry</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =====================================================================
          MODAL 5: Searchable Vehicle Picker
      ===================================================================== */}
      <Modal visible={vehiclePickerOpen} animationType="slide" transparent onRequestClose={() => setVehiclePickerOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.pickerSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalHeaderTitle}>Select Vehicle</Text>
                <Text style={s.modalHeaderSubtitle}>{allFleetVehicles.length} trucks in fleet</Text>
              </View>
              <TouchableOpacity onPress={() => setVehiclePickerOpen(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={s.pickerSearchWrapper}>
              <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={s.pickerSearchInput}
                placeholder="Search truck plate (e.g. UP64, 1234)..."
                placeholderTextColor="#94A3B8"
                value={vehicleSearchText}
                onChangeText={setVehicleSearchText}
                autoCapitalize="characters"
              />
              {vehicleSearchText ? (
                <TouchableOpacity onPress={() => setVehicleSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
              {filteredVehiclesForPicker.length === 0 ? (
                <View style={s.pickerEmptyBox}>
                  <Ionicons name="search-outline" size={32} color="#94A3B8" />
                  <Text style={s.pickerEmptyTitle}>No truck found</Text>
                </View>
              ) : (
                filteredVehiclesForPicker.map((v) => {
                  const isSel = logModal.vehicleId === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[s.pickerVehicleRow, isSel && s.pickerVehicleRowSelected]}
                      onPress={() => handleSelectVehicle(v)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
                        <Ionicons name="checkmark-circle" size={20} color="#1A56DB" />
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
          MODAL 6: Searchable Driver Picker
      ===================================================================== */}
      <Modal visible={driverPickerOpen} animationType="slide" transparent onRequestClose={() => setDriverPickerOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.pickerSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalHeaderTitle}>Select Driver</Text>
                <Text style={s.modalHeaderSubtitle}>{driverList.length} drivers available</Text>
              </View>
              <TouchableOpacity onPress={() => setDriverPickerOpen(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={s.pickerSearchWrapper}>
              <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={s.pickerSearchInput}
                placeholder="Search driver by name or license..."
                placeholderTextColor="#94A3B8"
                value={driverSearchText}
                onChangeText={setDriverSearchText}
              />
              {driverSearchText ? (
                <TouchableOpacity onPress={() => setDriverSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
              {filteredDriversForPicker.length === 0 ? (
                <View style={s.pickerEmptyBox}>
                  <Ionicons name="people-outline" size={32} color="#94A3B8" />
                  <Text style={s.pickerEmptyTitle}>No drivers found</Text>
                </View>
              ) : (
                filteredDriversForPicker.map((d) => {
                  const dId = d.id || d._id;
                  const isSel = logModal.driverId === dId;
                  const name = `${d.firstName || d.name || 'Driver'} ${d.lastName || ''}`.trim();
                  return (
                    <TouchableOpacity
                      key={dId}
                      style={[s.pickerVehicleRow, isSel && s.pickerVehicleRowSelected]}
                      onPress={() => {
                        setLogModal((p) => ({ ...p, driverId: dId }));
                        setDriverPickerOpen(false);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[s.truckIconCircle, isSel && { backgroundColor: '#1A56DB' }]}>
                          <Ionicons name="person" size={18} color={isSel ? '#FFFFFF' : '#1A56DB'} />
                        </View>
                        <View>
                          <Text style={s.driverNameText}>{name}</Text>
                          <Text style={s.vehicleTapHint}>Lic: {d.licenseNo || 'Available'}</Text>
                        </View>
                      </View>
                      {isSel ? (
                        <Ionicons name="checkmark-circle" size={20} color="#1A56DB" />
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
    </View>
  );
}

export default function DefLedgerScreen(props) {
  return (
    <ErrorBoundary>
      <DefLedgerContent {...props} />
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Top Action Bar
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  logAdBluePrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1A56DB',
    paddingVertical: 9,
    borderRadius: 8,
  },
  logAdBluePrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  exportOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  exportOutlineBtnText: {
    color: '#1A56DB',
    fontWeight: '700',
    fontSize: 12.5,
  },
  refreshIconBtn: {
    padding: 9,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  kpiIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  kpiNote: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },

  // Window Banner
  windowBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 4,
  },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  windowTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E40AF',
  },
  windowSpan: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1A56DB',
  },
  windowNote: {
    fontSize: 11,
    color: '#3B82F6',
  },

  // Filter Row
  filterRow: {
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
  filterDropdownPill: {
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
  filterDropdownPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1A56DB',
    flexShrink: 1,
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
  emptyResetBtn: {
    backgroundColor: '#1A56DB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyResetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // Truck Card
  truckCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  truckCardHeader: {
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
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // 4 Core Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricBoxLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  metricBoxVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },

  // Dosing Row
  dosingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dosingText: {
    fontSize: 11.5,
    color: '#475569',
  },

  // Card Footer
  truckCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  evidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  evidenceBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1A56DB',
  },
  logBtnOnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A56DB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  logBtnOnCardText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11.5,
  },

  // Modals Overlay & Sheets
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  drawerSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 20,
  },
  formModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
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

  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  sheetOptionRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  sheetOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  sheetOptionTextSelected: {
    fontWeight: '700',
    color: '#1A56DB',
  },

  // Evidence Drawer Elements
  drawerExplanationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  drawerExplanationText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  drawerComputedAtText: {
    fontSize: 10.5,
    color: '#64748B',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  emptySectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  emptySectionText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  flagItemCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
    gap: 4,
    marginBottom: 6,
  },
  flagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flagBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  flagBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#92400E',
  },
  flagLitresText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  flagMessageText: {
    fontSize: 11.5,
    color: '#78350F',
  },
  flagTimestamp: {
    fontSize: 10,
    color: '#92400E',
  },
  fillItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 10,
    marginBottom: 6,
  },
  fillTimestamp: {
    fontSize: 11.5,
    color: '#0369A1',
    fontWeight: '500',
  },
  fillLitresText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  drawerLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1A56DB',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  drawerLogBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },

  // Form Elements
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
  vehicleDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    minHeight: 50,
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
    width: 34,
    height: 34,
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
  driverNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownChevronWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
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

  // Picker Sheet Elements
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
  pickerEmptyBox: {
    padding: 30,
    alignItems: 'center',
    gap: 6,
  },
  pickerEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});
