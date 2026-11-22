import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Linking,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { BackHeader, Card } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import { pickFromCamera, pickFromGallery } from '../../utils/pickImage';

// Standard Employee Documents tracked across web and mobile
const EMPLOYEE_DOC_CONFIG = [
  {
    key: 'DRIVER_LICENSE',
    label: 'Driving Licence',
    shortLabel: 'DL',
    icon: 'id-card-outline',
    description: 'Commercial Heavy / Medium Vehicle Driving Permit',
    roleFilter: 'DRIVER', // primary for drivers
  },
  {
    key: 'PAN',
    label: 'PAN Card',
    shortLabel: 'PAN',
    icon: 'card-outline',
    description: 'Income Tax Permanent Account Number Card',
    roleFilter: 'ALL',
  },
  {
    key: 'AADHAAR',
    label: 'Aadhaar Card',
    shortLabel: 'AADHAAR',
    icon: 'finger-print-outline',
    description: 'UIDAI National Identity Card / Certificate',
    roleFilter: 'ALL',
  },
];

function normalizeDocType(type) {
  const t = String(type || '').toUpperCase().trim();
  if (t === 'DL' || t === 'LICENSE' || t === 'DRIVER_LICENSE' || t === 'DRIVING_LICENSE') return 'DRIVER_LICENSE';
  if (t === 'PAN' || t === 'PAN_CARD') return 'PAN';
  if (t === 'AADHAAR' || t === 'AADHAR' || t === 'AADHAR_CARD' || t === 'AADHAAR_CARD') return 'AADHAAR';
  return t;
}

function extractLicenseNumber(doc) {
  if (!doc) return null;
  if (doc.licenseNumber && typeof doc.licenseNumber === 'string' && doc.licenseNumber.trim()) {
    return doc.licenseNumber.trim();
  }
  const ocr = doc.ocrData || doc.ocr;
  if (!ocr || typeof ocr !== 'object') return null;
  const sources = [ocr.processedData, ocr.rawOcrResponse, ocr.fields, ocr];
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    const val =
      src.licenceNo ||
      src.licenseNo ||
      src.licenseNumber ||
      src.licenceNumber ||
      src.dl_no ||
      src.dlNumber ||
      src.driving_license_number ||
      src.drivingLicenseNumber;
    if (val && typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }
  return null;
}

