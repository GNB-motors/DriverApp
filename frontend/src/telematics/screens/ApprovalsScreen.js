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
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, BackHeader } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FILTER_OPTIONS = [
  { key: 'ALL', label: 'All Approvals', icon: 'layers-outline' },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: 'chatbubbles-outline' },
  { key: 'OFFICE', label: 'Owner & Manager', icon: 'briefcase-outline' },
  { key: 'FIELD_AGENT', label: 'Field Agent', icon: 'person-outline' },
  { key: 'TRIPS', label: 'Trip Approvals', icon: 'navigate-outline' },
];

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

/**
 * Extracts and normalizes all available photos (Fuel Bill, Odometer, Pump, Slip)
 * from any approval item schema (WhatsApp, Field Agent, Owner/Manager captures).
 */
function extractPhotos(item) {
  const photos = [];
  const add = (url, label, type) => {
    if (!url || typeof url !== 'string') return;
    const resolved = resolveImageUrl(url);
    if (resolved && !photos.some((p) => p.url === resolved)) {
      photos.push({ url: resolved, label, type });
    }
  };

  // 1. Direct explicit fields
  if (item.fuelImageUrl) add(item.fuelImageUrl, 'Fuel Bill', 'BILL');
  if (item.receiptPhotoUrl) add(item.receiptPhotoUrl, 'Fuel Bill', 'BILL');
  if (item.fuelSlipUrl) add(item.fuelSlipUrl, 'Fuel Slip', 'BILL');
  if (item.imageUrl) add(item.imageUrl, 'Fuel Bill', 'BILL');
  if (item.photoUrl) add(item.photoUrl, 'Fuel Bill', 'BILL');

  if (item.odometerImageUrl) add(item.odometerImageUrl, 'Odometer Photo', 'ODOMETER');
  if (item.meterPhotoUrl) add(item.meterPhotoUrl, 'Odometer Photo', 'ODOMETER');
  if (item.odometerUrl) add(item.odometerUrl, 'Odometer Photo', 'ODOMETER');
  if (item.odometerPhotoUrl) add(item.odometerPhotoUrl, 'Odometer Photo', 'ODOMETER');

  // 2. Photos Array (WhatsApp pipeline / general schema)
  if (Array.isArray(item.photos)) {
    item.photos.forEach((p, idx) => {
      const pUrl = typeof p === 'string' ? p : p?.url || p?.path;
      const kind = String(p?.kind || '').toLowerCase();
      const isOdo = kind === 'odometer' || kind === 'meter' || kind === 'dashboard';
      const label = isOdo
        ? 'Odometer Photo'
        : kind === 'pump'
        ? 'Pump Photo'
        : kind === 'bill'
        ? 'Bill Photo'
        : `Photo ${idx + 1}`;
      add(pUrl, label, isOdo ? 'ODOMETER' : 'BILL');
    });
  }

  // 3. Images Array
  if (Array.isArray(item.images)) {
    item.images.forEach((img, idx) => {
      const iUrl = typeof img === 'string' ? img : img?.url || img?.path;
      add(iUrl, `Photo ${idx + 1}`, 'BILL');
    });
  }

  // 4. Pages Array (Office bill captures)
  if (Array.isArray(item.pages)) {
    item.pages.forEach((page, idx) => {
      const pUrl = typeof page === 'string' ? page : page?.url || page?.path;
      add(pUrl, `Bill Page ${idx + 1}`, 'BILL');
    });
  }

  // 5. Office Capture thumbnail / endpoint fallback
  if (item.thumbnailUrl) {
    add(item.thumbnailUrl, 'Bill Photo', 'BILL');
  }
  if (item.approvalCategory === 'OFFICE' && photos.length === 0 && (item.id || item._id)) {
    add(`/api/fleet-view/bills/${encodeURIComponent(item.id || item._id)}/pages/0`, 'Bill Photo', 'BILL');
  }

  return photos;
}

