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
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, BackHeader } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STANDARD_DOC_TYPES = [
  { key: 'RC', label: 'Registration (RC)', icon: 'card-outline', desc: 'RTO Registration Certificate' },
  { key: 'INSURANCE', label: 'Insurance Policy', icon: 'shield-checkmark-outline', desc: 'Commercial Vehicle Insurance Policy' },
  { key: 'FITNESS', label: 'Fitness Certificate', icon: 'speedometer-outline', desc: 'Vehicle Roadworthiness Fitness' },
  { key: 'POLLUTION', label: 'Pollution / PUC', icon: 'leaf-outline', desc: 'Pollution Under Control Certificate' },
  { key: 'PERMIT', label: 'Permit (National/State)', icon: 'document-text-outline', desc: 'Commercial Goods Carriage Permit' },
  { key: 'ROAD_TAX', label: 'Road Tax Token', icon: 'cash-outline', desc: 'Motor Vehicle Tax Clearance Receipt' },
];

function normalizeDocType(type) {
  const t = String(type || '').toUpperCase().trim();
  if (t === 'PUC') return 'POLLUTION';
  if (t === 'TAX') return 'ROAD_TAX';
  if (t === 'NATIONAL_PERMIT' || t === 'STATE_PERMIT') return 'PERMIT';
  return t;
}

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