export default function TeamAccessScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const {
    service,
    branchId: contextBranchId,
    selectBranch,
    setBranchId,
    branches = [],
    canSwitchBranch = true,
  } = useManagerData?.() || {};

  // Active branch scope. A manager is fixed to their own branch, whatever a link says.
  const [selectedBranch, setSelectedBranch] = useState(
    (canSwitchBranch && route?.params?.branchId) || contextBranchId || 'all'
  );
  const [branchSelectorVisible, setBranchSelectorVisible] = useState(false);

  // Sync selected branch if context updates externally
  useEffect(() => {
    if (contextBranchId && contextBranchId !== selectedBranch) {
      setSelectedBranch(contextBranchId);
    }
  }, [contextBranchId]);

  // Employee Directory state
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // ALL, DRIVER, MANAGER, FIELD_AGENT

  // Modal: Employee Details & Documents View (Eye button)
  const [detailsModal, setDetailsModal] = useState({
    visible: false,
    employee: null,
    loadingDocs: false,
    documents: [],
    error: '',
  });

  // Modal: Edit Employee (Edit button)
  const [editModal, setEditModal] = useState({
    visible: false,
    employee: null,
    firstName: '',
    lastName: '',
    mobileNumber: '',
    email: '',
    role: 'DRIVER',
    status: 'ACTIVE',
    submitting: false,
    error: '',
  });

  // Modal: Delete Employee (Delete button)
  const [deleteModal, setDeleteModal] = useState({
    visible: false,
    employee: null,
    submitting: false,
  });

  // Modal: Add Employee
  const [addModal, setAddModal] = useState({
    visible: false,
    firstName: '',
    lastName: '',
    mobileNumber: '',
    password: '',
    role: 'DRIVER',
    branchId: selectedBranch === 'all' ? (branches.find((b) => b.id !== 'all')?.id || '') : selectedBranch,
    submitting: false,
    error: '',
  });

  // Document Upload Action Sheet
  const [uploadState, setUploadState] = useState({
    visible: false,
    docType: 'DRIVER_LICENSE',
    uploading: false,
  });

  // Lightbox Image Preview
  const [previewImage, setPreviewImage] = useState(null);

  // --------------------------------------------------------------------------
  // Data Fetching: Load Employees for Selected Branch
  // --------------------------------------------------------------------------
  const loadEmployees = useCallback(
    async (isRefresh = false) => {
      if (!service) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const branchParam = selectedBranch === 'all' ? undefined : selectedBranch;
        const res = await service.teamEmployees(branchParam);
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        setEmployees(list);
      } catch (err) {
        setEmployees([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [service, selectedBranch]
  );

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Branch switcher handler
  const handleSelectBranch = (bId) => {
    if (!canSwitchBranch) return;
    setSelectedBranch(bId);
    const switchFn = setBranchId || selectBranch;
    if (switchFn) switchFn(bId);
    setBranchSelectorVisible(false);
  };

  // --------------------------------------------------------------------------
  // Employee Documents: Load for Details Modal
  // --------------------------------------------------------------------------
  const openEmployeeDetails = async (emp) => {
    setDetailsModal({
      visible: true,
      employee: emp,
      loadingDocs: true,
      documents: [],
      error: '',
    });

    try {
      const bId = selectedBranch === 'all' ? undefined : selectedBranch;
      const docsRes = await service.employeeDocuments(emp.id || emp._id, bId);
      const docsList = Array.isArray(docsRes) ? docsRes : docsRes?.data || [];
      setDetailsModal((prev) => ({
        ...prev,
        loadingDocs: false,
        documents: docsList,
      }));
    } catch (err) {
      setDetailsModal((prev) => ({
        ...prev,
        loadingDocs: false,
        documents: [],
        error: 'Could not load attached documents',
      }));
    }
  };

  // --------------------------------------------------------------------------
  // Upload Employee Document (Camera or Gallery)
  // --------------------------------------------------------------------------
  const handleUploadDoc = async (sourceType, docType) => {
    const emp = detailsModal.employee;
    if (!emp) return;

    setUploadState({ visible: false, docType, uploading: true });
    try {
      let fileAsset = null;
      if (sourceType === 'camera') {
        fileAsset = await pickFromCamera();
      } else if (sourceType === 'gallery') {
        fileAsset = await pickFromGallery();
      } else if (sourceType === 'file') {
        const docRes = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });
        if (!docRes.canceled && docRes.assets?.length) {
          const a = docRes.assets[0];
          fileAsset = { uri: a.uri, name: a.name || 'document.pdf', type: a.mimeType || 'application/pdf' };
        }
      }

      if (!fileAsset) {
        setUploadState({ visible: false, docType, uploading: false });
        return;
      }

      const bId = selectedBranch === 'all' ? undefined : selectedBranch;
      await service.uploadEmployeeDocument(emp.id || emp._id, fileAsset, docType, undefined, bId);
      Alert.alert('Success', `${docType} uploaded successfully.`);

      // Refresh documents inside details modal
      const docsRes = await service.employeeDocuments(emp.id || emp._id, bId);
      const docsList = Array.isArray(docsRes) ? docsRes : docsRes?.data || [];
      setDetailsModal((prev) => ({
        ...prev,
        documents: docsList,
      }));
    } catch (err) {
      Alert.alert('Upload Failed', err?.message || 'Could not upload document.');
    } finally {
      setUploadState({ visible: false, docType, uploading: false });
    }
  };

  // --------------------------------------------------------------------------
  // Delete Employee Document
  // --------------------------------------------------------------------------
  const handleDeleteDoc = (docId) => {
    Alert.alert('Delete Document', 'Are you sure you want to delete this document certificate?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const emp = detailsModal.employee;
          if (!emp || !docId) return;
          try {
            const bId = selectedBranch === 'all' ? undefined : selectedBranch;
            await service.deleteEmployeeDocument(docId, bId);
            Alert.alert('Deleted', 'Document removed successfully.');
            // Reload documents
            const docsRes = await service.employeeDocuments(emp.id || emp._id, bId);
            const docsList = Array.isArray(docsRes) ? docsRes : docsRes?.data || [];
            setDetailsModal((prev) => ({
              ...prev,
              documents: docsList,
            }));
          } catch (err) {
            Alert.alert('Error', err?.message || 'Could not delete document.');
          }
        },
      },
    ]);
  };

  // --------------------------------------------------------------------------
  // Edit Employee
  // --------------------------------------------------------------------------
  const openEditModal = (emp) => {
    setEditModal({
      visible: true,
      employee: emp,
      firstName: emp.firstName || emp.name?.split(' ')[0] || '',
      lastName: emp.lastName || emp.name?.split(' ').slice(1).join(' ') || '',
      mobileNumber: emp.mobileNumber || emp.phone || '',
      email: emp.email || '',
      role: (emp.role || 'DRIVER').toUpperCase(),
      status: (emp.status || 'ACTIVE').toUpperCase(),
      submitting: false,
      error: '',
    });
  };

  const handleSaveEdit = async () => {
    const { employee, firstName, lastName, mobileNumber, email, role, status } = editModal;
    if (!firstName.trim()) {
      setEditModal((prev) => ({ ...prev, error: 'First name is required' }));
      return;
    }
    if (!mobileNumber.trim()) {
      setEditModal((prev) => ({ ...prev, error: 'Mobile number is required' }));
      return;
    }

    setEditModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const bId = selectedBranch === 'all' ? undefined : selectedBranch;
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim() || undefined,
        role: role.toUpperCase(),
        status: status.toUpperCase(),
      };
      await service.teamUpdateEmployee(employee.id || employee._id, payload, bId);
      Alert.alert('Success', `Employee ${firstName} updated successfully.`);
      setEditModal({ visible: false, employee: null, submitting: false, error: '' });
      loadEmployees(true);
      // If details modal was open for this employee, update it
      if (detailsModal.visible && detailsModal.employee?.id === employee.id) {
        setDetailsModal((prev) => ({
          ...prev,
          employee: { ...prev.employee, ...payload, name: `${firstName.trim()} ${lastName.trim()}`.trim() },
        }));
      }
    } catch (err) {
      setEditModal((prev) => ({ ...prev, submitting: false, error: err?.message || 'Could not update employee' }));
    }
  };

  // --------------------------------------------------------------------------
  // Delete Employee
  // --------------------------------------------------------------------------
  const openDeleteModal = (emp) => {
    if (emp.isOwner || (emp.role || '').toUpperCase() === 'OWNER') {
      Alert.alert('Action Blocked', 'Cannot delete the organization Owner account.');
      return;
    }
    setDeleteModal({
      visible: true,
      employee: emp,
      submitting: false,
    });
  };

  const handleConfirmDelete = async () => {
    const emp = deleteModal.employee;
    if (!emp) return;

    setDeleteModal((prev) => ({ ...prev, submitting: true }));
    try {
      const bId = selectedBranch === 'all' ? undefined : selectedBranch;
      await service.teamDeleteEmployee(emp.id || emp._id, bId);
      setDeleteModal({ visible: false, employee: null, submitting: false });
      if (detailsModal.visible && detailsModal.employee?.id === emp.id) {
        setDetailsModal({ visible: false, employee: null, documents: [] });
      }
      Alert.alert('Deleted', `Employee ${emp.name || emp.firstName || 'Staff member'} deleted successfully.`);
      loadEmployees(true);
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, submitting: false }));
      Alert.alert('Delete Failed', err?.message || 'Failed to delete employee.');
    }
  };

  // --------------------------------------------------------------------------
  // Add Employee
  // --------------------------------------------------------------------------
  const handleCreateEmployee = async () => {
    const { firstName, lastName, mobileNumber, password, role, branchId } = addModal;
    if (!firstName.trim()) {
      setAddModal((prev) => ({ ...prev, error: 'First name is required' }));
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.replace(/\D/g, '').length < 10) {
      setAddModal((prev) => ({ ...prev, error: 'Valid 10-digit mobile number required' }));
      return;
    }

    setAddModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobileNumber: mobileNumber.trim(),
        password: password.trim() || undefined,
        role: role.toUpperCase(),
      };
      const targetBranch = branchId || (selectedBranch === 'all' ? undefined : selectedBranch);
      await service.teamCreateEmployee(payload, targetBranch);
      Alert.alert('Created', `Employee ${firstName} registered successfully.`);
      setAddModal({
        visible: false,
        firstName: '',
        lastName: '',
        mobileNumber: '',
        password: '',
        role: 'DRIVER',
        branchId: '',
        submitting: false,
        error: '',
      });
      loadEmployees(true);
    } catch (err) {
      setAddModal((prev) => ({
        ...prev,
        submitting: false,
        error: err?.message || 'Could not create employee',
      }));
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Role filter
      if (roleFilter !== 'ALL') {
        const empRole = String(emp.role || '').toUpperCase();
        if (roleFilter === 'DRIVER' && empRole !== 'DRIVER') return false;
        if (roleFilter === 'MANAGER' && empRole !== 'MANAGER') return false;
        if (roleFilter === 'FIELD_AGENT' && empRole !== 'FIELD_AGENT') return false;
      }
      // Search filter
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = String(emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase();
      const mobile = String(emp.mobileNumber || emp.phone || '').toLowerCase();
      const branchName = String(emp.branchName || emp.location || '').toLowerCase();
      const roleStr = String(emp.role || '').toLowerCase();
      return name.includes(q) || mobile.includes(q) || branchName.includes(q) || roleStr.includes(q);
    });
  }, [employees, roleFilter, search]);

  // Quick KPI numbers
  const driverCount = employees.filter((e) => String(e.role || '').toUpperCase() === 'DRIVER').length;
  const managerCount = employees.filter((e) => String(e.role || '').toUpperCase() === 'MANAGER').length;
  const activeCount = employees.filter((e) => String(e.status || '').toUpperCase() === 'ACTIVE').length;

  const activeBranchName =
    selectedBranch === 'all'
      ? 'All branches (Enterprise Scope)'
      : branches.find((b) => b.id === selectedBranch)?.name || 'Branch Scope';

  return (
    <View style={s.container}>
      {/* Header */}
      <BackHeader
        title="Team & Access"
        subtitle="Manage employees, roles & driver verification"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadEmployees(true)} colors={['#1A56DB']} />}
      >
        {/* Branch Switcher Card */}
        <View style={s.branchBannerCard}>
          <View style={s.branchBannerLeft}>
            <View style={s.branchIconCircle}>
              <Ionicons name="business" size={18} color="#1A56DB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.branchLabelText}>ACTIVE LOCATION / SCOPE</Text>
              <Text style={s.branchNameText} numberOfLines={1}>
                {activeBranchName}
              </Text>
            </View>
          </View>

          {canSwitchBranch ? (
            <TouchableOpacity
              style={s.switchBranchBtn}
              onPress={() => setBranchSelectorVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={s.switchBranchBtnText}>Switch</Text>
              <Ionicons name="chevron-down" size={14} color="#1A56DB" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Quick KPI Stats */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiNum}>{employees.length}</Text>
            <Text style={s.kpiLabel}>Total Staff</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={[s.kpiNum, { color: '#0284C7' }]}>{driverCount}</Text>
            <Text style={s.kpiLabel}>Drivers</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={[s.kpiNum, { color: '#7C3AED' }]}>{managerCount}</Text>
            <Text style={s.kpiLabel}>Managers</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={[s.kpiNum, { color: '#16A34A' }]}>{activeCount}</Text>
            <Text style={s.kpiLabel}>Active</Text>
          </View>
        </View>

        {/* Search Bar & Add Employee Button */}
        <View style={s.searchBarRow}>
          <View style={s.searchInputWrapper}>
            <Ionicons name="search-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search by name, mobile, role..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={s.addStaffBtn}
            onPress={() => setAddModal((prev) => ({ ...prev, visible: true, error: '' }))}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={16} color="#FFFFFF" />
            <Text style={s.addStaffBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Role Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChipsContainer}>
          {[
            { id: 'ALL', label: 'All Staff' },
            { id: 'DRIVER', label: 'Drivers' },
            { id: 'MANAGER', label: 'Managers' },
            { id: 'FIELD_AGENT', label: 'Field Agents' },
          ].map((chip) => {
            const isSel = roleFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[s.filterChip, isSel && s.filterChipActive]}
                onPress={() => setRoleFilter(chip.id)}
                activeOpacity={0.7}
              >
                <Text style={[s.filterChipText, isSel && s.filterChipTextActive]}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Employees List */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#1A56DB" />
            <Text style={s.loadingText}>Loading employees...</Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="people-outline" size={44} color="#94A3B8" />
            <Text style={s.emptyTitle}>No Employees Found</Text>
            <Text style={s.emptyDesc}>
              {search
                ? `No staff members matched "${search}".`
                : selectedBranch !== 'all'
                ? 'No staff members assigned to this location yet.'
                : 'No employees found in enterprise.'}
            </Text>
            <TouchableOpacity
              style={s.emptyAddBtn}
              onPress={() => setAddModal((prev) => ({ ...prev, visible: true, error: '' }))}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={s.emptyAddBtnText}>Add Employee Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.employeeList}>
            {filteredEmployees.map((emp) => {
              const name = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
              const role = (emp.role || 'DRIVER').toUpperCase();
              const status = (emp.status || 'PENDING').toUpperCase();
              const mobile = emp.mobileNumber || emp.phone || '-';
              const branchText = emp.branchName || emp.currentBranchName || emp.location || 'Enterprise Staff';
              const isDeactivated = emp.branchStatus === 'DEACTIVATED' || status === 'DEACTIVATED';
              const isOwner = emp.isOwner || role === 'OWNER';

              const initials = name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'E';

              return (
                <View key={emp.id || emp._id} style={s.employeeCard}>
                  {/* Left Column: Avatar & Details */}
                  <View style={s.employeeMainCol}>
                    <View style={s.avatarWrapper}>
                      <View style={[s.avatarCircle, isOwner ? s.avatarOwner : role === 'MANAGER' ? s.avatarManager : s.avatarDriver]}>
                        <Text style={[s.avatarText, isOwner ? s.avatarOwnerText : role === 'MANAGER' ? s.avatarManagerText : s.avatarDriverText]}>
                          {initials}
                        </Text>
                      </View>
                      <View style={[s.statusDot, isDeactivated ? s.statusDotDeactivated : status === 'ACTIVE' ? s.statusDotActive : s.statusDotPending]} />
                    </View>

                    <View style={s.empDetailsCol}>
                      <View style={s.empNameRow}>
                        <Text style={s.empName} numberOfLines={1}>
                          {name}
                        </Text>
                        <View style={[s.roleBadge, isOwner ? s.roleBadgeOwner : role === 'MANAGER' ? s.roleBadgeManager : s.roleBadgeDriver]}>
                          <Text style={[s.roleBadgeText, isOwner ? s.roleBadgeOwnerText : role === 'MANAGER' ? s.roleBadgeManagerText : s.roleBadgeDriverText]}>
                            {role}
                          </Text>
                        </View>
                      </View>

                      {/* Contact row */}
                      <View style={s.contactRow}>
                        <Ionicons name="call-outline" size={12} color="#64748B" />
                        <Text style={s.contactText}>{mobile}</Text>
                        {mobile !== '-' ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${mobile}`)}
                            style={s.dialerSmallBtn}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="call" size={10} color="#16A34A" />
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {/* Branch & Status meta */}
                      <View style={s.metaRow}>
                        <View style={s.branchTag}>
                          <Ionicons name="location-outline" size={10} color="#475569" />
                          <Text style={s.branchTagText} numberOfLines={1}>
                            {branchText}
                          </Text>
                        </View>
                        <View style={[s.statusTag, isDeactivated ? s.statusTagDeactivated : status === 'ACTIVE' ? s.statusTagActive : s.statusTagPending]}>
                          <Text style={[s.statusTagText, isDeactivated ? s.statusTagDeactivatedText : status === 'ACTIVE' ? s.statusTagActiveText : s.statusTagPendingText]}>
                            {isDeactivated ? 'DEACTIVATED' : status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Right Column: Inline Action Buttons (Eye, Edit, Delete) */}
                  <View style={s.actionsCol}>
                    {/* 👁️ Eye Button: View Details & Documents */}
                    <TouchableOpacity
                      style={s.actionBtnEye}
                      onPress={() => openEmployeeDetails(emp)}
                      accessibilityLabel="View employee details and documents"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="eye-outline" size={16} color="#1A56DB" />
                    </TouchableOpacity>

                    {/* ✏️ Edit Button: Edit Employee */}
                    <TouchableOpacity
                      style={s.actionBtnEdit}
                      onPress={() => openEditModal(emp)}
                      accessibilityLabel="Edit employee"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={16} color="#0284C7" />
                    </TouchableOpacity>

                    {/* 🗑️ Delete Button: Delete Employee */}
                    <TouchableOpacity
                      style={[s.actionBtnDelete, isOwner && { opacity: 0.3 }]}
                      onPress={() => openDeleteModal(emp)}
                      disabled={isOwner}
                      accessibilityLabel="Delete employee"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color={isOwner ? '#94A3B8' : '#DC2626'} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* =====================================================================
          MODAL 1: Employee Details & Verification Documents (Eye Button)
      ===================================================================== */}
      <Modal visible={detailsModal.visible} animationType="slide" transparent onRequestClose={() => setDetailsModal((p) => ({ ...p, visible: false }))}>
        <View style={s.modalOverlay}>
          <View style={s.detailsModalCard}>
            {/* Modal Header */}
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalHeaderTitle}>Employee Details</Text>
                <Text style={s.modalHeaderSubtitle}>Profile information & identity verification documents</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailsModal((p) => ({ ...p, visible: false }))}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
              {detailsModal.employee ? (
                <>
                  {/* Employee Identity Card */}
                  <View style={s.empProfileCard}>
                    <View style={s.empProfileAvatar}>
                      <Text style={s.empProfileAvatarText}>
                        {(detailsModal.employee.name || detailsModal.employee.firstName || 'E').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={s.empProfileName}>{detailsModal.employee.name || `${detailsModal.employee.firstName || ''} ${detailsModal.employee.lastName || ''}`.trim()}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={s.roleBadge}>
                          <Text style={s.roleBadgeText}>{(detailsModal.employee.role || 'DRIVER').toUpperCase()}</Text>
                        </View>
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          Status: <Text style={{ fontWeight: '700', color: detailsModal.employee.status === 'ACTIVE' ? '#16A34A' : '#D97706' }}>{detailsModal.employee.status || 'ACTIVE'}</Text>
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        Branch: {detailsModal.employee.branchName || detailsModal.employee.location || activeBranchName}
                      </Text>
                    </View>
                  </View>

                  {/* Contact Details */}
                  <View style={s.sectionCard}>
                    <Text style={s.sectionCardTitle}>CONTACT INFORMATION</Text>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Mobile Number:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.detailValue}>{detailsModal.employee.mobileNumber || detailsModal.employee.phone || 'Not set'}</Text>
                        {detailsModal.employee.mobileNumber ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${detailsModal.employee.mobileNumber}`)}
                            style={s.callDialerBtn}
                          >
                            <Ionicons name="call" size={12} color="#FFFFFF" />
                            <Text style={s.callDialerBtnText}>Call</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>

                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Email Address:</Text>
                      <Text style={s.detailValue}>{detailsModal.employee.email || 'Not provided'}</Text>
                    </View>
                  </View>

                  {/* Documents Section (Driving Licence, PAN Card, Aadhaar Card) */}
                  <View style={s.sectionCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={s.sectionCardTitle}>IDENTITY & DRIVER DOCUMENTS</Text>
                      {detailsModal.loadingDocs ? <ActivityIndicator size="small" color="#1A56DB" /> : null}
                    </View>

                    <View style={{ gap: 12 }}>
                      {EMPLOYEE_DOC_CONFIG.map((cfg) => {
                        // Find document for this type
                        const matchingDoc = detailsModal.documents.find(
                          (d) => normalizeDocType(d.docType) === cfg.key
                        );
                        const isUploaded = Boolean(matchingDoc);
                        const isVerified = Boolean(matchingDoc?.isVerified);
                        const docUrl = matchingDoc?.publicUrl || matchingDoc?.fileUrl || matchingDoc?.url;
                        const licNumber = extractLicenseNumber(matchingDoc);

                        return (
                          <View key={cfg.key} style={s.docItemCard}>
                            <View style={s.docItemHeader}>
                              <View style={s.docItemIconWrap}>
                                <Ionicons name={cfg.icon} size={20} color="#1A56DB" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.docItemTitle}>{cfg.label}</Text>
                                <Text style={s.docItemDesc}>{cfg.description}</Text>
                              </View>
                              <View style={[s.docStatusPill, isVerified ? s.docStatusVerified : isUploaded ? s.docStatusUploaded : s.docStatusMissing]}>
                                <Text style={[s.docStatusPillText, isVerified ? s.docStatusVerifiedText : isUploaded ? s.docStatusUploadedText : s.docStatusMissingText]}>
                                  {isVerified ? 'VERIFIED' : isUploaded ? 'UPLOADED' : 'MISSING'}
                                </Text>
                              </View>
                            </View>

                            {/* Licence number extracted if available */}
                            {licNumber ? (
                              <View style={s.extractedNumberRow}>
                                <Text style={s.extractedNumberLabel}>Extracted No:</Text>
                                <Text style={s.extractedNumberValue}>{licNumber}</Text>
                              </View>
                            ) : null}

                            {/* Document Actions Row */}
                            <View style={s.docActionRow}>
                              {isUploaded && docUrl ? (
                                <TouchableOpacity
                                  style={s.docViewBtn}
                                  onPress={() => setPreviewImage(docUrl)}
                                >
                                  <Ionicons name="image-outline" size={14} color="#1A56DB" />
                                  <Text style={s.docViewBtnText}>View Photo</Text>
                                </TouchableOpacity>
                              ) : null}

                              {/* Upload / Re-upload Button */}
                              <TouchableOpacity
                                style={s.docUploadBtn}
                                onPress={() => setUploadState({ visible: true, docType: cfg.key, uploading: false })}
                              >
                                <Ionicons name="cloud-upload-outline" size={14} color="#FFFFFF" />
                                <Text style={s.docUploadBtnText}>{isUploaded ? 'Re-upload' : 'Upload File'}</Text>
                              </TouchableOpacity>

                              {/* Delete Doc Button */}
                              {isUploaded && matchingDoc?._id ? (
                                <TouchableOpacity
                                  style={s.docDeleteBtn}
                                  onPress={() => handleDeleteDoc(matchingDoc._id || matchingDoc.id)}
                                >
                                  <Ionicons name="trash-outline" size={14} color="#DC2626" />
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Bottom Quick Actions */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      style={s.bottomEditProfileBtn}
                      onPress={() => {
                        const emp = detailsModal.employee;
                        setDetailsModal((p) => ({ ...p, visible: false }));
                        openEditModal(emp);
                      }}
                    >
                      <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                      <Text style={s.bottomEditProfileText}>Edit Employee</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.bottomDeleteProfileBtn, detailsModal.employee.isOwner && { opacity: 0.3 }]}
                      disabled={detailsModal.employee.isOwner}
                      onPress={() => {
                        const emp = detailsModal.employee;
                        openDeleteModal(emp);
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      <Text style={s.bottomDeleteProfileText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 2: Edit Employee (Edit Button)
      ===================================================================== */}
      <Modal visible={editModal.visible} animationType="slide" transparent onRequestClose={() => setEditModal((p) => ({ ...p, visible: false }))}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.formModalCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalHeaderTitle}>Edit Employee</Text>
                <Text style={s.modalHeaderSubtitle}>Update staff contact, role and status</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModal((p) => ({ ...p, visible: false }))} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
              <View>
                <Text style={s.inputLabel}>First Name *</Text>
                <TextInput
                  style={s.formInput}
                  value={editModal.firstName}
                  onChangeText={(val) => setEditModal((p) => ({ ...p, firstName: val }))}
                  placeholder="First Name"
                />
              </View>

              <View>
                <Text style={s.inputLabel}>Last Name</Text>
                <TextInput
                  style={s.formInput}
                  value={editModal.lastName}
                  onChangeText={(val) => setEditModal((p) => ({ ...p, lastName: val }))}
                  placeholder="Last Name"
                />
              </View>

              <View>
                <Text style={s.inputLabel}>Mobile Number *</Text>
                <TextInput
                  style={s.formInput}
                  value={editModal.mobileNumber}
                  onChangeText={(val) => setEditModal((p) => ({ ...p, mobileNumber: val }))}
                  keyboardType="phone-pad"
                  placeholder="10-digit mobile number"
                />
              </View>

              <View>
                <Text style={s.inputLabel}>Email Address</Text>
                <TextInput
                  style={s.formInput}
                  value={editModal.email}
                  onChangeText={(val) => setEditModal((p) => ({ ...p, email: val }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="e.g. driver@gnb.in"
                />
              </View>

              <View>
                <Text style={s.inputLabel}>Role Tier</Text>
                <View style={s.tierRow}>
                  {['DRIVER', 'MANAGER', 'FIELD_AGENT'].map((r) => {
                    const isSel = editModal.role === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[s.tierBtn, isSel && s.tierBtnActive]}
                        onPress={() => setEditModal((p) => ({ ...p, role: r }))}
                      >
                        <Text style={[s.tierBtnText, isSel && s.tierBtnTextActive]}>{r}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={s.inputLabel}>Account Status</Text>
                <View style={s.tierRow}>
                  {['ACTIVE', 'PENDING', 'DEACTIVATED'].map((st) => {
                    const isSel = editModal.status === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[s.tierBtn, isSel && s.tierBtnActive]}
                        onPress={() => setEditModal((p) => ({ ...p, status: st }))}
                      >
                        <Text style={[s.tierBtnText, isSel && s.tierBtnTextActive]}>{st}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {editModal.error ? <Text style={s.formErrorText}>{editModal.error}</Text> : null}

              <TouchableOpacity
                style={[s.submitPrimaryBtn, editModal.submitting && { opacity: 0.7 }]}
                disabled={editModal.submitting}
                onPress={handleSaveEdit}
              >
                {editModal.submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.submitPrimaryBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =====================================================================
          MODAL 3: Delete Confirmation Dialog (Delete Button)
      ===================================================================== */}
      <Modal visible={deleteModal.visible} animationType="fade" transparent onRequestClose={() => setDeleteModal((p) => ({ ...p, visible: false }))}>
        <View style={s.modalOverlayCenter}>
          <View style={s.deleteDialogCard}>
            <View style={s.deleteIconCircle}>
              <Ionicons name="trash-outline" size={28} color="#DC2626" />
            </View>
            <Text style={s.deleteDialogTitle}>Delete Employee?</Text>
            <Text style={s.deleteDialogMessage}>
              Are you sure you want to permanently delete{' '}
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                {deleteModal.employee?.name || deleteModal.employee?.firstName || 'this employee'}
              </Text>
              ? This action cannot be undone.
            </Text>

            <View style={s.dialogButtonsRow}>
              <TouchableOpacity
                style={s.dialogCancelBtn}
                onPress={() => setDeleteModal({ visible: false, employee: null, submitting: false })}
                disabled={deleteModal.submitting}
              >
                <Text style={s.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.dialogDeleteBtn, deleteModal.submitting && { opacity: 0.7 }]}
                onPress={handleConfirmDelete}
                disabled={deleteModal.submitting}
              >
                {deleteModal.submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.dialogDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 4: Add New Employee
      ===================================================================== */}
      <Modal visible={addModal.visible} animationType="slide" transparent onRequestClose={() => setAddModal((p) => ({ ...p, visible: false }))}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.formModalCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalHeaderTitle}>Add Employee</Text>
                <Text style={s.modalHeaderSubtitle}>Onboard driver, manager, or field logistics agent</Text>
              </View>
              <TouchableOpacity onPress={() => setAddModal((p) => ({ ...p, visible: false }))} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
              <View>
                <Text style={s.inputLabel}>First Name *</Text>
                <TextInput
                  style={s.formInput}
                  value={addModal.firstName}
                  onChangeText={(val) => setAddModal((p) => ({ ...p, firstName: val }))}
                  placeholder="e.g. Ramesh"
                />
              </View>

              <View>
                <Text style={s.inputLabel}>Last Name</Text>
                <TextInput
                  style={s.formInput}
                  value={addModal.lastName}
                  onChangeText={(val) => setAddModal((p) => ({ ...p, lastName: val }))}
                  placeholder="e.g. Kumar"
                />
              </View>

              <View>
                <Text style={s.inputLabel}>10-Digit Mobile Number *</Text>
                <TextInput
                  style={s.formInput}
                  value={addModal.mobileNumber}
                  onChangeText={(val) => setAddModal((p) => ({ ...p, mobileNumber: val }))}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholder="9876543210"
                />
              </View>

              <View>
                <Text style={s.inputLabel}>Initial Password (Optional)</Text>
                <TextInput
                  style={s.formInput}
                  value={addModal.password}
                  onChangeText={(val) => setAddModal((p) => ({ ...p, password: val }))}
                  secureTextEntry
                  placeholder="Leave empty for auto-generated"
                />
              </View>

              <View>
                <Text style={s.inputLabel}>Role Tier</Text>
                <View style={s.tierRow}>
                  {['DRIVER', 'MANAGER', 'FIELD_AGENT'].map((r) => {
                    const isSel = addModal.role === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[s.tierBtn, isSel && s.tierBtnActive]}
                        onPress={() => setAddModal((p) => ({ ...p, role: r }))}
                      >
                        <Text style={[s.tierBtnText, isSel && s.tierBtnTextActive]}>{r}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {addModal.error ? <Text style={s.formErrorText}>{addModal.error}</Text> : null}

              <TouchableOpacity
                style={[s.submitPrimaryBtn, addModal.submitting && { opacity: 0.7 }]}
                disabled={addModal.submitting}
                onPress={handleCreateEmployee}
              >
                {addModal.submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.submitPrimaryBtnText}>Create Employee</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =====================================================================
          MODAL 5: Branch Selector Bottom Sheet
      ===================================================================== */}
      <Modal visible={branchSelectorVisible} animationType="slide" transparent onRequestClose={() => setBranchSelectorVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.branchSheetCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalHeaderTitle}>Select Operational Branch</Text>
                <Text style={s.modalHeaderSubtitle}>Filter staff and records by location</Text>
              </View>
              <TouchableOpacity onPress={() => setBranchSelectorVisible(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              {branches.map((b) => {
                const isSel = b.id === selectedBranch;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[s.branchOptionRow, isSel && s.branchOptionRowSelected]}
                    onPress={() => handleSelectBranch(b.id)}
                  >
                    <Ionicons
                      name={isSel ? 'checkmark-circle' : 'business-outline'}
                      size={20}
                      color={isSel ? '#1A56DB' : '#64748B'}
                    />
                    <Text style={[s.branchOptionText, isSel && s.branchOptionTextSelected]}>
                      {b.id === 'all' ? 'All branches (Enterprise Scope)' : b.name || b.id}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 6: Document Picker Source Selector (Camera vs Gallery)
      ===================================================================== */}
      <Modal visible={uploadState.visible} animationType="fade" transparent onRequestClose={() => setUploadState((p) => ({ ...p, visible: false }))}>
        <View style={s.modalOverlayCenter}>
          <View style={s.sourcePickerCard}>
            <Text style={s.sourcePickerTitle}>Upload {uploadState.docType.replace('_', ' ')}</Text>
            <Text style={s.sourcePickerSubtitle}>Select document capture method:</Text>

            <View style={{ gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={s.sourceOptionBtn}
                onPress={() => handleUploadDoc('camera', uploadState.docType)}
              >
                <Ionicons name="camera" size={20} color="#1A56DB" />
                <Text style={s.sourceOptionText}>Take Photo with Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.sourceOptionBtn}
                onPress={() => handleUploadDoc('gallery', uploadState.docType)}
              >
                <Ionicons name="images" size={20} color="#0284C7" />
                <Text style={s.sourceOptionText}>Choose from Photo Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.sourceOptionBtn}
                onPress={() => handleUploadDoc('file', uploadState.docType)}
              >
                <Ionicons name="document-text" size={20} color="#7C3AED" />
                <Text style={s.sourceOptionText}>Select PDF / Files</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.sourceCancelBtn}
                onPress={() => setUploadState((p) => ({ ...p, visible: false }))}
              >
                <Text style={s.sourceCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =====================================================================
          MODAL 7: Image Preview Lightbox
      ===================================================================== */}
      <Modal visible={!!previewImage} animationType="fade" transparent onRequestClose={() => setPreviewImage(null)}>
        <View style={s.lightboxOverlay}>
          <TouchableOpacity style={s.lightboxCloseBtn} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImage ? (
            <Image source={{ uri: previewImage }} style={s.lightboxImage} resizeMode="contain" />
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
    paddingBottom: 40,
    gap: 14,
  },

  // Branch Banner Card
  branchBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
  },
  branchBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  branchIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  branchNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  switchBranchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  switchBranchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A56DB',
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
  kpiNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  // Search & Add Bar
  searchBarRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  addStaffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A56DB',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
  },
  addStaffBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Filter Chips
  filterChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  },

  // Loading & Empty
  loadingBox: {
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
  emptyDesc: {
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
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Employee Card
  employeeList: {
    gap: 10,
  },
  employeeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
  },
  employeeMainCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarDriver: {
    backgroundColor: '#EFF6FF',
  },
  avatarManager: {
    backgroundColor: '#F3E8FF',
  },
  avatarOwner: {
    backgroundColor: '#FEF3C7',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  avatarDriverText: {
    color: '#1A56DB',
  },
  avatarManagerText: {
    color: '#7C3AED',
  },
  avatarOwnerText: {
    color: '#B45309',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusDotActive: {
    backgroundColor: '#16A34A',
  },
  statusDotPending: {
    backgroundColor: '#F59E0B',
  },
  statusDotDeactivated: {
    backgroundColor: '#94A3B8',
  },
  empDetailsCol: {
    flex: 1,
    gap: 3,
  },
  empNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  empName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  roleBadge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#EFF6FF',
  },
  roleBadgeDriver: {
    backgroundColor: '#EFF6FF',
  },
  roleBadgeManager: {
    backgroundColor: '#F3E8FF',
  },
  roleBadgeOwner: {
    backgroundColor: '#FEF3C7',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A56DB',
  },
  roleBadgeDriverText: {
    color: '#1A56DB',
  },
  roleBadgeManagerText: {
    color: '#7C3AED',
  },
  roleBadgeOwnerText: {
    color: '#B45309',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactText: {
    fontSize: 12,
    color: '#64748B',
  },
  dialerSmallBtn: {
    padding: 2,
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  branchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  branchTagText: {
    fontSize: 11,
    color: '#64748B',
    maxWidth: 120,
  },
  statusTag: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  statusTagActive: {
    backgroundColor: '#DCFCE7',
  },
  statusTagActiveText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
  },
  statusTagPending: {
    backgroundColor: '#FEF9C3',
  },
  statusTagPendingText: {
    color: '#854D0E',
    fontSize: 10,
    fontWeight: '700',
  },
  statusTagDeactivated: {
    backgroundColor: '#F1F5F9',
  },
  statusTagDeactivatedText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },

  // Action Buttons Column
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  actionBtnEye: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnEdit: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDelete: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modals Shared
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
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },

  // Details Modal
  detailsModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  empProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  empProfileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A56DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  empProfileAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  empProfileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  sectionCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  callDialerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  callDialerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Document Cards
  docItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  docItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  docItemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  docStatusPill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  docStatusVerified: {
    backgroundColor: '#DCFCE7',
  },
  docStatusVerifiedText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
  },
  docStatusUploaded: {
    backgroundColor: '#EFF6FF',
  },
  docStatusUploadedText: {
    color: '#1A56DB',
    fontSize: 10,
    fontWeight: '700',
  },
  docStatusMissing: {
    backgroundColor: '#F1F5F9',
  },
  docStatusMissingText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  extractedNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  extractedNumberLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  extractedNumberValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  docActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  docViewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A56DB',
  },
  docUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#1A56DB',
  },
  docUploadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  docDeleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  bottomEditProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
  },
  bottomEditProfileText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomDeleteProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  bottomDeleteProfileText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },

  // Form Modals (Edit & Add)
  formModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
  },
  tierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  tierBtnActive: {
    backgroundColor: '#1A56DB',
    borderColor: '#1A56DB',
  },
  tierBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tierBtnTextActive: {
    color: '#FFFFFF',
  },
  formErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  submitPrimaryBtn: {
    backgroundColor: '#1A56DB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  submitPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Delete Dialog
  deleteDialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    width: '88%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 10,
  },
  deleteIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteDialogTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  deleteDialogMessage: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    width: '100%',
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
    color: '#475569',
  },
  dialogDeleteBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  dialogDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Branch Sheet
  branchSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  branchOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  branchOptionRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  branchOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  branchOptionTextSelected: {
    fontWeight: '700',
    color: '#1A56DB',
  },

  // Source Picker Card
  sourcePickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '88%',
    maxWidth: 360,
  },
  sourcePickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sourcePickerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sourceOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sourceOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  sourceCancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sourceCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  lightboxImage: {
    width: '94%',
    height: '75%',
  },
});
