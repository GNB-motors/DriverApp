import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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

  // Vehicles for selection
  const vehicles = useMemo(() => {
    return Array.isArray(managerData?.vehicles) ? managerData.vehicles : [];
  }, [managerData]);

  // Upload Fuel Bill state
  const [uploadBillModal, setUploadBillModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [fuelType, setFuelType] = useState('DIESEL');
  const [fillingType, setFillingType] = useState('FULL_TANK');

  // Enter by Hand state
  const [manualFuelModal, setManualFuelModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    vehicleId: '',
    fuelType: 'DIESEL',
    fillingType: 'FULL_TANK',
    litres: '',
    rate: '',
    amountInr: '',
    odometerReading: '',
    stationName: '',
    refuelTime: new Date().toISOString().slice(0, 16),
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualSuccess, setManualSuccess] = useState('');

  // Bulk WhatsApp Chat state
  const [whatsappChatModal, setWhatsappChatModal] = useState(false);
  const [chatZipFile, setChatZipFile] = useState(null);
  const [chatUploading, setChatUploading] = useState(false);
  const [chatUploadPercent, setChatUploadPercent] = useState(0);
  const [chatJobStatus, setChatJobStatus] = useState(null);
  const chatPollTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (chatPollTimer.current) clearInterval(chatPollTimer.current);
    };
  }, []);

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

  // Upload Handlers for Fuel Bill
  const pickCameraPhoto = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        mediaTypes: ['images'],
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setUploadFiles((prev) => [...prev, ...res.assets]);
      }
    } catch {
      Alert.alert('Camera Error', 'Could not access device camera.');
    }
  };

  const pickGalleryPhotos = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.85,
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setUploadFiles((prev) => [...prev, ...res.assets]);
      }
    } catch {
      Alert.alert('Gallery Error', 'Could not open photo library.');
    }
  };

  const pickDocumentFiles = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setUploadFiles((prev) => [...prev, ...res.assets]);
      }
    } catch {
      Alert.alert('File Error', 'Could not pick files.');
    }
  };

  const submitManagerBillUpload = async () => {
    if (!uploadFiles.length) {
      setUploadError('Please take a photo or select at least one bill image.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    const bId = branchId === 'all' ? undefined : branchId;

    try {
      if (uploadFiles.length === 1 && selectedTruckId) {
        await service.uploadBillPhoto(
          uploadFiles[0],
          {
            vehicleId: selectedTruckId,
            fuelType,
            fillingType,
          },
          bId
        );
        setUploadSuccess('Bill uploaded & saved successfully!');
      } else {
        const vehicle = vehicles.find((v) => (v.id || v._id) === selectedTruckId);
        const truckPlate = vehicle?.registrationNumber || '';
        for (let i = 0; i < uploadFiles.length; i++) {
          const clientId = `upload-${Date.now()}-${i}`;
          await service.uploadBillCapture(uploadFiles[i], clientId, { truck: truckPlate, kind: fuelType }, bId);
        }
        setUploadSuccess(`${uploadFiles.length} bill(s) uploaded successfully!`);
      }
      setUploadFiles([]);
      loadFuelLogs(true);
      setTimeout(() => {
        setUploadBillModal(false);
        setUploadSuccess('');
      }, 1500);
    } catch (err) {
      setUploadError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Enter by Hand Manual Submit
  const submitManualFuelLog = async () => {
    if (!manualForm.vehicleId) {
      setManualError('Please select a vehicle first.');
      return;
    }
    const litresNum = Number(manualForm.litres);
    if (!litresNum || litresNum <= 0 || isNaN(litresNum)) {
      setManualError('Please enter a valid fuel volume in litres.');
      return;
    }
    setManualSubmitting(true);
    setManualError('');
    setManualSuccess('');

    try {
      const payload = {
        vehicleId: manualForm.vehicleId,
        fuelType: manualForm.fuelType,
        fillingType: manualForm.fillingType,
        litres: litresNum,
        rate: manualForm.rate ? Number(manualForm.rate) : undefined,
        totalCost: manualForm.amountInr
          ? Number(manualForm.amountInr)
          : manualForm.rate && litresNum
          ? Number((Number(manualForm.rate) * litresNum).toFixed(2))
          : undefined,
        odometerReading: manualForm.odometerReading ? Number(manualForm.odometerReading) : undefined,
        petrolPump: manualForm.stationName.trim() || undefined,
        refuelTime: manualForm.refuelTime
          ? new Date(manualForm.refuelTime).toISOString()
          : new Date().toISOString(),
      };

      await service.fuelSave(payload);
      setManualSuccess('Fuel log recorded successfully!');
      loadFuelLogs(true);
      setTimeout(() => {
        setManualFuelModal(false);
        setManualSuccess('');
      }, 1200);
    } catch (err) {
      setManualError(err?.message || 'Could not record fuel log. Please try again.');
    } finally {
      setManualSubmitting(false);
    }
  };

  // WhatsApp Chat Bulk Upload
  const pickZipFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setChatZipFile(res.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Could not select zip file.');
    }
  };

  const submitWhatsappChatUpload = async () => {
    if (!chatZipFile) {
      Alert.alert('Select File', 'Please select a WhatsApp chat export .zip file first.');
      return;
    }
    setChatUploading(true);
    setChatUploadPercent(0);
    setChatJobStatus('Uploading chat archive to server…');

    try {
      const res = await service.uploadWhatsappExport(chatZipFile, (progressEvent) => {
        if (progressEvent.total) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setChatUploadPercent(pct);
        }
      });

      const jobId = res?.jobId || res?.data?.jobId;
      if (jobId) {
        setChatJobStatus('Chat uploaded! Processing media and fuel receipts on server…');
        let pollCount = 0;
        chatPollTimer.current = setInterval(async () => {
          pollCount += 1;
          try {
            const job = await service.getChatExportJob(jobId);
            if (job?.status === 'completed' || job?.completed || pollCount > 30) {
              clearInterval(chatPollTimer.current);
              setChatUploading(false);
              setChatJobStatus('Chat archive imported successfully!');
              loadFuelLogs(true);
              setTimeout(() => {
                setWhatsappChatModal(false);
                setChatZipFile(null);
                setChatJobStatus(null);
              }, 1800);
            }
          } catch {
            if (pollCount > 25) {
              clearInterval(chatPollTimer.current);
              setChatUploading(false);
              loadFuelLogs(true);
            }
          }
        }, 3000);
      } else {
        setChatUploading(false);
        Alert.alert('Import Started', 'WhatsApp chat upload received. Processing in background.');
        setWhatsappChatModal(false);
        setChatZipFile(null);
        loadFuelLogs(true);
      }
    } catch (err) {
      setChatUploading(false);
      Alert.alert('Upload Failed', err?.message || 'Could not process WhatsApp chat export.');
    }
  };

  return (
    <View style={s.container}>
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
        {/* Top Action Bar: Upload Fuel Bill, Enter by Hand, Bulk WhatsApp */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionBtn, s.primaryActionBtn]}
            onPress={() => {
              setUploadFiles([]);
              setUploadError('');
              setUploadSuccess('');
              setUploadBillModal(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={16} color="#FFFFFF" />
            <Text style={s.primaryActionText}>Upload Fuel Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, s.handActionBtn]}
            onPress={() => {
              setManualError('');
              setManualSuccess('');
              setManualForm({
                vehicleId: '',
                fuelType: 'DIESEL',
                fillingType: 'FULL_TANK',
                litres: '',
                rate: '',
                amountInr: '',
                odometerReading: '',
                stationName: '',
                refuelTime: new Date().toISOString().slice(0, 16),
              });
              setManualFuelModal(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color="#0D9488" />
            <Text style={s.handActionText}>Enter by Hand</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, s.secondaryActionBtn]}
            onPress={() => {
              setChatZipFile(null);
              setChatJobStatus(null);
              setChatUploadPercent(0);
              setWhatsappChatModal(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#1A56DB" />
            <Text style={s.secondaryActionText}>Bulk WhatsApp</Text>
          </TouchableOpacity>
        </View>

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
          statusBarTranslucent
          onRequestClose={() => setSelectedLog(null)}
        >
          <View style={s.bottomSheetOverlay}>
            <View style={[s.modalCard, { maxHeight: '85%', paddingBottom: Math.max(insets.bottom, 24) }]}>
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
          statusBarTranslucent
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

      {/* 9. Upload Fuel Bill Modal */}
      <Modal visible={uploadBillModal} transparent animationType="slide" statusBarTranslucent>
        <View style={s.bottomSheetOverlay}>
          <View style={[s.actionModalCard, { maxHeight: '90%', paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={s.modalHeaderRow}>
              <View>
                <Text style={s.modalHeading}>Upload Fuel Bill</Text>
                <Text style={s.modalSub}>Upload bill or meter photo for instant logging</Text>
              </View>
              <TouchableOpacity onPress={() => !uploading && setUploadBillModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
              {/* Vehicle Picker */}
              <View>
                <Text style={s.inputLabel}>Vehicle / Truck (Optional for bulk):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
                  {vehicles.map((v) => {
                    const vId = v.id || v._id;
                    const isSelected = selectedTruckId === vId;
                    return (
                      <TouchableOpacity
                        key={vId}
                        style={[s.pillBtn, isSelected && s.pillBtnActive]}
                        onPress={() => setSelectedTruckId(isSelected ? '' : vId)}
                      >
                        <Text style={[s.pillBtnText, isSelected && s.pillBtnTextActive]}>
                          {v.registrationNumber || v.plate}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Fuel Type */}
              <View>
                <Text style={s.inputLabel}>Fuel Type:</Text>
                <View style={s.segmentedRow}>
                  <TouchableOpacity
                    style={[s.segmentBtn, fuelType === 'DIESEL' && s.segmentBtnActive]}
                    onPress={() => setFuelType('DIESEL')}
                  >
                    <Text style={[s.segmentText, fuelType === 'DIESEL' && s.segmentTextActive]}>Diesel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.segmentBtn, fuelType === 'ADBLUE' && s.segmentBtnActive]}
                    onPress={() => setFuelType('ADBLUE')}
                  >
                    <Text style={[s.segmentText, fuelType === 'ADBLUE' && s.segmentTextActive]}>DEF (AdBlue)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tank Status */}
              <View>
                <Text style={s.inputLabel}>Tank Status:</Text>
                <View style={s.segmentedRow}>
                  <TouchableOpacity
                    style={[s.segmentBtn, fillingType === 'FULL_TANK' && s.segmentBtnActive]}
                    onPress={() => setFillingType('FULL_TANK')}
                  >
                    <Text style={[s.segmentText, fillingType === 'FULL_TANK' && s.segmentTextActive]}>Full Tank</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.segmentBtn, fillingType === 'PARTIAL' && s.segmentBtnActive]}
                    onPress={() => setFillingType('PARTIAL')}
                  >
                    <Text style={[s.segmentText, fillingType === 'PARTIAL' && s.segmentTextActive]}>Partial Fill</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Upload Action Tiles */}
              <Text style={s.inputLabel}>Add Photos / Files:</Text>
              <View style={s.uploadTileRow}>
                <TouchableOpacity style={s.uploadTile} onPress={pickCameraPhoto}>
                  <Ionicons name="camera" size={24} color="#1A56DB" />
                  <Text style={s.uploadTileText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.uploadTile} onPress={pickGalleryPhotos}>
                  <Ionicons name="images" size={24} color="#1A56DB" />
                  <Text style={s.uploadTileText}>Gallery (Multi)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.uploadTile} onPress={pickDocumentFiles}>
                  <Ionicons name="document-attach" size={24} color="#1A56DB" />
                  <Text style={s.uploadTileText}>PDF / Files</Text>
                </TouchableOpacity>
              </View>

              {/* Selected Files Preview */}
              {uploadFiles.length > 0 && (
                <View style={s.filesPreviewBox}>
                  <Text style={s.filesPreviewTitle}>{uploadFiles.length} file(s) selected:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {uploadFiles.map((file, idx) => (
                      <View key={idx} style={s.fileThumbBox}>
                        <Image source={{ uri: file.uri }} style={s.fileThumbImg} />
                        <TouchableOpacity
                          style={s.fileRemoveBtn}
                          onPress={() => setUploadFiles((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Ionicons name="close" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {uploadError ? <Text style={s.errorText}>{uploadError}</Text> : null}
              {uploadSuccess ? <Text style={s.successText}>{uploadSuccess}</Text> : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[s.primarySubmitBtn, uploading && { opacity: 0.7 }]}
                disabled={uploading}
                onPress={submitManagerBillUpload}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.primarySubmitText}>
                    Upload {uploadFiles.length ? `(${uploadFiles.length})` : ''}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 10. Enter by Hand Modal */}
      <Modal visible={manualFuelModal} transparent animationType="slide" statusBarTranslucent>
        <View style={s.bottomSheetOverlay}>
          <View style={[s.actionModalCard, { maxHeight: '90%', paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={s.modalHeaderRow}>
              <View>
                <Text style={s.modalHeading}>Enter Fuel Log by Hand</Text>
                <Text style={s.modalSub}>Record diesel or DEF fill details manually</Text>
              </View>
              <TouchableOpacity onPress={() => !manualSubmitting && setManualFuelModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
              {/* Select Vehicle */}
              <View>
                <Text style={s.inputLabel}>Select Vehicle *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
                  {vehicles.map((v) => {
                    const vId = v.id || v._id;
                    const isSelected = manualForm.vehicleId === vId;
                    return (
                      <TouchableOpacity
                        key={vId}
                        style={[s.pillBtn, isSelected && s.pillBtnActive]}
                        onPress={() => setManualForm((p) => ({ ...p, vehicleId: vId }))}
                      >
                        <Text style={[s.pillBtnText, isSelected && s.pillBtnTextActive]}>
                          {v.registrationNumber || v.plate}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Fuel Type & Filling Type */}
              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Fuel Type</Text>
                  <View style={s.segmentedRow}>
                    <TouchableOpacity
                      style={[s.segmentBtn, manualForm.fuelType === 'DIESEL' && s.segmentBtnActive]}
                      onPress={() => setManualForm((p) => ({ ...p, fuelType: 'DIESEL' }))}
                    >
                      <Text style={[s.segmentText, manualForm.fuelType === 'DIESEL' && s.segmentTextActive]}>Diesel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.segmentBtn, manualForm.fuelType === 'ADBLUE' && s.segmentBtnActive]}
                      onPress={() => setManualForm((p) => ({ ...p, fuelType: 'ADBLUE' }))}
                    >
                      <Text style={[s.segmentText, manualForm.fuelType === 'ADBLUE' && s.segmentTextActive]}>DEF</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Tank Status</Text>
                  <View style={s.segmentedRow}>
                    <TouchableOpacity
                      style={[s.segmentBtn, manualForm.fillingType === 'FULL_TANK' && s.segmentBtnActive]}
                      onPress={() => setManualForm((p) => ({ ...p, fillingType: 'FULL_TANK' }))}
                    >
                      <Text style={[s.segmentText, manualForm.fillingType === 'FULL_TANK' && s.segmentTextActive]}>Full</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.segmentBtn, manualForm.fillingType === 'PARTIAL' && s.segmentBtnActive]}
                      onPress={() => setManualForm((p) => ({ ...p, fillingType: 'PARTIAL' }))}
                    >
                      <Text style={[s.segmentText, manualForm.fillingType === 'PARTIAL' && s.segmentTextActive]}>Part</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Volume & Cost */}
              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Litres Filled *</Text>
                  <TextInput
                    style={s.formInput}
                    placeholder="e.g. 150.0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={manualForm.litres}
                    onChangeText={(val) => setManualForm((p) => ({ ...p, litres: val }))}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Rate / Litre (₹)</Text>
                  <TextInput
                    style={s.formInput}
                    placeholder="e.g. 91.50"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={manualForm.rate}
                    onChangeText={(val) => setManualForm((p) => ({ ...p, rate: val }))}
                  />
                </View>
              </View>

              {/* Total Amount & Odometer */}
              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Total Cost (₹)</Text>
                  <TextInput
                    style={s.formInput}
                    placeholder="e.g. 13725"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={manualForm.amountInr}
                    onChangeText={(val) => setManualForm((p) => ({ ...p, amountInr: val }))}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Odometer (km)</Text>
                  <TextInput
                    style={s.formInput}
                    placeholder="e.g. 154200"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={manualForm.odometerReading}
                    onChangeText={(val) => setManualForm((p) => ({ ...p, odometerReading: val }))}
                  />
                </View>
              </View>

              {/* Station Name */}
              <View>
                <Text style={s.inputLabel}>Petrol Pump / Station Name</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="e.g. Indian Oil, Asansol Highway"
                  placeholderTextColor="#94A3B8"
                  value={manualForm.stationName}
                  onChangeText={(val) => setManualForm((p) => ({ ...p, stationName: val }))}
                />
              </View>

              {manualError ? <Text style={s.errorText}>{manualError}</Text> : null}
              {manualSuccess ? <Text style={s.successText}>{manualSuccess}</Text> : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[s.primarySubmitBtn, manualSubmitting && { opacity: 0.7 }]}
                disabled={manualSubmitting}
                onPress={submitManualFuelLog}
              >
                {manualSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.primarySubmitText}>Save Fuel Entry</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 11. Bulk WhatsApp Chat Modal */}
      <Modal visible={whatsappChatModal} transparent animationType="slide" statusBarTranslucent>
        <View style={s.bottomSheetOverlay}>
          <View style={[s.actionModalCard, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={s.modalHeaderRow}>
              <View>
                <Text style={s.modalHeading}>Bulk Upload (WhatsApp Chat)</Text>
                <Text style={s.modalSub}>Import driver fuel slips & odometer photos from chat export</Text>
              </View>
              <TouchableOpacity onPress={() => !chatUploading && setWhatsappChatModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={s.chatInstructionsBox}>
              <Ionicons name="information-circle-outline" size={20} color="#1A56DB" />
              <Text style={s.chatInstructionsText}>
                Export your WhatsApp driver group or individual chat as a <Text style={{ fontWeight: 'bold' }}>.ZIP (Include Media)</Text> to automatically extract all fuel receipts and odometer pictures.
              </Text>
            </View>

            <TouchableOpacity style={s.zipPickerBtn} onPress={pickZipFile}>
              <Ionicons name="archive-outline" size={32} color="#1A56DB" />
              <Text style={s.zipPickerTitle}>
                {chatZipFile ? chatZipFile.name : 'Tap to select .ZIP Chat Export'}
              </Text>
              {chatZipFile?.size ? (
                <Text style={s.zipPickerSize}>
                  {(chatZipFile.size / (1024 * 1024)).toFixed(2)} MB
                </Text>
              ) : null}
            </TouchableOpacity>

            {chatUploading && (
              <View style={s.chatProgressBox}>
                <ActivityIndicator size="small" color="#1A56DB" />
                <Text style={s.chatProgressText}>{chatJobStatus || 'Processing archive…'}</Text>
                {chatUploadPercent > 0 && chatUploadPercent < 100 && (
                  <Text style={s.chatProgressPct}>{chatUploadPercent}%</Text>
                )}
              </View>
            )}

            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={[s.mBtn, s.mBtnCancel]}
                disabled={chatUploading}
                onPress={() => setWhatsappChatModal(false)}
              >
                <Text style={s.mBtnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.mBtn, s.mBtnConfirm, (!chatZipFile || chatUploading) && { opacity: 0.6 }]}
                disabled={!chatZipFile || chatUploading}
                onPress={submitWhatsappChatUpload}
              >
                <Text style={s.mBtnConfirmText}>Start Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    margin: 0,
    padding: 0,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    margin: 0,
    padding: 0,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    width: '100%',
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

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  primaryActionBtn: {
    backgroundColor: '#1A56DB',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  handActionBtn: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  handActionText: {
    color: '#0D9488',
    fontWeight: '700',
    fontSize: 12,
  },
  secondaryActionBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryActionText: {
    color: '#1A56DB',
    fontWeight: '700',
    fontSize: 12,
  },

  // Action Modals & Bottom Sheets
  actionModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    width: '100%',
    padding: 20,
    gap: 12,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillBtnActive: {
    backgroundColor: '#1A56DB',
    borderColor: '#1A56DB',
  },
  pillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  pillBtnTextActive: {
    color: '#FFFFFF',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtnActive: {
    backgroundColor: '#1A56DB',
    borderColor: '#1A56DB',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  uploadTileRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 4,
  },
  uploadTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    gap: 4,
  },
  uploadTileText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A56DB',
  },
  filesPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  filesPreviewTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  fileThumbBox: {
    width: 60,
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
  },
  fileThumbImg: {
    width: '100%',
    height: '100%',
  },
  fileRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 2,
  },
  primarySubmitBtn: {
    backgroundColor: '#1A56DB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  primarySubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#0F172A',
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  successText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
  // WhatsApp Chat box
  chatInstructionsBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 10,
    alignItems: 'center',
  },
  chatInstructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  zipPickerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    gap: 6,
    marginVertical: 8,
  },
  zipPickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A56DB',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  zipPickerSize: {
    fontSize: 11,
    color: '#64748B',
  },
  chatProgressBox: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  chatProgressText: {
    fontSize: 12,
    color: '#1A56DB',
    fontWeight: '600',
  },
  chatProgressPct: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A56DB',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  mBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  mBtnCancel: {
    backgroundColor: '#F1F5F9',
  },
  mBtnCancelText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  mBtnConfirm: {
    backgroundColor: '#1A56DB',
  },
  mBtnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
