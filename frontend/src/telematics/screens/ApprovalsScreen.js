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
import { colors, AppText, Card, BackHeader } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FILTER_OPTIONS = [
  { key: 'ALL', label: 'All Approvals', icon: 'layers-outline' },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: 'chatbubbles-outline' },
  { key: 'OFFICE', label: 'Owner & Manager', icon: 'briefcase-outline' },
  { key: 'FIELD_AGENT', label: 'Field Agent', icon: 'person-outline' },
  { key: 'TRIPS', label: 'Trip Approvals', icon: 'navigate-outline' },
];

export default function ApprovalsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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

  // Modals
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
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

  // Bulk WhatsApp Chat Export state
  const [chatZipFile, setChatZipFile] = useState(null);
  const [chatUploading, setChatUploading] = useState(false);
  const [chatUploadPercent, setChatUploadPercent] = useState(0);
  const [chatJobStatus, setChatJobStatus] = useState(null);
  const chatPollTimer = useRef(null);

  const vehicles = useMemo(() => {
    return managerData?.vehicles || [];
  }, [managerData]);

  // Load all 4 queues
  const loadApprovals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const bId = branchId === 'all' ? undefined : branchId;

    try {
      const [waDraftsRes, waCountsRes, officeRes, faRes, faCountsRes, tripRes] = await Promise.allSettled([
        service.whatsappDrafts({ status: 'READY', page: 1, limit: 50 }, bId),
        service.whatsappDraftCounts(bId),
        service.officeBillCaptures({ status: 'pending', uploaderRole: 'OWNER,MANAGER', source: 'office', page: 1, limit: 50 }, bId),
        service.fieldAgentApprovals({ status: 'PENDING', page: 1, limit: 50 }, bId),
        service.fieldAgentApprovalCounts(bId),
        service.tripApprovals({ page: 1, limit: 50 }, bId),
      ]);

      // 1. WhatsApp
      const waDrafts = waDraftsRes.status === 'fulfilled' ? (waDraftsRes.value?.items || waDraftsRes.value?.data?.items || waDraftsRes.value?.drafts || []) : [];
      const waCount = waCountsRes.status === 'fulfilled' ? (waCountsRes.value?.READY ?? waDrafts.length) : waDrafts.length;
      setWhatsappItems(waDrafts);

      // 2. Owner & Manager (Office)
      const officeCaptures = officeRes.status === 'fulfilled' ? (officeRes.value?.captures || officeRes.value?.data?.captures || officeRes.value || []) : [];
      const officeCount = officeRes.status === 'fulfilled' ? (officeRes.value?.total ?? officeCaptures.length) : officeCaptures.length;
      setOfficeItems(Array.isArray(officeCaptures) ? officeCaptures : []);

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

  // Combined and sorted list for "ALL"
  const displayItems = useMemo(() => {
    const list = [];

    if (filter === 'ALL' || filter === 'WHATSAPP') {
      whatsappItems.forEach((item) => {
        list.push({
          ...item,
          approvalCategory: 'WHATSAPP',
          categoryLabel: 'WhatsApp',
          categoryColor: '#16A34A',
          categoryBg: '#DCFCE7',
          categoryIcon: 'chatbubbles-outline',
          id: item._id || item.id,
          plate: item.vehicleNumber || item.predictedVehicleNumber || item.registrationNumber || item.vehicle?.registrationNumber || 'No Plate',
          litres: item.litres ?? item.predictedLitres ?? null,
          amount: item.amount ?? item.predictedAmount ?? null,
          date: item.refuelDate || item.capturedAt || item.createdAt,
          driverOrAgent: item.driverName || item.senderPhone || item.senderName || 'Driver via WhatsApp',
          photoUrl: item.receiptPhotoUrl || item.meterPhotoUrl || item.imageUrl || item.photoUrl || (item.images && item.images[0]) || null,
          statusLabel: 'Waiting Approval',
          fuelType: item.fuelType || 'DIESEL',
        });
      });
    }

    if (filter === 'ALL' || filter === 'OFFICE') {
      officeItems.forEach((item) => {
        const ocr = item.ocr || {};
        list.push({
          ...item,
          approvalCategory: 'OFFICE',
          categoryLabel: 'Owner & Manager',
          categoryColor: '#2563EB',
          categoryBg: '#DBEAFE',
          categoryIcon: 'briefcase-outline',
          id: item._id || item.id,
          plate: item.suggestedTruck || item.truck || item.vehicle?.registrationNumber || 'Unlinked Truck',
          litres: ocr.fuelLitres ?? item.litres ?? null,
          amount: ocr.totalCost ?? item.amount ?? null,
          date: item.createdAt,
          driverOrAgent: 'Uploaded by Manager/Owner',
          photoUrl: item.thumbnailUrl || item.photoUrl || (item.pages && item.pages[0]?.url) || null,
          statusLabel: 'Confirm Link',
          fuelType: ocr.fuelType || item.kind || 'DIESEL',
        });
      });
    }

    if (filter === 'ALL' || filter === 'FIELD_AGENT') {
      fieldAgentItems.forEach((item) => {
        const agent = item.agentId || {};
        const agentName = [agent.firstName, agent.lastName].filter(Boolean).join(' ') || agent.name || 'Field Agent';
        list.push({
          ...item,
          approvalCategory: 'FIELD_AGENT',
          categoryLabel: 'Field Agent',
          categoryColor: '#D97706',
          categoryBg: '#FEF3C7',
          categoryIcon: 'person-outline',
          id: item._id || item.id,
          plate: item.vehicleId?.registrationNumber || item.registrationNumber || 'No Plate',
          litres: item.litres ?? item.quantity ?? null,
          amount: item.amount ?? item.totalAmount ?? null,
          date: item.refuelTime || item.createdAt,
          driverOrAgent: `Agent: ${agentName}`,
          photoUrl: item.receiptPhotoUrl || item.meterPhotoUrl || item.photoUrl || null,
          statusLabel: 'Pending Approval',
          fuelType: item.fuelType || 'DIESEL',
          odometer: item.odometerReading || null,
        });
      });
    }

    if (filter === 'ALL' || filter === 'TRIPS') {
      tripItems.forEach((item) => {
        const vReg = item.vehicle?.registrationNumber || item.vehicleNumber || 'Vehicle Detour';
        const dName = item.driver?.name || item.driverName || 'Driver';
        list.push({
          ...item,
          approvalCategory: 'TRIPS',
          categoryLabel: 'Trip Approval',
          categoryColor: '#7C3AED',
          categoryBg: '#EDE9FE',
          categoryIcon: 'navigate-outline',
          id: item._id || item.id,
          plate: vReg,
          litres: null,
          amount: null,
          date: item.createdAt || item.window?.from,
          driverOrAgent: `Visit: ${dName}`,
          photoUrl: null,
          statusLabel: item.status || 'Active',
          tripSpec: item.placeSpec?.kind || item.type || 'Detour Authorised',
        });
      });
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [filter, whatsappItems, officeItems, fieldAgentItems, tripItems]);

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
      loadApprovals(true);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not approve item.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleOpenReject = (item) => {
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
      Alert.alert('Confirmed', 'Bill successfully linked to vehicle.');
      loadApprovals(true);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not confirm bill link.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRevokeTrip = async (item) => {
    Alert.alert('Revoke Approval', 'Are you sure you want to revoke this trip approval?', [
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
            Alert.alert('Error', e?.message || 'Could not revoke approval.');
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
        // Poll job status
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

  return (
    <View style={s.container}>
      <BackHeader
        title="Approvals"
        subtitle="Manage and review all operational approvals"
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
          <Text style={s.filterLabel}>Type Filter:</Text>
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
            <Text style={s.loadingText}>Loading approvals queue…</Text>
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
                {/* Header row: category badge + plate + date */}
                <View style={s.cardHeader}>
                  <View style={[s.categoryBadge, { backgroundColor: item.categoryBg }]}>
                    <Ionicons name={item.categoryIcon} size={14} color={item.categoryColor} />
                    <Text style={[s.categoryBadgeText, { color: item.categoryColor }]}>
                      {item.categoryLabel}
                    </Text>
                  </View>
                  <View style={s.plateBadge}>
                    <Text style={s.plateText}>{item.plate}</Text>
                  </View>
                </View>

                {/* Body Row: Details + optional thumbnail */}
                <View style={s.cardBody}>
                  <View style={s.detailsColumn}>
                    {item.amount != null || item.litres != null ? (
                      <View style={s.metricsRow}>
                        {item.amount != null && (
                          <Text style={s.amountText}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                        )}
                        {item.litres != null && (
                          <Text style={s.litresText}>
                            · {Number(item.litres).toFixed(1)} L ({item.fuelType})
                          </Text>
                        )}
                      </View>
                    ) : null}

                    {item.tripSpec ? (
                      <Text style={s.specText}>{item.tripSpec}</Text>
                    ) : null}

                    <Text style={s.driverText}>{item.driverOrAgent}</Text>

                    {item.date ? (
                      <Text style={s.dateText}>
                        {new Date(item.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    ) : null}

                    {item.odometer ? (
                      <Text style={s.odometerText}>Odo: {item.odometer} km</Text>
                    ) : null}
                  </View>

                  {item.photoUrl ? (
                    <TouchableOpacity
                      onPress={() => setImagePreviewUrl(item.photoUrl)}
                      style={s.thumbWrapper}
                    >
                      <Image source={{ uri: item.photoUrl }} style={s.thumbImage} resizeMode="cover" />
                      <View style={s.zoomIconBadge}>
                        <Ionicons name="expand" size={12} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Actions Row */}
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
                            <Text style={s.btnApproveText}>Approve</Text>
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
            <Text style={s.pickerTitle}>Filter Approval Category</Text>
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
                  {(chatZipFile.size / (1024 * 1024)).toFixed(1)} MB
                </Text>
              ) : (
                <Text style={s.zipPickerSubtitle}>Supports up to 1.5 GB exports</Text>
              )}
            </TouchableOpacity>

            {chatUploading && (
              <View style={s.chatProgressBox}>
                <ActivityIndicator size="small" color="#1A56DB" />
                <Text style={s.chatProgressText}>{chatJobStatus}</Text>
                {chatUploadPercent > 0 && (
                  <Text style={s.chatPercentText}>{chatUploadPercent}%</Text>
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
                <Text style={s.mBtnConfirmText}>
                  {chatUploading ? 'Processing…' : 'Start Import'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
      <Modal visible={Boolean(imagePreviewUrl)} transparent animationType="fade">
        <View style={s.lightboxOverlay}>
          <TouchableOpacity
            style={[s.lightboxCloseBtn, { top: insets.top + 16 }]}
            onPress={() => setImagePreviewUrl(null)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {imagePreviewUrl ? (
            <Image source={{ uri: imagePreviewUrl }} style={s.lightboxImage} resizeMode="contain" />
          ) : null}
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
  actionBar: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  primaryActionBtn: {
    backgroundColor: '#1A56DB',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  secondaryActionBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryActionText: {
    color: '#1A56DB',
    fontWeight: '600',
    fontSize: 13,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
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
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
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
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 10,
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
  card: {
    padding: 14,
    borderRadius: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  plateBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailsColumn: {
    flex: 1,
    gap: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  litresText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  specText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  driverText: {
    fontSize: 12,
    color: '#475569',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  odometerText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  thumbWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  zoomIconBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    justifyContent: 'flex-end',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnApprove: {
    backgroundColor: '#16A34A',
  },
  btnApproveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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
  btnLink: {
    backgroundColor: '#2563EB',
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  pickerOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  pickerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  actionModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  mBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  mBtnCancel: {
    backgroundColor: '#F1F5F9',
  },
  mBtnCancelText: {
    color: '#475569',
    fontWeight: '600',
  },
  mBtnReject: {
    backgroundColor: '#DC2626',
  },
  mBtnRejectText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mBtnConfirm: {
    backgroundColor: '#1A56DB',
  },
  mBtnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  truckSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  truckSelectRowActive: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  truckSelectText: {
    fontSize: 14,
    color: '#334155',
  },
  truckSelectTextActive: {
    fontWeight: '700',
    color: '#1A56DB',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    marginTop: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#1A56DB',
    fontWeight: '700',
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillBtnActive: {
    backgroundColor: '#1A56DB',
    borderColor: '#1A56DB',
  },
  pillBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pillBtnTextActive: {
    color: '#FFFFFF',
  },
  uploadTileRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  uploadTile: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  uploadTileText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A56DB',
  },
  filesPreviewBox: {
    gap: 6,
    marginTop: 4,
  },
  filesPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  fileThumbBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  fileThumbImg: {
    width: '100%',
    height: '100%',
  },
  fileRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  successText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '700',
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
    fontWeight: '700',
    fontSize: 14,
  },
  chatInstructionsBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginVertical: 4,
  },
  chatInstructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
  zipPickerBtn: {
    borderWidth: 2,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
    marginVertical: 8,
  },
  zipPickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  zipPickerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  zipPickerSize: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A56DB',
  },
  chatProgressBox: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  chatProgressText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
  },
  chatPercentText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A56DB',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  lightboxImage: {
    width: SCREEN_WIDTH * 0.95,
    height: '80%',
  },
});