export default function FleetDocumentsScreen({ navigation, route = {} }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { service, branchId, data: managerData } = useManagerData();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(
    route?.params?.filter ? String(route.params.filter).toUpperCase() : 'ALL'
  ); // ALL, COMPLIANT, EXPIRING, ACTION_REQUIRED

  useEffect(() => {
    if (route?.params?.filter) {
      setFilter(String(route.params.filter).toUpperCase());
    }
  }, [route?.params?.filter]);

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documents, setDocuments] = useState([]);

  // Selected Vehicle for detailed docs inspector drawer
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [activeVehicleDocs, setActiveVehicleDocs] = useState([]);
  const [loadingActiveDocs, setLoadingActiveDocs] = useState(false);

  // Document Lightbox Preview
  const [previewDoc, setPreviewDoc] = useState(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Upload Document Modal
  const [uploadModal, setUploadModal] = useState({
    open: false,
    vehicleId: null,
    vehiclePlate: '',
    docType: 'RC',
    expiryDate: '',
    file: null,
    uploading: false,
    error: '',
  });

  // Target vehicle from route navigation
  const targetVehicleId = route?.params?.vehicleId;
  const targetPlate = route?.params?.plate;

  // Vehicles list from manager data context
  const vehicles = useMemo(() => {
    return Array.isArray(managerData?.vehicles) ? managerData.vehicles : [];
  }, [managerData]);

  // Load all vehicle documents
  const loadDocuments = useCallback(async (isRefresh = false) => {
    if (!service) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const bId = branchId === 'all' ? undefined : branchId;

    try {
      const res = await service.listDocuments({ entityType: 'VEHICLE', limit: 200 }, bId);
      const items = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setDocuments(Array.isArray(items) ? items : []);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [service, branchId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Pre-select vehicle if navigated with vehicleId or plate
  useEffect(() => {
    if (vehicles.length > 0 && (targetVehicleId || targetPlate)) {
      const matched = vehicles.find(
        (v) =>
          (targetVehicleId && String(v.id || v._id) === String(targetVehicleId)) ||
          (targetPlate &&
            String(v.registrationNumber || v.plate || '')
              .toUpperCase()
              .replace(/\s+/g, '') === String(targetPlate).toUpperCase().replace(/\s+/g, ''))
      );
      if (matched) {
        setActiveVehicle(matched);
      }
    }
  }, [vehicles, targetVehicleId, targetPlate]);

  // Live fetch vehicle-specific documents (including RC front/back photos from vehicle subdocuments)
  useEffect(() => {
    if (!activeVehicle) {
      setActiveVehicleDocs([]);
      return;
    }
    const vId = activeVehicle.id || activeVehicle._id;
    if (!vId) return;

    let cancelled = false;
    setLoadingActiveDocs(true);

    const fetchVehicleDocs = async () => {
      try {
        if (service?.getVehicleDocuments) {
          const res = await service.getVehicleDocuments(vId, branchId === 'all' ? undefined : branchId);
          if (!cancelled) {
            const list = Array.isArray(res) ? res : res?.data || [];
            setActiveVehicleDocs(list);
          }
        }
      } catch {
        if (!cancelled) setActiveVehicleDocs([]);
      } finally {
        if (!cancelled) setLoadingActiveDocs(false);
      }
    };

    fetchVehicleDocs();
    return () => { cancelled = true; };
  }, [activeVehicle, service, branchId]);

  // Group documents by vehicle ID
  const docsByVehicle = useMemo(() => {
    const map = new Map();
    documents.forEach((doc) => {
      const vId = String(doc.entityId || doc.vehicleId || '');
      if (!vId) return;
      if (!map.has(vId)) map.set(vId, []);
      map.get(vId).push(doc);
    });
    return map;
  }, [documents]);

  // Evaluate compliance for each vehicle
  const vehiclesWithCompliance = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return vehicles.map((v) => {
      const vId = String(v.id || v._id || '');
      const directDocs = Array.isArray(v.documents) ? v.documents : [];
      const centralDocs = docsByVehicle.get(vId) || [];
      const vehicleDocs = [...directDocs];
      centralDocs.forEach((cd) => {
        const norm = normalizeDocType(cd.docType);
        const exists = vehicleDocs.findIndex((d) => normalizeDocType(d.docType) === norm);
        if (exists >= 0) {
          vehicleDocs[exists] = { ...vehicleDocs[exists], ...cd };
        } else {
          vehicleDocs.push(cd);
        }
      });

      let validCount = 0;
      let expiringCount = 0;
      let expiredCount = 0;
      let missingCount = 0;

      const docStatusList = STANDARD_DOC_TYPES.map((type) => {
        const found = vehicleDocs.find((d) => normalizeDocType(d.docType) === type.key);

        if (!found) {
          missingCount += 1;
          return {
            ...type,
            status: 'NOT_UPLOADED',
            doc: null,
          };
        }

        const exp = found.expiryDate ? new Date(found.expiryDate).getTime() : null;
        if (!exp) {
          validCount += 1;
          return {
            ...type,
            status: 'VALID',
            doc: found,
          };
        }

        if (exp < now) {
          expiredCount += 1;
          return {
            ...type,
            status: 'EXPIRED',
            doc: found,
            expiryDate: found.expiryDate,
          };
        }

        if (exp - now < thirtyDaysMs) {
          expiringCount += 1;
          const daysLeft = Math.ceil((exp - now) / (24 * 60 * 60 * 1000));
          return {
            ...type,
            status: 'EXPIRING_SOON',
            doc: found,
            daysLeft,
            expiryDate: found.expiryDate,
          };
        }

        validCount += 1;
        return {
          ...type,
          status: 'VALID',
          doc: found,
          expiryDate: found.expiryDate,
        };
      });

      const isFullyCompliant = missingCount === 0 && expiredCount === 0 && expiringCount === 0;
      const needsAction = expiredCount > 0 || missingCount > 0;

      return {
        ...v,
        vId,
        plate: v.registrationNumber || v.plate || 'Unknown Vehicle',
        docStatusList,
        validCount,
        expiringCount,
        expiredCount,
        missingCount,
        totalRequired: STANDARD_DOC_TYPES.length,
        isFullyCompliant,
        needsAction,
      };
    });
  }, [vehicles, docsByVehicle]);

  // Overall compliance stats
  const stats = useMemo(() => {
    let total = vehiclesWithCompliance.length;
    let compliant = 0;
    let expiring = 0;
    let actionRequired = 0;

    vehiclesWithCompliance.forEach((v) => {
      if (v.isFullyCompliant) compliant += 1;
      else if (v.needsAction) actionRequired += 1;
      else if (v.expiringCount > 0) expiring += 1;
    });

    return { total, compliant, expiring, actionRequired };
  }, [vehiclesWithCompliance]);

  // Filtered vehicles list
  const filteredVehicles = useMemo(() => {
    const q = search.trim().toUpperCase();

    return vehiclesWithCompliance.filter((v) => {
      if (q) {
        const matchesPlate = v.plate.toUpperCase().includes(q);
        const matchesModel = String(v.model || '').toUpperCase().includes(q);
        if (!matchesPlate && !matchesModel) return false;
      }

      if (filter === 'COMPLIANT') return v.isFullyCompliant;
      if (filter === 'EXPIRING') return v.expiringCount > 0 || v.expiredCount > 0;
      if (filter === 'ACTION_REQUIRED') return v.needsAction;

      return true;
    });
  }, [vehiclesWithCompliance, search, filter]);

  // Extract all file attachments (handles Front & Back photos for RC)
  const extractDocFiles = useCallback((doc) => {
    if (!doc) return [];
    const files = [];
    if (Array.isArray(doc.files) && doc.files.length > 0) {
      doc.files.forEach((f) => {
        const url = f.publicUrl || f.url || f.fileUrl;
        if (url) {
          files.push({
            side: f.side || (files.length === 0 ? 'FRONT' : 'BACK'),
            url,
            mimeType: f.mimeType,
            name: f.name || f.fileName || `${doc.docType || 'Document'} (${f.side || 'File'})`,
          });
        }
      });
    }
    if (files.length === 0 && (doc.fileUrl || doc.url || doc.publicUrl)) {
      files.push({
        side: 'SINGLE',
        url: doc.fileUrl || doc.url || doc.publicUrl,
        mimeType: doc.mimeType,
        name: doc.title || doc.docType || 'Document',
      });
    }
    return files;
  }, []);

  // Active Vehicle evaluated documents (merges live vehicle subdocuments for RC front/back)
  const activeVehicleEvaluated = useMemo(() => {
    if (!activeVehicle) return null;
    const vId = String(activeVehicle.id || activeVehicle._id || '');
    const base = vehiclesWithCompliance.find((v) => v.vId === vId) || {
      ...activeVehicle,
      vId,
      plate: activeVehicle.registrationNumber || activeVehicle.plate || 'Unknown Vehicle',
      docStatusList: [],
    };

    // Combine base docs with live vehicle-specific docs
    const directDocs = Array.isArray(activeVehicle?.documents) ? activeVehicle.documents : [];
    const centralDocs = docsByVehicle.get(vId) || [];
    const combinedDocs = [...directDocs];
    centralDocs.forEach((cd) => {
      const norm = normalizeDocType(cd.docType);
      const exists = combinedDocs.findIndex((d) => normalizeDocType(d.docType) === norm);
      if (exists >= 0) {
        combinedDocs[exists] = { ...combinedDocs[exists], ...cd };
      } else {
        combinedDocs.push(cd);
      }
    });
    activeVehicleDocs.forEach((d) => {
      const canon = normalizeDocType(d.docType);
      const idx = combinedDocs.findIndex((existing) => normalizeDocType(existing.docType) === canon);
      if (idx >= 0) {
        combinedDocs[idx] = { ...combinedDocs[idx], ...d };
      } else {
        combinedDocs.push(d);
      }
    });

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    let validCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let missingCount = 0;

    const docStatusList = STANDARD_DOC_TYPES.map((type) => {
      const found = combinedDocs.find((d) => normalizeDocType(d.docType) === type.key);
      if (!found) {
        missingCount += 1;
        return { ...type, status: 'NOT_UPLOADED', doc: null };
      }
      const exp = found.expiryDate ? new Date(found.expiryDate).getTime() : null;
      if (!exp) {
        validCount += 1;
        return { ...type, status: 'VALID', doc: found };
      }
      if (exp < now) {
        expiredCount += 1;
        return { ...type, status: 'EXPIRED', doc: found, expiryDate: found.expiryDate };
      }
      if (exp - now < thirtyDaysMs) {
        expiringCount += 1;
        const daysLeft = Math.ceil((exp - now) / (24 * 60 * 60 * 1000));
        return { ...type, status: 'EXPIRING_SOON', doc: found, daysLeft, expiryDate: found.expiryDate };
      }
      validCount += 1;
      return { ...type, status: 'VALID', doc: found, expiryDate: found.expiryDate };
    });

    return {
      ...base,
      docStatusList,
      validCount,
      expiringCount,
      expiredCount,
      missingCount,
      isFullyCompliant: missingCount === 0 && expiredCount === 0 && expiringCount === 0,
      needsAction: expiredCount > 0 || missingCount > 0,
    };
  }, [activeVehicle, vehiclesWithCompliance, docsByVehicle, activeVehicleDocs]);

  // Upload Actions
  const pickCamera = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.85, mediaTypes: ['images'] });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setUploadModal((prev) => ({ ...prev, file: res.assets[0], error: '' }));
      }
    } catch {
      Alert.alert('Camera Error', 'Could not open camera.');
    }
  };

  const pickGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: ['images'] });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setUploadModal((prev) => ({ ...prev, file: res.assets[0], error: '' }));
      }
    } catch {
      Alert.alert('Gallery Error', 'Could not open gallery.');
    }
  };

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setUploadModal((prev) => ({ ...prev, file: res.assets[0], error: '' }));
      }
    } catch {
      Alert.alert('File Error', 'Could not pick file.');
    }
  };

  const submitUpload = async () => {
    const { vehicleId, docType, expiryDate, file } = uploadModal;
    if (!file) {
      setUploadModal((prev) => ({ ...prev, error: 'Please select or capture a document file.' }));
      return;
    }

    setUploadModal((prev) => ({ ...prev, uploading: true, error: '' }));
    const bId = branchId === 'all' ? undefined : branchId;

    try {
      await service.uploadVehicleDocument(vehicleId, file, docType, expiryDate || undefined, bId);
      Alert.alert('Uploaded', `${docType} certificate uploaded successfully.`);
      setUploadModal({
        open: false,
        vehicleId: null,
        vehiclePlate: '',
        docType: 'RC',
        expiryDate: '',
        file: null,
        uploading: false,
        error: '',
      });
      loadDocuments(true);
    } catch (err) {
      setUploadModal((prev) => ({ ...prev, uploading: false, error: err?.message || 'Could not upload document.' }));
    }
  };

  return (
    <View style={s.container}>
      <BackHeader
        title="Fleet Documents"
        subtitle="Vehicle compliance, registration and permit certificates"
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDocuments(true)} />}
      >
        {/* Top Compliance Stats Grid */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>TOTAL TRUCKS</Text>
            <Text style={s.statValue}>{stats.total}</Text>
            <Text style={s.statSub}>Fleet vehicles</Text>
          </View>

          <View style={[s.statCard, s.statCardGreen]}>
            <Text style={[s.statLabel, { color: '#16A34A' }]}>COMPLIANT</Text>
            <Text style={[s.statValue, { color: '#16A34A' }]}>{stats.compliant}</Text>
            <Text style={s.statSub}>All docs valid</Text>
          </View>

          <View style={[s.statCard, s.statCardAmber]}>
            <Text style={[s.statLabel, { color: '#D97706' }]}>EXPIRING SOON</Text>
            <Text style={[s.statValue, { color: '#D97706' }]}>{stats.expiring}</Text>
            <Text style={s.statSub}>&lt; 30 days left</Text>
          </View>

          <View style={[s.statCard, s.statCardRed]}>
            <Text style={[s.statLabel, { color: '#DC2626' }]}>ACTION NEEDED</Text>
            <Text style={[s.statValue, { color: '#DC2626' }]}>{stats.actionRequired}</Text>
            <Text style={s.statSub}>Expired / Missing</Text>
          </View>
        </View>

        {/* Search & Filter Bar */}
        <View style={s.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginLeft: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search vehicle plate number or model…"
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="characters"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 6 }}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterChipsRow}>
          {[
            { key: 'ALL', label: `All Trucks (${stats.total})` },
            { key: 'ACTION_REQUIRED', label: `Action Needed (${stats.actionRequired})` },
            { key: 'EXPIRING', label: `Expiring Soon (${stats.expiring})` },
            { key: 'COMPLIANT', label: `Compliant (${stats.compliant})` },
          ].map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={[s.filterChip, filter === chip.key && s.filterChipActive]}
              onPress={() => setFilter(chip.key)}
            >
              <Text style={[s.filterChipText, filter === chip.key && s.filterChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Vehicles List */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#1A56DB" />
            <Text style={s.loadingText}>Loading vehicle documents from server…</Text>
          </View>
        ) : filteredVehicles.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="document-text-outline" size={56} color="#94A3B8" />
            <Text style={s.emptyTitle}>No Vehicles Found</Text>
            <Text style={s.emptySub}>No trucks match your search or selected filter.</Text>
          </View>
        ) : (
          filteredVehicles.map((vehicle) => {
            return (
              <TouchableOpacity
                key={vehicle.vId}
                activeOpacity={0.9}
                onPress={() => setActiveVehicle(vehicle)}
              >
                <Card style={s.vehicleCard}>
                  {/* Top: Plate + Compliance Badge */}
                  <View style={s.vehicleHeader}>
                    <View style={s.plateBox}>
                      <Ionicons name="bus-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                      <Text style={s.plateText}>{vehicle.plate}</Text>
                    </View>

                    {vehicle.isFullyCompliant ? (
                      <View style={s.compliantBadge}>
                        <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                        <Text style={s.compliantBadgeText}>Compliant (6/6)</Text>
                      </View>
                    ) : vehicle.expiredCount > 0 ? (
                      <View style={s.expiredBadge}>
                        <Ionicons name="alert-circle" size={13} color="#DC2626" />
                        <Text style={s.expiredBadgeText}>{vehicle.expiredCount} Expired</Text>
                      </View>
                    ) : vehicle.expiringCount > 0 ? (
                      <View style={s.expiringBadge}>
                        <Ionicons name="time" size={13} color="#D97706" />
                        <Text style={s.expiringBadgeText}>{vehicle.expiringCount} Expiring Soon</Text>
                      </View>
                    ) : (
                      <View style={s.missingBadge}>
                        <Ionicons name="alert-circle-outline" size={13} color="#D97706" />
                        <Text style={s.missingBadgeText}>{vehicle.missingCount} Missing</Text>
                      </View>
                    )}
                  </View>

                  {/* Subtitle: Model & Branch */}
                  <View style={s.modelRow}>
                    <Text style={s.modelText}>
                      {vehicle.model || vehicle.make || 'Heavy Commercial Vehicle'}
                      {vehicle.branchId ? ` · Branch ${vehicle.branchId}` : ''}
                    </Text>
                  </View>

                  {/* 6 Document Status Chips Grid */}
                  <View style={s.docChipsGrid}>
                    {vehicle.docStatusList.map((docType) => {
                      const isValid = docType.status === 'VALID';
                      const isExpiring = docType.status === 'EXPIRING_SOON';
                      const isExpired = docType.status === 'EXPIRED';
                      const isMissing = docType.status === 'NOT_UPLOADED';

                      return (
                        <View
                          key={docType.key}
                          style={[
                            s.docChip,
                            isValid && s.docChipValid,
                            isExpiring && s.docChipExpiring,
                            isExpired && s.docChipExpired,
                            isMissing && s.docChipMissing,
                          ]}
                        >
                          <Ionicons
                            name={
                              isValid
                                ? 'checkmark-circle'
                                : isExpiring
                                ? 'time'
                                : isExpired
                                ? 'close-circle'
                                : 'add-circle-outline'
                            }
                            size={12}
                            color={
                              isValid
                                ? '#16A34A'
                                : isExpiring
                                ? '#D97706'
                                : isExpired
                                ? '#DC2626'
                                : '#64748B'
                            }
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              s.docChipText,
                              isValid && s.docChipTextValid,
                              isExpiring && s.docChipTextExpiring,
                              isExpired && s.docChipTextExpired,
                              isMissing && s.docChipTextMissing,
                            ]}
                            numberOfLines={1}
                          >
                            {docType.label.split(' ')[0]}
                            {isExpiring ? ` (${docType.daysLeft}d)` : isExpired ? ' (Exp)' : ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Bottom: Tap to View / Manage Documents */}
                  <View style={s.cardFooter}>
                    <Text style={s.cardFooterText}>Tap to view or upload documents</Text>
                    <Ionicons name="chevron-forward" size={14} color="#1A56DB" />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* VEHICLE DOCUMENTS DETAIL DRAWER / MODAL */}
      <Modal visible={Boolean(activeVehicle)} transparent animationType="slide" statusBarTranslucent>
        <View style={s.modalOverlay}>
          <View style={[s.drawerCard, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            {/* Header */}
            <View style={s.drawerHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.drawerPlate}>{activeVehicleEvaluated?.plate}</Text>
                  {activeVehicleEvaluated?.isFullyCompliant && (
                    <View style={s.compliantBadge}>
                      <Text style={s.compliantBadgeText}>COMPLIANT</Text>
                    </View>
                  )}
                  {loadingActiveDocs && (
                    <ActivityIndicator size="small" color="#1A56DB" />
                  )}
                </View>
                <Text style={s.drawerSub}>
                  {activeVehicleEvaluated?.model || 'Heavy Commercial Vehicle'} · Required Fleet Documents
                </Text>
              </View>

              <TouchableOpacity
                style={s.drawerCloseBtn}
                onPress={() => setActiveVehicle(null)}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* List of 6 Document Types for this Vehicle */}
            <ScrollView contentContainerStyle={s.drawerDocsList}>
              {activeVehicleEvaluated?.docStatusList.map((docItem) => {
                const doc = docItem.doc;
                const isUploaded = Boolean(doc);
                const isValid = docItem.status === 'VALID';
                const isExpiring = docItem.status === 'EXPIRING_SOON';
                const isExpired = docItem.status === 'EXPIRED';
                const docFiles = extractDocFiles(doc);

                return (
                  <View key={docItem.key} style={s.docDetailItem}>
                    <View style={s.docDetailTop}>
                      <View style={s.docIconBox}>
                        <Ionicons
                          name={docItem.icon}
                          size={20}
                          color={isUploaded ? '#1A56DB' : '#64748B'}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={s.docDetailTitle}>{docItem.label}</Text>
                        <Text style={s.docDetailDesc}>{docItem.desc}</Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          s.docStatusBadge,
                          isValid && s.docStatusValid,
                          isExpiring && s.docStatusExpiring,
                          isExpired && s.docStatusExpired,
                          !isUploaded && s.docStatusMissing,
                        ]}
                      >
                        <Text
                          style={[
                            s.docStatusBadgeText,
                            isValid && { color: '#16A34A' },
                            isExpiring && { color: '#D97706' },
                            isExpired && { color: '#DC2626' },
                            !isUploaded && { color: '#64748B' },
                          ]}
                        >
                          {isValid
                            ? 'VALID'
                            : isExpiring
                            ? `EXPIRING (${docItem.daysLeft}D)`
                            : isExpired
                            ? 'EXPIRED'
                            : 'NOT UPLOADED'}
                        </Text>
                      </View>
                    </View>

                    {/* Meta info / Expiry date */}
                    {isUploaded ? (
                      <View style={s.docUploadedMeta}>
                        <View style={s.docMetaRow}>
                          <Ionicons name="calendar-outline" size={13} color="#64748B" />
                          <Text style={s.docMetaText}>
                            Expiry Date:{' '}
                            <Text style={{ fontWeight: '700', color: isExpired ? '#DC2626' : '#0F172A' }}>
                              {doc.expiryDate
                                ? new Date(doc.expiryDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'No expiry set'}
                            </Text>
                          </Text>
                        </View>

                        {doc.documentNumber ? (
                          <View style={s.docMetaRow}>
                            <Ionicons name="barcode-outline" size={13} color="#64748B" />
                            <Text style={s.docMetaText}>
                              Number: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{doc.documentNumber}</Text>
                            </Text>
                          </View>
                        ) : null}

                        {/* Uploaded File Previews (Front / Back photos) */}
                        {docFiles.length > 0 && (
                          <View style={s.docFilesContainer}>
                            <Text style={s.docFilesHeading}>Uploaded Document Photo(s):</Text>
                            <View style={s.docFilesRow}>
                              {docFiles.map((file, fIdx) => {
                                const sideText = file.side === 'FRONT' ? 'Front Side Photo' : file.side === 'BACK' ? 'Back Side Photo' : `Page ${fIdx + 1}`;
                                return (
                                  <TouchableOpacity
                                    key={fIdx}
                                    style={s.docFileCard}
                                    onPress={() => {
                                      setActiveFileIndex(fIdx);
                                      setPreviewDoc({ ...doc, files: docFiles });
                                    }}
                                    activeOpacity={0.8}
                                  >
                                    <Image
                                      source={{
                                        uri: resolveImageUrl(file.url),
                                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                                      }}
                                      style={s.docFileThumb}
                                      resizeMode="cover"
                                    />
                                    <View style={s.docFileMeta}>
                                      <View style={s.docFileSideBadge}>
                                        <Ionicons name="image-outline" size={11} color="#1A56DB" />
                                        <Text style={s.docFileSideText} numberOfLines={1}>{sideText}</Text>
                                      </View>
                                      <Text style={s.docFileViewText}>Tap to preview</Text>
                                    </View>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        {/* Action buttons when uploaded */}
                        <View style={s.docActionRow}>
                          <TouchableOpacity
                            style={s.docViewBtn}
                            onPress={() => {
                              setActiveFileIndex(0);
                              setPreviewDoc({ ...doc, files: docFiles });
                            }}
                          >
                            <Ionicons name="eye-outline" size={15} color="#1A56DB" />
                            <Text style={s.docViewBtnText}>
                              {docFiles.length > 1 ? `View All (${docFiles.length})` : 'View Document'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={s.docReplaceBtn}
                            onPress={() =>
                              setUploadModal({
                                open: true,
                                vehicleId: activeVehicleEvaluated.vId,
                                vehiclePlate: activeVehicleEvaluated.plate,
                                docType: docItem.key,
                                expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : '',
                                file: null,
                                uploading: false,
                                error: '',
                              })
                            }
                          >
                            <Ionicons name="cloud-upload-outline" size={15} color="#475569" />
                            <Text style={s.docReplaceBtnText}>Update File</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      /* Clean empty state container when document is NOT uploaded */
                      <View style={s.docMissingBox}>
                        <View style={s.docMissingInner}>
                          <Ionicons name="alert-circle-outline" size={16} color="#94A3B8" />
                          <Text style={s.docMissingText}>Document not uploaded for this vehicle.</Text>
                        </View>

                        <TouchableOpacity
                          style={s.docUploadActionBtn}
                          onPress={() =>
                            setUploadModal({
                              open: true,
                              vehicleId: activeVehicleEvaluated.vId,
                              vehiclePlate: activeVehicleEvaluated.plate,
                              docType: docItem.key,
                              expiryDate: '',
                              file: null,
                              uploading: false,
                              error: '',
                            })
                          }
                        >
                          <Ionicons name="cloud-upload" size={15} color="#FFFFFF" />
                          <Text style={s.docUploadActionText}>Upload {docItem.label.split(' ')[0]}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DOCUMENT PREVIEW LIGHTBOX MODAL */}
      <Modal visible={Boolean(previewDoc)} transparent animationType="fade" statusBarTranslucent>
        <View style={s.lightboxOverlay}>
          <View style={[s.lightboxTopBar, { paddingTop: Math.max(insets.top, 16) }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.lightboxTitle}>
                {previewDoc?.docType} · {activeVehicleEvaluated?.plate || 'Document Preview'}
              </Text>
              {(() => {
                const docFiles = extractDocFiles(previewDoc);
                if (docFiles.length <= 1) return null;
                const curFile = docFiles[activeFileIndex] || docFiles[0];
                return (
                  <Text style={s.lightboxSub}>
                    Viewing: {curFile?.side === 'FRONT' ? 'Front Side Photo' : curFile?.side === 'BACK' ? 'Back Side Photo' : `File ${activeFileIndex + 1} of ${docFiles.length}`}
                  </Text>
                );
              })()}
            </View>

            {(() => {
              const docFiles = extractDocFiles(previewDoc);
              if (docFiles.length <= 1) return null;
              return (
                <View style={s.lightboxSideToggle}>
                  {docFiles.map((f, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[s.lightboxToggleBtn, activeFileIndex === idx && s.lightboxToggleBtnActive]}
                      onPress={() => setActiveFileIndex(idx)}
                    >
                      <Text style={[s.lightboxToggleText, activeFileIndex === idx && s.lightboxToggleTextActive]}>
                        {f.side === 'FRONT' ? 'Front' : f.side === 'BACK' ? 'Back' : `Side ${idx + 1}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })()}

            <TouchableOpacity style={{ padding: 8 }} onPress={() => setPreviewDoc(null)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={s.lightboxImageContainer}>
            {(() => {
              const docFiles = extractDocFiles(previewDoc);
              const curFile = docFiles[activeFileIndex] || docFiles[0];
              const curUrl = curFile?.url || previewDoc?.fileUrl || previewDoc?.url;
              return curUrl ? (
                <Image
                  source={{
                    uri: resolveImageUrl(curUrl),
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  }}
                  style={s.lightboxImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Ionicons name="document-text-outline" size={56} color="#64748B" />
                  <Text style={{ color: '#94A3B8', fontSize: 14 }}>Preview unavailable for this format.</Text>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* UPLOAD DOCUMENT MODAL */}
      <Modal visible={uploadModal.open} transparent animationType="slide" statusBarTranslucent>
        <View style={s.modalOverlay}>
          <View style={[s.actionModalCard, { maxHeight: '90%', paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={s.modalHeaderRow}>
              <View>
                <Text style={s.modalHeading}>Upload {uploadModal.docType}</Text>
                <Text style={s.modalSub}>Truck: {uploadModal.vehiclePlate}</Text>
              </View>
              <TouchableOpacity
                onPress={() => !uploadModal.uploading && setUploadModal((prev) => ({ ...prev, open: false }))}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14, paddingVertical: 10 }}>
              {/* Expiry Date input */}
              <View>
                <Text style={s.inputLabel}>Certificate Expiry Date (YYYY-MM-DD):</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. 2027-12-31"
                  placeholderTextColor="#94A3B8"
                  value={uploadModal.expiryDate}
                  onChangeText={(text) => setUploadModal((prev) => ({ ...prev, expiryDate: text }))}
                />
              </View>

              {/* Upload picker buttons */}
              <Text style={s.inputLabel}>Select Document Photo or PDF:</Text>
              <View style={s.pickerRow}>
                <TouchableOpacity style={s.pickerBtn} onPress={pickCamera}>
                  <Ionicons name="camera" size={22} color="#1A56DB" />
                  <Text style={s.pickerBtnText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.pickerBtn} onPress={pickGallery}>
                  <Ionicons name="images" size={22} color="#1A56DB" />
                  <Text style={s.pickerBtnText}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.pickerBtn} onPress={pickDocument}>
                  <Ionicons name="document-attach" size={22} color="#1A56DB" />
                  <Text style={s.pickerBtnText}>PDF / File</Text>
                </TouchableOpacity>
              </View>

              {/* Selected file preview */}
              {uploadModal.file && (
                <View style={s.selectedFileBox}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text style={s.selectedFileName} numberOfLines={1}>
                    {uploadModal.file.name || uploadModal.file.fileName || 'Document File Selected'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setUploadModal((prev) => ({ ...prev, file: null }))}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}

              {uploadModal.error ? <Text style={s.errorText}>{uploadModal.error}</Text> : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[s.primarySubmitBtn, uploadModal.uploading && { opacity: 0.7 }]}
                disabled={uploadModal.uploading}
                onPress={submitUpload}
              >
                {uploadModal.uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.primarySubmitText}>Upload & Save Certificate</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 2,
  },
  statCardGreen: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  statCardAmber: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  statCardRed: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statSub: {
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center',
  },

  // Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  // Filter Chips
  filterChipsRow: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#1A56DB',
    borderColor: '#1A56DB',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Loading & Empty
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
  },

  // Vehicle Card
  vehicleCard: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  plateText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    fontSize: 14,
    color: '#0F172A',
  },
  compliantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  compliantBadgeText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  expiredBadgeText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  expiringBadgeText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
  missingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  missingBadgeText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  modelRow: {
    flexDirection: 'row',
  },
  modelText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  // 6 Doc Chips Grid
  docChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  docChipValid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  docChipExpiring: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  docChipExpired: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  docChipMissing: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  docChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  docChipTextValid: {
    color: '#16A34A',
  },
  docChipTextExpiring: {
    color: '#D97706',
  },
  docChipTextExpired: {
    color: '#DC2626',
  },
  docChipTextMissing: {
    color: '#64748B',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A56DB',
  },

  // Drawer / Detail Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    margin: 0,
    padding: 0,
  },
  drawerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    width: '100%',
    maxHeight: '90%',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  drawerPlate: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  drawerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  drawerCloseBtn: {
    padding: 4,
  },
  drawerDocsList: {
    padding: 16,
    gap: 12,
  },

  // Doc Detail Item inside Drawer
  docDetailItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  docDetailTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docDetailTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docDetailDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  docStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  docStatusValid: {
    backgroundColor: '#DCFCE7',
  },
  docStatusExpiring: {
    backgroundColor: '#FEF3C7',
  },
  docStatusExpired: {
    backgroundColor: '#FEE2E2',
  },
  docStatusMissing: {
    backgroundColor: '#E2E8F0',
  },
  docStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Uploaded Meta
  docUploadedMeta: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docMetaText: {
    fontSize: 12,
    color: '#475569',
  },
  docActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  docViewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  docViewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A56DB',
  },
  docReplaceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  docReplaceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // Missing Box
  docMissingBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  docMissingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docMissingText: {
    fontSize: 12,
    color: '#64748B',
  },
  docUploadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A56DB',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  docUploadActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Lightbox Modal
  lightboxOverlay: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  lightboxTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  lightboxTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  lightboxSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  lightboxSideToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 2,
    gap: 4,
    marginRight: 8,
  },
  lightboxToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  lightboxToggleBtnActive: {
    backgroundColor: '#1A56DB',
  },
  lightboxToggleText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '600',
  },
  lightboxToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  lightboxImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },

  // Document photo thumbnails in drawer
  docFilesContainer: {
    marginTop: 8,
    gap: 6,
  },
  docFilesHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  docFilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docFileCard: {
    flex: 1,
    minWidth: 120,
    maxWidth: '49%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  docFileThumb: {
    width: '100%',
    height: 90,
    backgroundColor: '#E2E8F0',
  },
  docFileMeta: {
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docFileSideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  docFileSideText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1A56DB',
  },
  docFileViewText: {
    fontSize: 10,
    color: '#64748B',
  },

  // Action / Upload Modal
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    gap: 6,
  },
  pickerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A56DB',
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
  primarySubmitBtn: {
    backgroundColor: '#1A56DB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  primarySubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
  },
});