export default function ApprovalsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { service, branchId, data: managerData } = useManagerData();

  // Active filter
  const [filter, setFilter] = useState('ALL');
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);

  // Queues
  const [whatsappItems, setWhatsappItems] = useState([]);
  const [officeItems, setOfficeItems] = useState([]);
  const [fieldAgentItems, setFieldAgentItems] = useState([]);
  const [tripItems, setTripItems] = useState([]);
  const [counts, setCounts] = useState({
    whatsapp: 0,
    office: 0,
    fieldAgent: 0,
    trips: 0,
    total: 0,
  });

  // Photo Viewer Lightbox state
  const [photoViewer, setPhotoViewer] = useState({
    open: false,
    loading: false,
    item: null,
    photos: [],
    activeIndex: 0,
  });

  // Modals
  const [rejectModal, setRejectModal] = useState({ open: false, type: null, id: null, reason: '' });
  const [linkTruckModal, setLinkTruckModal] = useState({ open: false, captureId: null, vehicleId: '', currentTruck: '' });
  const [uploadBillModal, setUploadBillModal] = useState(false);
  const [whatsappChatModal, setWhatsappChatModal] = useState(false);

  // Upload Fuel Bill state
  const [uploadFiles, setUploadFiles] = useState([]);
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [fuelType, setFuelType] = useState('DIESEL');
  const [fillingType, setFillingType] = useState('FULL_TANK');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Bulk WhatsApp Chat Upload state
  const [chatZipFile, setChatZipFile] = useState(null);
  const [chatUploading, setChatUploading] = useState(false);
  const [chatUploadPercent, setChatUploadPercent] = useState(0);
  const [chatJobStatus, setChatJobStatus] = useState(null);
  const chatPollTimer = useRef(null);

  // Vehicles for selection
  const vehicles = useMemo(() => {
    return Array.isArray(managerData?.vehicles) ? managerData.vehicles : [];
  }, [managerData]);

  // Load approvals from all 4 queues
  const loadApprovals = useCallback(async (isRefresh = false) => {
    if (!service) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const bId = branchId === 'all' ? undefined : branchId;

    try {
      const [
        waRes,
        waCountsRes,
        officeRes,
        faRes,
        faCountsRes,
        tripRes,
      ] = await Promise.allSettled([
        service.whatsappDrafts({ status: 'READY', limit: 50 }, bId),
        service.whatsappDraftCounts(bId),
        service.officeBillCaptures({ status: 'pending', limit: 50 }, bId),
        service.fieldAgentApprovals({ status: 'PENDING', limit: 50 }, bId),
        service.fieldAgentApprovalCounts(bId),
        service.tripApprovals({ limit: 50 }, bId),
      ]);

      // 1. WhatsApp Drafts
      let waList = waRes.status === 'fulfilled' ? (waRes.value?.items || waRes.value?.data || []) : [];
      const waCount = waCountsRes.status === 'fulfilled' ? (waCountsRes.value?.READY ?? waList.length) : waList.length;

      // Prefetch presigned image URLs for WhatsApp drafts that lack fuelImageUrl in the list
      if (Array.isArray(waList) && waList.length > 0) {
        const needsHydration = waList.filter(
          (d) => (d._id || d.id) && !d.fuelImageUrl && (d.documentId || !d.photos || d.photos.length === 0)
        );
        if (needsHydration.length > 0) {
          try {
            const hydrationResults = await Promise.allSettled(
              needsHydration.slice(0, 15).map((d) => service.whatsappDraft(d._id || d.id, bId))
            );
            hydrationResults.forEach((hRes, idx) => {
              if (hRes.status === 'fulfilled' && hRes.value) {
                const detailed = hRes.value?.data || hRes.value;
                const targetId = String(needsHydration[idx]._id || needsHydration[idx].id);
                const itemIdx = waList.findIndex((it) => String(it._id || it.id) === targetId);
                if (itemIdx >= 0) {
                  waList[itemIdx] = { ...waList[itemIdx], ...detailed };
                }
              }
            });
          } catch {
            // non-fatal prefetch error
          }
        }
      }
      setWhatsappItems(Array.isArray(waList) ? waList : []);

      // 2. Owner & Manager (Office bills)
      const officeList = officeRes.status === 'fulfilled' ? (officeRes.value?.captures || officeRes.value?.data || []) : [];
      const officeCount = officeRes.status === 'fulfilled' ? (officeRes.value?.total ?? officeList.length) : officeList.length;
      setOfficeItems(Array.isArray(officeList) ? officeList : []);

      // 3. Field Agent
      const faList = faRes.status === 'fulfilled' ? (faRes.value?.data || faRes.value?.items || []) : [];
      const faCount = faCountsRes.status === 'fulfilled' ? (faCountsRes.value?.PENDING ?? faList.length) : faList.length;
      setFieldAgentItems(Array.isArray(faList) ? faList : []);

      // 4. Trip Approvals
      const tripList = tripRes.status === 'fulfilled' ? (tripRes.value?.items || tripRes.value?.data || []) : [];
      const tripCount = tripRes.status === 'fulfilled' ? (tripRes.value?.total ?? tripList.length) : tripList.length;
      setTripItems(Array.isArray(tripList) ? tripList : []);

      setCounts({
        whatsapp: waCount,
        office: officeCount,
        fieldAgent: faCount,
        trips: tripCount,
        total: waCount + officeCount + faCount + tripCount,
      });
    } catch {
      // keep fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [service, branchId]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // Combined and sorted list with FULL dynamic metadata extraction matching the website
  const displayItems = useMemo(() => {
    const list = [];

    // ── 1. WHATSAPP DRAFTS ──
    if (filter === 'ALL' || filter === 'WHATSAPP') {
      whatsappItems.forEach((item) => {
        const photos = extractPhotos({ ...item, approvalCategory: 'WHATSAPP' });

        // Plate extraction (website parity: vehicleId.registrationNumber, vehicleReg, truck.plate, plateText, fuelOcr)
        const plate =
          item.vehicleId?.registrationNumber ||
          item.vehicleReg ||
          item.truck?.plate ||
          item.plateText ||
          item.fuelOcr?.data?.vehicleNumber ||
          item.vehicleNumber ||
          item.registrationNumber ||
          item.truck?.candidates?.[0]?.registrationNumber ||
          item.truck?.candidates?.[0]?.plate ||
          'Unidentified Truck';

        // Certainty chip
        let certaintyBadge = null;
        if (item.market === true || item.truck?.status === 'MARKET') {
          certaintyBadge = { text: 'Market Truck', color: '#D97706', bg: '#FEF3C7' };
        } else if (item.truck?.bucket === 'EXACT' || item.truck?.status === 'EXACT') {
          certaintyBadge = { text: 'Plate Verified', color: '#16A34A', bg: '#DCFCE7' };
        } else if (item.truck?.status === 'PREDICTED_LIKELY' || item.truck?.level === 'likely') {
          certaintyBadge = { text: 'Likely Match', color: '#2563EB', bg: '#DBEAFE' };
        } else if (item.truck?.candidates?.length > 0) {
          certaintyBadge = { text: 'Possible Match', color: '#7C3AED', bg: '#EDE9FE' };
        } else if (plate === 'Unidentified Truck') {
          certaintyBadge = { text: 'Truck Not Found', color: '#DC2626', bg: '#FEE2E2' };
        }

        // Uploaded by / Sender
        const senderObj = item.sender || item.userId;
        const senderName = typeof senderObj === 'object' && senderObj
          ? [senderObj.firstName, senderObj.lastName].filter(Boolean).join(' ') || senderObj.name
          : (typeof senderObj === 'string' ? senderObj : null);
        const senderPhone = item.phoneE164 || item.waId || (typeof senderObj === 'object' ? senderObj?.phone : null);
        const uploaderText = senderName
          ? `${senderName}${senderPhone ? ` (${senderPhone})` : ''}`
          : (senderPhone ? `WhatsApp: ${senderPhone}` : 'Driver via WhatsApp');

        // Driver (Assigned or reported)
        const assigned = item.driverAssigned?.name;
        const driverText = assigned
          ? `${assigned} · Assigned Driver`
          : (item.driver?.name || [item.driver?.firstName, item.driver?.lastName].filter(Boolean).join(' ') || item.driverName || null);

        // Station / Pump
        const stationText = item.pump?.name || item.stationName || item.fuelOcr?.data?.location || null;

        // Litres & Amount & Rate
        const litres = item.litres ?? item.litresRead?.pump ?? item.litresRead?.captionGiven ?? item.litresRead?.reply ?? null;
        const amount = item.amount ?? null;
        const rate = item.rate ?? (amount && litres ? (amount / litres).toFixed(2) : null);

        // Odometer
        const odometer = item.odometerReading ?? item.odometerKm ?? item.kmSinceLastFill?.odometer ?? null;
        const odoSource = item.odometerSource || (item.odometerPhotoProvided ? 'PHOTO' : null);

        // Date & Review reasons
        const date = item.billDatetime || item.time?.value || item.createdAt;
        const reviewReasons = Array.isArray(item.pipelineReasons) && item.pipelineReasons.length > 0
          ? item.pipelineReasons.join('; ')
          : (item.pipelineReason || item.rejectReason || null);

        list.push({
          ...item,
          approvalCategory: 'WHATSAPP',
          categoryLabel: 'WhatsApp',
          categoryColor: '#16A34A',
          categoryBg: '#DCFCE7',
          categoryIcon: 'chatbubbles-outline',
          id: item._id || item.id,
          plate,
          certaintyBadge,
          uploaderText,
          driverText,
          stationText,
          litres,
          amount,
          rate,
          fuelType: item.fuelType || 'DIESEL',
          odometer,
          odoSource,
          date,
          reviewReasons,
          photos,
          billPhoto: photos.find((p) => p.type === 'BILL') || null,
          odometerPhoto: photos.find((p) => p.type === 'ODOMETER') || null,
          hasPhotos: photos.length > 0,
        });
      });
    }

    // ── 2. OWNER & MANAGER (OFFICE BILLS) ──
    if (filter === 'ALL' || filter === 'OFFICE') {
      officeItems.forEach((item) => {
        const ocr = item.ocr || {};
        const photos = extractPhotos({ ...item, approvalCategory: 'OFFICE' });

        // Plate extraction (website parity: officeBill.js chosenPlate)
        const chosenPlate =
          item.link?.registrationNumber ||
          item.vehicleHint ||
          item.suggestion?.candidates?.[0]?.registrationNumber ||
          item.suggestion?.candidates?.[0]?.plate ||
          ocr.vehicleNumber ||
          ocr.registrationNumber ||
          ocr.vehicleNo ||
          item.vehicleNumber ||
          item.vehicleReg ||
          item.registrationNumber;
        const plate = chosenPlate || 'Unassigned Truck';

        // Match status chip
        let certaintyBadge = null;
        if (item.link?.registrationNumber) {
          certaintyBadge = { text: 'Confirmed Link', color: '#16A34A', bg: '#DCFCE7' };
        } else if (['MARKET_TRUCK', 'NO_TRUCK_WITH_THESE_DIGITS'].includes(item.suggestion?.askReason)) {
          certaintyBadge = { text: 'Market Truck?', color: '#D97706', bg: '#FEF3C7' };
        } else if (item.suggestion?.candidates?.[0]) {
          const score = Number(item.suggestion.candidates[0].score);
          if (score >= 80 || score >= 0.8) {
            certaintyBadge = { text: 'Strong Match', color: '#16A34A', bg: '#DCFCE7' };
          } else {
            certaintyBadge = { text: 'Possible Match', color: '#2563EB', bg: '#DBEAFE' };
          }
        } else {
          certaintyBadge = { text: 'Needs Truck Link', color: '#DC2626', bg: '#FEE2E2' };
        }

        // Uploaded by identity (name and role)
        const uploaderObj = item.uploadedBy;
        const uploaderName = typeof uploaderObj === 'object' && uploaderObj
          ? [uploaderObj.firstName, uploaderObj.lastName].filter(Boolean).join(' ') || uploaderObj.name || uploaderObj.fullName
          : (typeof uploaderObj === 'string' ? uploaderObj : null);
        const uploaderRole = typeof uploaderObj === 'object' && uploaderObj?.role
          ? uploaderObj.role
          : item.uploaderRole || item.uploadedByRole || 'Manager';
        const roleDisplay = uploaderRole.charAt(0).toUpperCase() + uploaderRole.slice(1).toLowerCase();
        const uploaderText = uploaderName
          ? `${uploaderName} · ${roleDisplay}`
          : (item.uploaderName || item.uploadedByName || `${roleDisplay} Upload`);

        // Station & Fuel metrics
        const stationText = ocr.pump ?? ocr.station ?? item.pump ?? item.stationName ?? null;
        const litres = ocr.litres ?? ocr.fuelLitres ?? item.litres ?? null;
        const amount = ocr.amount ?? ocr.totalCost ?? item.amount ?? null;
        const rate = ocr.rate ?? (amount && litres ? (amount / litres).toFixed(2) : null);
        const fuelType = ocr.fuelType || item.fuelType || item.kind || 'DIESEL';
        const odometer = ocr.odometerReading ?? item.odometer ?? null;
        const date = item.suggestion?.photo?.date ?? ocr.printedDate ?? ocr.date ?? item.createdAt;

        list.push({
          ...item,
          approvalCategory: 'OFFICE',
          categoryLabel: 'Owner & Manager',
          categoryColor: '#2563EB',
          categoryBg: '#DBEAFE',
          categoryIcon: 'briefcase-outline',
          id: item._id || item.id,
          plate,
          certaintyBadge,
          uploaderText,
          driverText: null,
          stationText,
          litres,
          amount,
          rate,
          fuelType,
          odometer,
          odoSource: odometer != null ? 'OCR' : null,
          date,
          reviewReasons: item.suggestion?.askReason ? `Review reason: ${item.suggestion.askReason.replace(/_/g, ' ')}` : null,
          photos,
          billPhoto: photos.find((p) => p.type === 'BILL') || null,
          odometerPhoto: photos.find((p) => p.type === 'ODOMETER') || null,
          hasPhotos: photos.length > 0,
        });
      });
    }

    // ── 3. FIELD AGENT FUEL LOGS ──
    if (filter === 'ALL' || filter === 'FIELD_AGENT') {
      fieldAgentItems.forEach((item) => {
        const agent = item.loggedBy || item.agentId || {};
        const agentName = typeof agent === 'object'
          ? [agent.firstName, agent.lastName].filter(Boolean).join(' ') || agent.name
          : (typeof agent === 'string' ? agent : 'Field Agent');
        const uploaderText = `${agentName} · Field Agent`;

        const photos = extractPhotos({ ...item, approvalCategory: 'FIELD_AGENT' });
        const plate = item.vehicleId?.registrationNumber || item.registrationNumber || item.vehicleNumber || 'No Plate';

        let certaintyBadge = null;
        if (item.reviewStatus === 'NEEDS_REVIEW') {
          certaintyBadge = { text: 'Check Bill', color: '#D97706', bg: '#FEF3C7' };
        } else {
          certaintyBadge = { text: 'Read OK', color: '#16A34A', bg: '#DCFCE7' };
        }

        const litres = item.litres ?? item.quantity ?? null;
        const amount = item.totalAmount ?? item.amount ?? null;
        const rate = amount && litres ? (amount / litres).toFixed(2) : null;
        const stationText = item.location || item.pumpName || item.stationName || null;

        list.push({
          ...item,
          approvalCategory: 'FIELD_AGENT',
          categoryLabel: 'Field Agent',
          categoryColor: '#D97706',
          categoryBg: '#FEF3C7',
          categoryIcon: 'person-outline',
          id: item._id || item.id,
          plate,
          certaintyBadge,
          uploaderText,
          driverText: item.driverName ? `Driver: ${item.driverName}` : null,
          stationText,
          litres,
          amount,
          rate,
          fuelType: item.fuelType || 'DIESEL',
          odometer: item.odometerReading ?? null,
          odoSource: item.odometerReading != null ? 'Meter' : null,
          date: item.refuelTime || item.createdAt,
          reviewReasons: Array.isArray(item.reviewReasons) ? item.reviewReasons.join(', ') : null,
          photos,
          billPhoto: photos.find((p) => p.type === 'BILL') || null,
          odometerPhoto: photos.find((p) => p.type === 'ODOMETER') || null,
          hasPhotos: photos.length > 0,
        });
      });
    }

    // ── 4. TRIP APPROVALS ──
    if (filter === 'ALL' || filter === 'TRIPS') {
      tripItems.forEach((item) => {
        const vReg = item.vehicle?.registrationNumber || item.vehicleNumber || 'Vehicle Detour';
        const dName = item.driver?.name || item.driverName || 'Driver';
        const placeName = item.place?.name || item.placeSpec?.kind || item.type || 'Detour Authorised';

        list.push({
          ...item,
          approvalCategory: 'TRIPS',
          categoryLabel: 'Trip Approval',
          categoryColor: '#7C3AED',
          categoryBg: '#EDE9FE',
          categoryIcon: 'navigate-outline',
          id: item._id || item.id,
          plate: vReg,
          certaintyBadge: { text: item.status || 'Active', color: '#7C3AED', bg: '#EDE9FE' },
          uploaderText: `Driver Visit: ${dName}`,
          driverText: dName,
          stationText: placeName,
          litres: null,
          amount: null,
          rate: null,
          fuelType: null,
          odometer: null,
          odoSource: null,
          date: item.createdAt || item.window?.from,
          reviewReasons: item.reason || null,
          photos: [],
          billPhoto: null,
          odometerPhoto: null,
          hasPhotos: false,
        });
      });
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [filter, whatsappItems, officeItems, fieldAgentItems, tripItems]);

  // Open photo viewer with on-demand fallback fetch if photos are not yet preloaded
  const openPhotoViewer = async (item, preferredTypeOrIndex = 0) => {
    let photos = item.photos || [];

    // If photos are empty, dynamically fetch full detail from backend (WhatsApp or document)
    if (photos.length === 0 && (item.approvalCategory === 'WHATSAPP' || item.documentId)) {
      setPhotoViewer({
        open: true,
        loading: true,
        item,
        photos: [],
        activeIndex: 0,
      });

      try {
        const bId = branchId === 'all' ? undefined : branchId;
        const res = await service.whatsappDraft(item.id, bId);
        const detailed = res?.data || res;
        if (detailed) {
          const fullItem = { ...item, ...detailed };
          photos = extractPhotos({ ...fullItem, approvalCategory: 'WHATSAPP' });
          // Update item in whatsappItems so future taps are instant
          setWhatsappItems((prev) =>
            prev.map((it) => (String(it._id || it.id) === String(item.id) ? { ...it, ...fullItem } : it))
          );
        }
      } catch {
        // non-fatal
      }
    }

    let index = 0;
    if (preferredTypeOrIndex === 'ODOMETER') {
      const odoIdx = photos.findIndex((p) => p.type === 'ODOMETER');
      if (odoIdx >= 0) index = odoIdx;
    } else if (typeof preferredTypeOrIndex === 'number' && preferredTypeOrIndex >= 0 && preferredTypeOrIndex < photos.length) {
      index = preferredTypeOrIndex;
    }

    setPhotoViewer({
      open: true,
      loading: false,
      item,
      photos,
      activeIndex: index,
    });
  };

  // Action handlers
  const handleApprove = async (item) => {
    setActionBusyId(item.id);
    const bId = branchId === 'all' ? undefined : branchId;
    try {
      if (item.approvalCategory === 'WHATSAPP') {
        await service.whatsappPublishDraft(item.id, {}, bId);
        Alert.alert('Approved', `WhatsApp fuel bill for ${item.plate} approved.`);
      } else if (item.approvalCategory === 'FIELD_AGENT') {
        await service.fieldAgentApprove([item.id], bId);
        Alert.alert('Approved', `Field agent fuel log for ${item.plate} approved.`);
      }
      if (photoViewer.open) {
        setPhotoViewer({ open: false, loading: false, item: null, photos: [], activeIndex: 0 });
      }
      loadApprovals(true);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not approve item.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleOpenReject = (item) => {
    if (photoViewer.open) {
      setPhotoViewer({ open: false, loading: false, item: null, photos: [], activeIndex: 0 });
    }
    setRejectModal({
      open: true,
      type: item.approvalCategory,
      id: item.id,
      reason: '',
    });
  };

  const submitReject = async () => {
    const { type, id, reason } = rejectModal;
    if (!id) return;
    setRejectModal({ open: false, type: null, id: null, reason: '' });
    setActionBusyId(id);
    const bId = branchId === 'all' ? undefined : branchId;
    try {
      if (type === 'WHATSAPP') {
        await service.whatsappRejectDraft(id, reason.trim() || 'Rejected by manager', bId);
        Alert.alert('Rejected', 'WhatsApp bill rejected.');
      } else if (type === 'FIELD_AGENT') {
        await service.fieldAgentReject([id], reason.trim() || 'Rejected by manager', bId);
        Alert.alert('Rejected', 'Field agent fuel upload rejected.');
      }
      loadApprovals(true);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not reject item.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleOpenLinkTruck = (item) => {
    if (photoViewer.open) {
      setPhotoViewer({ open: false, loading: false, item: null, photos: [], activeIndex: 0 });
    }
    setLinkTruckModal({
      open: true,
      captureId: item.id,
      vehicleId: '',
      currentTruck: item.plate,
    });
  };

  const submitLinkTruck = async () => {
    const { captureId, vehicleId } = linkTruckModal;
    if (!captureId || !vehicleId) {
      Alert.alert('Select Truck', 'Please choose a vehicle to link this bill.');
      return;
    }
    setLinkTruckModal({ open: false, captureId: null, vehicleId: '', currentTruck: '' });
    setActionBusyId(captureId);
    const bId = branchId === 'all' ? undefined : branchId;
    try {
      await service.officeBillConfirm([{ captureId, vehicleId }], bId);
      Alert.alert('Success', 'Bill linked to vehicle successfully.');
      loadApprovals(true);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not link vehicle to bill.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRevokeTrip = (item) => {
    Alert.alert('Revoke Trip Approval', `Are you sure you want to revoke approval for ${item.plate}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          setActionBusyId(item.id);
          const bId = branchId === 'all' ? undefined : branchId;
          try {
            await service.tripApprovalRevoke(item.id, bId);
            Alert.alert('Revoked', 'Trip approval revoked.');
            loadApprovals(true);
          } catch (e) {
            Alert.alert('Error', e?.message || 'Could not revoke trip approval.');
          } finally {
            setActionBusyId(null);
          }
        },
      },
    ]);
  };

  // Upload Fuel Bill Picker actions
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
        // Single confirmed bill upload
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
        // Bulk or multiple captures to office queue
        const vehicle = vehicles.find((v) => (v.id || v._id) === selectedTruckId);
        const truckPlate = vehicle?.registrationNumber || '';
        for (let i = 0; i < uploadFiles.length; i++) {
          const clientId = `upload-${Date.now()}-${i}`;
          await service.uploadBillCapture(uploadFiles[i], clientId, { truck: truckPlate, kind: fuelType }, bId);
        }
        setUploadSuccess(`${uploadFiles.length} bill(s) uploaded to Owner & Manager queue!`);
      }
      setUploadFiles([]);
      loadApprovals(true);
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

  // Bulk WhatsApp Chat Export Picker
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
              setChatJobStatus(`Completed! ${job?.photosTotal || 0} photos processed.`);
              loadApprovals(true);
              Alert.alert('Import Complete', 'WhatsApp chat imported successfully! Check WhatsApp Approvals tab.');
            } else if (job?.status === 'failed') {
              clearInterval(chatPollTimer.current);
              setChatUploading(false);
              setChatJobStatus('Import completed with partial logs.');
              loadApprovals(true);
            }
          } catch {
            if (pollCount > 10) {
              clearInterval(chatPollTimer.current);
              setChatUploading(false);
              loadApprovals(true);
            }
          }
        }, 3000);
      } else {
        setChatUploading(false);
        setChatJobStatus('Chat uploaded successfully!');
        loadApprovals(true);
        Alert.alert('Success', 'WhatsApp chat archive uploaded for background processing.');
      }
    } catch (err) {
      setChatUploading(false);
      setChatJobStatus('');
      Alert.alert('Upload Failed', err?.message || 'Could not upload WhatsApp chat export.');
    }
  };

  const activePhoto = photoViewer.photos[photoViewer.activeIndex] || null;

  return (
    <View style={s.container}>
      <BackHeader
        title="Approvals"
        subtitle="Review, inspect photos and verify operational approvals"
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadApprovals(true)} />}
      >
        {/* Top Action Bar for Uploads */}
        <View style={s.actionBar}>
          <TouchableOpacity
            style={[s.actionBtn, s.primaryActionBtn]}
            onPress={() => {
              setUploadFiles([]);
              setUploadError('');
              setUploadSuccess('');
              setUploadBillModal(true);
            }}
          >
            <Ionicons name="camera" size={18} color="#FFFFFF" />
            <Text style={s.primaryActionText}>Upload Fuel Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, s.secondaryActionBtn]}
            onPress={() => {
              setChatZipFile(null);
              setChatJobStatus(null);
              setChatUploadPercent(0);
              setWhatsappChatModal(true);
            }}
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#1A56DB" />
            <Text style={s.secondaryActionText}>Upload WhatsApp Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Dropdown Bar */}
        <View style={s.filterContainer}>
          <Text style={s.filterLabel}>Filter Queue:</Text>
          <TouchableOpacity style={s.filterDropdownBtn} onPress={() => setShowFilterPicker(true)}>
            <View style={s.filterBtnInner}>
              <Ionicons
                name={FILTER_OPTIONS.find((o) => o.key === filter)?.icon || 'layers-outline'}
                size={16}
                color="#1A56DB"
              />
              <Text style={s.filterBtnText}>
                {FILTER_OPTIONS.find((o) => o.key === filter)?.label}
                {filter === 'ALL'
                  ? ` (${counts.total})`
                  : filter === 'WHATSAPP'
                  ? ` (${counts.whatsapp})`
                  : filter === 'OFFICE'
                  ? ` (${counts.office})`
                  : filter === 'FIELD_AGENT'
                  ? ` (${counts.fieldAgent})`
                  : ` (${counts.trips})`}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Approval Queue Cards */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#1A56DB" />
            <Text style={s.loadingText}>Loading approvals from server…</Text>
          </View>
        ) : displayItems.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={56} color="#16A34A" />
            <Text style={s.emptyTitle}>All Caught Up!</Text>
            <Text style={s.emptySubtitle}>No pending approvals found for the selected filter.</Text>
          </View>
        ) : (
          displayItems.map((item, index) => {
            const isBusy = actionBusyId === item.id;
            return (
              <Card key={`${item.approvalCategory}-${item.id}-${index}`} style={s.card}>
                {/* 1. Header Row: Category Badge + Certainty Chip + Vehicle Plate */}
                <View style={s.cardHeader}>
                  <View style={s.headerLeft}>
                    <View style={[s.categoryBadge, { backgroundColor: item.categoryBg }]}>
                      <Ionicons name={item.categoryIcon} size={14} color={item.categoryColor} />
                      <Text style={[s.categoryBadgeText, { color: item.categoryColor }]}>
                        {item.categoryLabel}
                      </Text>
                    </View>
                    {item.certaintyBadge && (
                      <View style={[s.certaintyBadge, { backgroundColor: item.certaintyBadge.bg }]}>
                        <Text style={[s.certaintyBadgeText, { color: item.certaintyBadge.color }]}>
                          {item.certaintyBadge.text}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={s.plateBadge}>
                    <Ionicons name="bus-outline" size={14} color="#0F172A" style={{ marginRight: 5 }} />
                    <Text style={s.plateText}>{item.plate}</Text>
                  </View>
                </View>

                {/* 2. Key Facts Row (Amount, Litres, Fuel Type, Rate) */}
                {(item.amount != null || item.litres != null) && (
                  <View style={s.kpiBar}>
                    {item.amount != null && (
                      <View style={s.kpiItem}>
                        <Text style={s.kpiLabel}>AMOUNT</Text>
                        <Text style={s.kpiValueMoney}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                      </View>
                    )}
                    {item.litres != null && (
                      <View style={s.kpiItem}>
                        <Text style={s.kpiLabel}>VOLUME</Text>
                        <Text style={s.kpiValue}>
                          {Number(item.litres).toFixed(1)} L <Text style={s.kpiSub}>({item.fuelType})</Text>
                        </Text>
                      </View>
                    )}
                    {item.rate != null && (
                      <View style={s.kpiItem}>
                        <Text style={s.kpiLabel}>RATE</Text>
                        <Text style={s.kpiValue}>₹{item.rate}/L</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* 3. Detailed Data Grid (Matching Website Parity) */}
                <View style={s.infoGrid}>
                  {/* Uploaded By */}
                  <View style={s.infoRow}>
                    <Ionicons name="person-outline" size={14} color="#64748B" style={s.infoIcon} />
                    <Text style={s.infoLabel}>Uploaded By:</Text>
                    <Text style={s.infoValueHighlight} numberOfLines={1}>{item.uploaderText || '—'}</Text>
                  </View>

                  {/* Driver (if separate) */}
                  {item.driverText && (
                    <View style={s.infoRow}>
                      <Ionicons name="navigate-outline" size={14} color="#64748B" style={s.infoIcon} />
                      <Text style={s.infoLabel}>Driver:</Text>
                      <Text style={s.infoValue} numberOfLines={1}>{item.driverText}</Text>
                    </View>
                  )}

                  {/* Station / Pump */}
                  {item.stationText && (
                    <View style={s.infoRow}>
                      <Ionicons name="location-outline" size={14} color="#64748B" style={s.infoIcon} />
                      <Text style={s.infoLabel}>Pump / Station:</Text>
                      <Text style={s.infoValue} numberOfLines={1}>{item.stationText}</Text>
                    </View>
                  )}

                  {/* Odometer */}
                  {item.odometer != null && (
                    <View style={s.infoRow}>
                      <Ionicons name="speedometer-outline" size={14} color="#D97706" style={s.infoIcon} />
                      <Text style={s.infoLabel}>Odometer:</Text>
                      <Text style={[s.infoValue, { color: '#B45309', fontWeight: '700' }]}>
                        {Number(item.odometer).toLocaleString('en-IN')} km {item.odoSource ? `(${item.odoSource})` : ''}
                      </Text>
                    </View>
                  )}

                  {/* Date & Time */}
                  {item.date && (
                    <View style={s.infoRow}>
                      <Ionicons name="calendar-outline" size={14} color="#64748B" style={s.infoIcon} />
                      <Text style={s.infoLabel}>Date & Time:</Text>
                      <Text style={s.infoValue}>
                        {new Date(item.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 4. Review Reasons Alert Box (if present) */}
                {item.reviewReasons && (
                  <View style={s.warningAlertBox}>
                    <Ionicons name="alert-circle" size={15} color="#B45309" style={{ marginRight: 6, marginTop: 1 }} />
                    <Text style={s.warningAlertText}>
                      <Text style={{ fontWeight: '700' }}>Review Note: </Text>
                      {item.reviewReasons}
                    </Text>
                  </View>
                )}

                {/* 5. Attached Photos Thumbnails */}
                {item.hasPhotos && (
                  <View style={s.cardThumbsSection}>
                    <Text style={s.thumbsSectionTitle}>Attached Photos for Review:</Text>
                    <View style={s.cardThumbsRow}>
                      {item.billPhoto && (
                        <TouchableOpacity
                          onPress={() => openPhotoViewer(item, 'BILL')}
                          style={s.thumbCard}
                        >
                          <Image
                            source={{
                              uri: item.billPhoto.url,
                              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                            }}
                            style={s.thumbImage}
                            resizeMode="cover"
                          />
                          <View style={s.thumbTagBadge}>
                            <Ionicons name="receipt" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                            <Text style={s.thumbTagText}>FUEL BILL</Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {item.odometerPhoto && (
                        <TouchableOpacity
                          onPress={() => openPhotoViewer(item, 'ODOMETER')}
                          style={[s.thumbCard, s.thumbCardOdo]}
                        >
                          <Image
                            source={{
                              uri: item.odometerPhoto.url,
                              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                            }}
                            style={s.thumbImage}
                            resizeMode="cover"
                          />
                          <View style={[s.thumbTagBadge, s.thumbTagOdo]}>
                            <Ionicons name="speedometer" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                            <Text style={s.thumbTagText}>ODOMETER</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* 6. Quick Photo Buttons */}
                <View style={s.photoButtonsRow}>
                  {item.billPhoto ? (
                    <TouchableOpacity
                      style={[s.photoPillBtn, s.photoPillBill]}
                      onPress={() => openPhotoViewer(item, 'BILL')}
                    >
                      <Ionicons name="receipt-outline" size={14} color="#1A56DB" />
                      <Text style={s.photoPillBillText}>Inspect Bill Photo</Text>
                      <Ionicons name="eye-outline" size={13} color="#1A56DB" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[s.photoPillBtn, s.photoPillBill]}
                      onPress={() => openPhotoViewer(item, 'BILL')}
                    >
                      <Ionicons name="image-outline" size={14} color="#1A56DB" />
                      <Text style={s.photoPillBillText}>Load Attached Photos</Text>
                      <Ionicons name="scan-outline" size={13} color="#1A56DB" />
                    </TouchableOpacity>
                  )}

                  {item.odometerPhoto && (
                    <TouchableOpacity
                      style={[s.photoPillBtn, s.photoPillOdo]}
                      onPress={() => openPhotoViewer(item, 'ODOMETER')}
                    >
                      <Ionicons name="speedometer-outline" size={14} color="#B45309" />
                      <Text style={s.photoPillOdoText}>Inspect Odometer Photo</Text>
                      <Ionicons name="eye-outline" size={13} color="#B45309" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 7. Decision Action Buttons */}
                <View style={s.actionsRow}>
                  {item.approvalCategory === 'WHATSAPP' && (
                    <>
                      <TouchableOpacity
                        style={[s.btn, s.btnReject]}
                        disabled={isBusy}
                        onPress={() => handleOpenReject(item)}
                      >
                        <Ionicons name="close" size={16} color="#DC2626" />
                        <Text style={s.btnRejectText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.btn, s.btnApprove]}
                        disabled={isBusy}
                        onPress={() => handleApprove(item)}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            <Text style={s.btnApproveText}>Approve & Save</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {item.approvalCategory === 'FIELD_AGENT' && (
                    <>
                      <TouchableOpacity
                        style={[s.btn, s.btnReject]}
                        disabled={isBusy}
                        onPress={() => handleOpenReject(item)}
                      >
                        <Ionicons name="close" size={16} color="#DC2626" />
                        <Text style={s.btnRejectText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.btn, s.btnApprove]}
                        disabled={isBusy}
                        onPress={() => handleApprove(item)}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            <Text style={s.btnApproveText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {item.approvalCategory === 'OFFICE' && (
                    <TouchableOpacity
                      style={[s.btn, s.btnLink]}
                      disabled={isBusy}
                      onPress={() => handleOpenLinkTruck(item)}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="link-outline" size={16} color="#FFFFFF" />
                          <Text style={s.btnLinkText}>Confirm & Link Truck</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {item.approvalCategory === 'TRIPS' && (
                    <TouchableOpacity
                      style={[s.btn, s.btnRevoke]}
                      disabled={isBusy}
                      onPress={() => handleRevokeTrip(item)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      <Text style={s.btnRevokeText}>Revoke Approval</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* FILTER PICKER MODAL */}
      <Modal visible={showFilterPicker} transparent animationType="fade">
        <Pressable style={s.modalOverlay} onPress={() => setShowFilterPicker(false)}>
          <View style={s.pickerCard}>
            <Text style={s.pickerTitle}>Filter Approval Queue</Text>
            {FILTER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[s.pickerOption, filter === opt.key && s.pickerOptionActive]}
                onPress={() => {
                  setFilter(opt.key);
                  setShowFilterPicker(false);
                }}
              >
                <View style={s.pickerOptionLeft}>
                  <Ionicons name={opt.icon} size={18} color={filter === opt.key ? '#1A56DB' : '#64748B'} />
                  <Text style={[s.pickerOptionText, filter === opt.key && s.pickerOptionTextActive]}>
                    {opt.label}
                  </Text>
                </View>
                {filter === opt.key && <Ionicons name="checkmark-circle" size={18} color="#1A56DB" />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* FULLSCREEN PHOTO INSPECTION LIGHTBOX MODAL */}
      <Modal visible={photoViewer.open} transparent animationType="slide">
        <View style={s.lightboxOverlay}>
          {/* Top Bar */}
          <View style={[s.viewerTopBar, { paddingTop: Math.max(insets.top, 16) }]}>
            <TouchableOpacity
              style={s.viewerCloseBtn}
              onPress={() => setPhotoViewer({ open: false, loading: false, item: null, photos: [], activeIndex: 0 })}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={s.viewerHeaderCenter}>
              <Text style={s.viewerHeaderTitle}>
                {activePhoto?.label || 'Attached Photo'} {photoViewer.photos.length > 1 ? `(${photoViewer.activeIndex + 1}/${photoViewer.photos.length})` : ''}
              </Text>
              {photoViewer.item && (
                <Text style={s.viewerHeaderPlate}>{photoViewer.item.plate}</Text>
              )}
            </View>

            <TouchableOpacity
              style={s.viewerCloseBtn}
              onPress={() => setPhotoViewer({ open: false, loading: false, item: null, photos: [], activeIndex: 0 })}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Switcher Tabs Bar (if multiple photos attached) */}
          {photoViewer.photos.length > 1 && (
            <View style={s.viewerTabsRow}>
              {photoViewer.photos.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[s.viewerTab, photoViewer.activeIndex === idx && s.viewerTabActive]}
                  onPress={() => setPhotoViewer((prev) => ({ ...prev, activeIndex: idx }))}
                >
                  <Ionicons
                    name={p.type === 'ODOMETER' ? 'speedometer-outline' : 'receipt-outline'}
                    size={14}
                    color={photoViewer.activeIndex === idx ? '#FFFFFF' : '#94A3B8'}
                  />
                  <Text style={[s.viewerTabText, photoViewer.activeIndex === idx && s.viewerTabTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Main Photo Area */}
          <View style={s.viewerImageContainer}>
            {photoViewer.loading ? (
              <View style={s.viewerLoadingBox}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={s.viewerLoadingText}>Loading high-resolution bill from server…</Text>
              </View>
            ) : activePhoto ? (
              <Image
                source={{
                  uri: activePhoto.url,
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }}
                style={s.viewerImage}
                resizeMode="contain"
              />
            ) : (
              <View style={s.viewerEmptyBox}>
                <Ionicons name="image-outline" size={48} color="#64748B" />
                <Text style={s.viewerEmptyText}>No photo preview available for this entry.</Text>
              </View>
            )}
          </View>

          {/* Bottom Inspection Card & Decision Buttons */}
          {photoViewer.item && (
            <View style={[s.viewerBottomPanel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              {/* Metrics summary */}
              <View style={s.viewerMetricsBar}>
                <View style={s.viewerMetricItem}>
                  <Text style={s.viewerMetricLabel}>PLATE</Text>
                  <Text style={s.viewerMetricVal}>{photoViewer.item.plate}</Text>
                </View>
                {photoViewer.item.amount != null && (
                  <View style={s.viewerMetricItem}>
                    <Text style={s.viewerMetricLabel}>AMOUNT</Text>
                    <Text style={[s.viewerMetricVal, { color: '#16A34A' }]}>
                      ₹{Number(photoViewer.item.amount).toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
                {photoViewer.item.litres != null && (
                  <View style={s.viewerMetricItem}>
                    <Text style={s.viewerMetricLabel}>LITRES</Text>
                    <Text style={s.viewerMetricVal}>{photoViewer.item.litres} L</Text>
                  </View>
                )}
                {photoViewer.item.odometer != null && (
                  <View style={s.viewerMetricItem}>
                    <Text style={s.viewerMetricLabel}>ODOMETER</Text>
                    <Text style={[s.viewerMetricVal, { color: '#D97706' }]}>
                      {Number(photoViewer.item.odometer).toLocaleString('en-IN')} km
                    </Text>
                  </View>
                )}
              </View>

              {/* Uploaded By line in viewer */}
              {photoViewer.item.uploaderText ? (
                <Text style={s.viewerUploaderText} numberOfLines={1}>
                  👤 Uploaded by: {photoViewer.item.uploaderText}
                </Text>
              ) : null}

              {/* Direct Decision Buttons inside Photo Viewer */}
              <View style={s.viewerActionRow}>
                {(photoViewer.item.approvalCategory === 'WHATSAPP' || photoViewer.item.approvalCategory === 'FIELD_AGENT') && (
                  <>
                    <TouchableOpacity
                      style={[s.viewerActionBtn, s.viewerRejectBtn]}
                      onPress={() => handleOpenReject(photoViewer.item)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                      <Text style={s.viewerRejectText}>Reject Bill</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.viewerActionBtn, s.viewerApproveBtn]}
                      onPress={() => handleApprove(photoViewer.item)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={s.viewerApproveText}>Approve & Save</Text>
                    </TouchableOpacity>
                  </>
                )}

                {photoViewer.item.approvalCategory === 'OFFICE' && (
                  <TouchableOpacity
                    style={[s.viewerActionBtn, s.viewerApproveBtn, { flex: 1 }]}
                    onPress={() => handleOpenLinkTruck(photoViewer.item)}
                  >
                    <Ionicons name="link-outline" size={18} color="#FFFFFF" />
                    <Text style={s.viewerApproveText}>Confirm & Link Truck</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* REJECTION REASON MODAL */}
      <Modal visible={rejectModal.open} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.actionModalCard}>
            <Text style={s.modalHeading}>Reject Approval</Text>
            <Text style={s.modalSub}>Enter the reason for rejecting this fuel bill:</Text>
            <TextInput
              style={s.reasonInput}
              placeholder="e.g. Duplicate slip, illegible photo, wrong litres…"
              value={rejectModal.reason}
              onChangeText={(text) => setRejectModal((prev) => ({ ...prev, reason: text }))}
              multiline
            />
            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={[s.mBtn, s.mBtnCancel]}
                onPress={() => setRejectModal({ open: false, type: null, id: null, reason: '' })}
              >
                <Text style={s.mBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.mBtn, s.mBtnReject]} onPress={submitReject}>
                <Text style={s.mBtnRejectText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LINK TRUCK CONFIRMATION MODAL */}
      <Modal visible={linkTruckModal.open} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.actionModalCard}>
            <Text style={s.modalHeading}>Link Bill to Truck</Text>
            <Text style={s.modalSub}>Select which truck this bill photo belongs to:</Text>
            <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
              {vehicles.map((v) => {
                const vId = v.id || v._id;
                const isSelected = linkTruckModal.vehicleId === vId;
                return (
                  <TouchableOpacity
                    key={vId}
                    style={[s.truckSelectRow, isSelected && s.truckSelectRowActive]}
                    onPress={() => setLinkTruckModal((prev) => ({ ...prev, vehicleId: vId }))}
                  >
                    <Text style={[s.truckSelectText, isSelected && s.truckSelectTextActive]}>
                      {v.registrationNumber} {v.model ? `· ${v.model}` : ''}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#1A56DB" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={[s.mBtn, s.mBtnCancel]}
                onPress={() => setLinkTruckModal({ open: false, captureId: null, vehicleId: '', currentTruck: '' })}
              >
                <Text style={s.mBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.mBtn, s.mBtnConfirm]} onPress={submitLinkTruck}>
                <Text style={s.mBtnConfirmText}>Save & Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MANAGER FUEL BILL UPLOAD MODAL */}
      <Modal visible={uploadBillModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.actionModalCard, { maxHeight: '90%' }]}>
            <View style={s.modalHeaderRow}>
              <Text style={s.modalHeading}>Upload Fuel Bill</Text>
              <TouchableOpacity onPress={() => !uploading && setUploadBillModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
              {/* Vehicle Picker */}
              <View>
                <Text style={s.inputLabel}>Vehicle / Truck (Optional for multi-bill):</Text>
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
                          {v.registrationNumber}
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

      {/* WHATSAPP CHAT BULK UPLOAD MODAL */}
      <Modal visible={whatsappChatModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.actionModalCard}>
            <View style={s.modalHeaderRow}>
              <Text style={s.modalHeading}>Upload WhatsApp Chat</Text>
              <TouchableOpacity onPress={() => !chatUploading && setWhatsappChatModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={s.chatInstructionsBox}>
              <Ionicons name="information-circle-outline" size={20} color="#1A56DB" />
              <Text style={s.chatInstructionsText}>
                Export your WhatsApp driver group or individual chat as a <Text style={{ fontWeight: 'bold' }}>.ZIP (Include Media)</Text> to bulk import all fuel slips and odometer photos automatically.
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
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Action Bar
  actionBar: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  primaryActionBtn: {
    backgroundColor: '#1A56DB',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryActionBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryActionText: {
    color: '#1A56DB',
    fontWeight: '700',
    fontSize: 13,
  },

  // Filter Dropdown
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A56DB',
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
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },

  // Card Structure
  card: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  certaintyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  certaintyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  plateText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    fontSize: 14,
    color: '#0F172A',
  },

  // KPI Bar
  kpiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiItem: {
    gap: 2,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  kpiValueMoney: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  kpiSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },

  // Detailed Grid
  infoGrid: {
    gap: 6,
    paddingVertical: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoIcon: {
    width: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    width: 105,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E293B',
    flex: 1,
  },
  infoValueHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },

  // Warning Alert Box
  warningAlertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 8,
  },
  warningAlertText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },

  // Attached Photos Thumbnails
  cardThumbsSection: {
    gap: 6,
    marginTop: 4,
  },
  thumbsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardThumbsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbCard: {
    width: 90,
    height: 75,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbCardOdo: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbTagBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 86, 219, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  thumbTagOdo: {
    backgroundColor: 'rgba(217, 119, 6, 0.9)',
  },
  thumbTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Quick Photo Buttons
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  photoPillBtn: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  photoPillBill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  photoPillBillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A56DB',
  },
  photoPillOdo: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  photoPillOdoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },

  // Actions Row
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  btnReject: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnRejectText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  btnApprove: {
    backgroundColor: '#16A34A',
  },
  btnApproveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  btnLink: {
    backgroundColor: '#2563EB',
  },
  btnLinkText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  btnRevoke: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnRevokeText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },

  // Filter Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  pickerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: '#1A56DB',
    fontWeight: '700',
  },

  // Lightbox Modal
  lightboxOverlay: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  viewerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0F172A',
  },
  viewerCloseBtn: {
    padding: 8,
  },
  viewerHeaderCenter: {
    alignItems: 'center',
  },
  viewerHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  viewerHeaderPlate: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
  viewerTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  viewerTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  viewerTabActive: {
    backgroundColor: '#1A56DB',
  },
  viewerTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  viewerTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  viewerImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  viewerLoadingBox: {
    alignItems: 'center',
    gap: 12,
  },
  viewerLoadingText: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  viewerEmptyBox: {
    alignItems: 'center',
    gap: 8,
  },
  viewerEmptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerBottomPanel: {
    backgroundColor: '#1E293B',
    padding: 16,
    gap: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  viewerMetricsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewerMetricItem: {
    alignItems: 'center',
    gap: 2,
  },
  viewerMetricLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  viewerMetricVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  viewerUploaderText: {
    color: '#CBD5E1',
    fontSize: 12,
    textAlign: 'center',
  },
  viewerActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  viewerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  viewerRejectBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  viewerRejectText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  viewerApproveBtn: {
    backgroundColor: '#16A34A',
  },
  viewerApproveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Action Modals (Reject, Link, Upload)
  actionModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#0F172A',
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
  mBtnReject: {
    backgroundColor: '#DC2626',
  },
  mBtnRejectText: {
    color: '#FFFFFF',
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

  // Truck Link Modal
  truckSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  truckSelectRowActive: {
    borderColor: '#1A56DB',
    backgroundColor: '#EFF6FF',
  },
  truckSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  truckSelectTextActive: {
    color: '#1A56DB',
    fontWeight: '700',
  },

  // Upload Form
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },
  pillBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  pillBtnActive: {
    backgroundColor: '#1A56DB',
  },
  pillBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pillBtnTextActive: {
    color: '#FFFFFF',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  segmentBtnActive: {
    backgroundColor: '#1A56DB',
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
    gap: 8,
    marginTop: 4,
  },
  uploadTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    gap: 6,
  },
  uploadTileText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A56DB',
  },
  filesPreviewBox: {
    gap: 6,
    marginVertical: 4,
  },
  filesPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 2,
  },
  primarySubmitBtn: {
    backgroundColor: '#1A56DB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primarySubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
  successText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '700',
  },

  // WhatsApp Chat Modal
  chatInstructionsBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    alignItems: 'center',
  },
  chatInstructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },
  zipPickerBtn: {
    borderWidth: 2,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  zipPickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A56DB',
  },
  zipPickerSize: {
    fontSize: 11,
    color: '#64748B',
  },
  chatProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  chatProgressText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  chatProgressPct: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A56DB',
  },
});
