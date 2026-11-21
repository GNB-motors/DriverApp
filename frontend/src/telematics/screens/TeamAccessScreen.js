import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, BackHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useManagerData } from '../context/ManagerDataContext';
import { recordId } from '../services/telematicsApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ROLE_COLORS = {
  OWNER: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  MANAGER: { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  DRIVER: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  FIELD_AGENT: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
};

const emptyEmployee = {
  firstName: '',
  lastName: '',
  mobileNumber: '',
  password: '',
  role: 'DRIVER',
  branchId: '',
};

export default function TeamAccessScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { service, branches, branchId } = useManagerData();
  const scopeBranch = branchId === 'all' ? undefined : branchId;
  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';

  // Navigation tab: 'MEMBERS' or 'ROLES'
  const [activeTab, setActiveTab] = useState('MEMBERS');

  // Search & Role Filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // ALL, DRIVER, MANAGER, FIELD_AGENT

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [permissionNotice, setPermissionNotice] = useState('');

  // Add Employee Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState(emptyEmployee);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Load team data
  const loadData = useCallback(async (isRefresh = false) => {
    if (!service) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setPermissionNotice('');

    try {
      // 1. Load employees (always works)
      let emps = [];
      try {
        emps = await service.teamEmployees(scopeBranch);
      } catch {
        emps = [];
      }
      setEmployees(Array.isArray(emps) ? emps : []);

      // 2. Load roles & catalog
      try {
        const roleData = await service.teamRoles(scopeBranch);
        setRoles(Array.isArray(roleData?.roles) ? roleData.roles : []);
        setCatalog(Array.isArray(roleData?.catalog) ? roleData.catalog : []);
      } catch {
        setRoles([]);
        setCatalog([]);
        if (scopeBranch) {
          setPermissionNotice(
            'Role management is centralized. In this branch view, you can view team members and assignments.'
          );
        }
      }

      // 3. Load assignments
      try {
        const asgs = await service.teamAssignments();
        setAssignments(Array.isArray(asgs) ? asgs : []);
      } catch {
        setAssignments([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [service, scopeBranch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active branch object
  const activeBranchObj = useMemo(() => {
    if (!scopeBranch) return null;
    return (branches || []).find((b) => String(b.id || b._id) === String(scopeBranch)) || null;
  }, [branches, scopeBranch]);

  // Normalized employees with role tags
  const normalizedEmployees = useMemo(() => {
    return employees.map((emp) => {
      const id = recordId(emp);
      const role = String(emp.role || 'DRIVER').toUpperCase();
      const name = [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() || 'Team Member';
      const status = String(emp.status || 'ACTIVE').toUpperCase();
      const mobile = emp.mobileNumber || emp.phone || '';
      const email = emp.email || '';
      const roleConfig = ROLE_COLORS[role] || ROLE_COLORS.DRIVER;

      // Find branch name
      let branchName = 'Enterprise';
      if (emp.branchId) {
        const bId = recordId(emp.branchId);
        const b = (branches || []).find((x) => String(x.id || x._id) === bId);
        branchName = b?.name || emp.branchId?.name || 'Branch';
      }

      return {
        id,
        raw: emp,
        name,
        role,
        roleConfig,
        status,
        mobile,
        email,
        branchName,
      };
    });
  }, [employees, branches]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return normalizedEmployees.filter((emp) => {
      // Role Filter
      if (roleFilter !== 'ALL' && emp.role !== roleFilter) {
        return false;
      }
      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = emp.name.toLowerCase().includes(q);
        const phoneMatch = emp.mobile.includes(q);
        const roleMatch = emp.role.toLowerCase().includes(q);
        const branchMatch = emp.branchName.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !roleMatch && !branchMatch) return false;
      }
      return true;
    });
  }, [normalizedEmployees, roleFilter, search]);

  // Count summaries
  const stats = useMemo(() => {
    const total = normalizedEmployees.length;
    const drivers = normalizedEmployees.filter((e) => e.role === 'DRIVER').length;
    const managers = normalizedEmployees.filter((e) => e.role === 'MANAGER').length;
    const active = normalizedEmployees.filter((e) => e.status === 'ACTIVE').length;
    return { total, drivers, managers, active, rolesCount: roles.length };
  }, [normalizedEmployees, roles]);

  // Handle Add Employee Submit
  const handleAddSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError('Please enter first and last name.');
      return;
    }
    if (!form.mobileNumber.trim() || form.mobileNumber.trim().length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!form.password.trim() || form.password.trim().length < 4) {
      setFormError('Please enter a login password (at least 4 characters).');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        password: form.password.trim(),
        role: form.role,
        branchId: form.branchId || scopeBranch || undefined,
      };

      await service.teamCreateEmployee(payload, scopeBranch);
      Alert.alert('Employee Created', `${form.firstName} ${form.lastName} has been added to the team.`);
      setAddModalOpen(false);
      setForm(emptyEmployee);
      loadData(true);
    } catch (err) {
      setFormError(err?.message || 'Failed to create employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDial = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Could not open dialer.'));
  };

  return (
    <View style={s.container}>
      {/* 1. Header */}
      <BackHeader
        title="Team & Access"
        subtitle="Employee access control & role permissions"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            style={s.headerRefreshBtn}
            onPress={() => loadData(true)}
            hitSlop={8}
          >
            <Ionicons name="refresh-outline" size={20} color="#1A56DB" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {/* 2. Top Branch & Scope Banner */}
        <View style={s.scopeBanner}>
          <View style={s.scopeLeft}>
            <Ionicons
              name={scopeBranch ? 'business-outline' : 'globe-outline'}
              size={18}
              color="#1A56DB"
            />
            <Text style={s.scopeText} numberOfLines={1}>
              {activeBranchObj
                ? `Branch: ${activeBranchObj.name}`
                : 'Enterprise Scope (All Branches)'}
            </Text>
          </View>
          <View style={s.activeBadge}>
            <Text style={s.activeBadgeText}>{stats.active} Active Staff</Text>
          </View>
        </View>

        {/* Permission explanation banner if applicable */}
        {permissionNotice ? (
          <View style={s.infoNoticeBox}>
            <Ionicons name="information-circle-outline" size={16} color="#0284C7" />
            <Text style={s.infoNoticeText}>{permissionNotice}</Text>
          </View>
        ) : null}

        {/* 3. Top KPI Stats Strip */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Team Total</Text>
            <Text style={s.statValue}>{stats.total}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Drivers</Text>
            <Text style={[s.statValue, { color: '#1D4ED8' }]}>{stats.drivers}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Managers</Text>
            <Text style={[s.statValue, { color: '#6D28D9' }]}>{stats.managers}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Roles</Text>
            <Text style={[s.statValue, { color: '#059669' }]}>{stats.rolesCount || 3}</Text>
          </View>
        </View>

        {/* 4. Tab Switcher: Team Members vs Roles & Permissions */}
        <View style={s.tabSwitcher}>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'MEMBERS' && s.tabBtnActive]}
            onPress={() => setActiveTab('MEMBERS')}
          >
            <Ionicons
              name="people-outline"
              size={15}
              color={activeTab === 'MEMBERS' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[s.tabBtnText, activeTab === 'MEMBERS' && s.tabBtnTextActive]}>
              Team Members ({stats.total})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'ROLES' && s.tabBtnActive]}
            onPress={() => setActiveTab('ROLES')}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={activeTab === 'ROLES' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[s.tabBtnText, activeTab === 'ROLES' && s.tabBtnTextActive]}>
              Roles & Permissions
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: TEAM MEMBERS */}
        {activeTab === 'MEMBERS' ? (
          <>
            {/* Action Strip: Add Employee Button */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={s.addEmployeeBtn}
                onPress={() => {
                  setForm({ ...emptyEmployee, branchId: scopeBranch || '' });
                  setFormError('');
                  setAddModalOpen(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
                <Text style={s.addEmployeeBtnText}>Add Employee</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" style={s.searchIcon} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by name, phone or branch…"
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

            {/* Role Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterRow}
            >
              {[
                { key: 'ALL', label: 'All Staff' },
                { key: 'DRIVER', label: 'Drivers' },
                { key: 'MANAGER', label: 'Managers' },
                { key: 'FIELD_AGENT', label: 'Field Agents' },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.key}
                  style={[s.filterChip, roleFilter === chip.key && s.filterChipActive]}
                  onPress={() => setRoleFilter(chip.key)}
                >
                  <Text style={[s.filterChipText, roleFilter === chip.key && s.filterChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Employee Cards List */}
            {loading && !refreshing ? (
              <View style={s.loadingContainer}>
                <ActivityIndicator size="large" color="#1A56DB" />
                <Text style={s.loadingText}>Loading team records from server…</Text>
              </View>
            ) : filteredEmployees.length === 0 ? (
              <Card style={s.emptyCard}>
                <Ionicons name="people-outline" size={44} color="#94A3B8" />
                <Text style={s.emptyTitle}>No Team Members Found</Text>
                <Text style={s.emptySubtitle}>
                  {search
                    ? `No employees matching "${search}".`
                    : 'No staff registered in this scope.'}
                </Text>
              </Card>
            ) : (
              filteredEmployees.map((emp) => (
                <Card key={emp.id} padding={0} style={s.employeeCard}>
                  <View style={s.employeeCardTop}>
                    {/* Monogram Avatar */}
                    <View style={[s.avatarCircle, { backgroundColor: emp.roleConfig.bg }]}>
                      <Text style={[s.avatarText, { color: emp.roleConfig.color }]}>
                        {emp.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    {/* Name & Phone */}
                    <View style={s.employeeInfo}>
                      <Text style={s.employeeName}>{emp.name}</Text>
                      {emp.mobile ? (
                        <TouchableOpacity
                          style={s.phoneRow}
                          onPress={() => handleDial(emp.mobile)}
                          hitSlop={6}
                        >
                          <Ionicons name="call-outline" size={13} color="#2563EB" />
                          <Text style={s.phoneText}>{emp.mobile}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={s.phoneMuted}>No mobile linked</Text>
                      )}
                    </View>

                    {/* Role & Status Pill */}
                    <View style={s.badgeColumn}>
                      <View
                        style={[
                          s.roleBadge,
                          {
                            backgroundColor: emp.roleConfig.bg,
                            borderColor: emp.roleConfig.border,
                          },
                        ]}
                      >
                        <Text style={[s.roleBadgeText, { color: emp.roleConfig.color }]}>
                          {emp.role}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.statusPill,
                          emp.status === 'ACTIVE' ? s.statusActive : s.statusPending,
                        ]}
                      >
                        <View
                          style={[
                            s.statusDot,
                            { backgroundColor: emp.status === 'ACTIVE' ? '#059669' : '#D97706' },
                          ]}
                        />
                        <Text
                          style={[
                            s.statusText,
                            { color: emp.status === 'ACTIVE' ? '#059669' : '#D97706' },
                          ]}
                        >
                          {emp.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Branch Assignment Footer */}
                  <View style={s.employeeCardBottom}>
                    <View style={s.branchTag}>
                      <Ionicons name="business-outline" size={12} color="#64748B" />
                      <Text style={s.branchTagText}>{emp.branchName}</Text>
                    </View>
                    {emp.email ? <Text style={s.emailText}>{emp.email}</Text> : null}
                  </View>
                </Card>
              ))
            )}
          </>
        ) : (
          /* TAB 2: ROLES & PERMISSIONS */
          <View style={s.rolesContainer}>
            <View style={s.rolesInfoBanner}>
              <Ionicons name="shield-outline" size={18} color="#6D28D9" />
              <View style={{ flex: 1 }}>
                <Text style={s.rolesInfoTitle}>Enterprise Access Control</Text>
                <Text style={s.rolesInfoSub}>
                  Roles define what modules staff can view and actions they can perform.
                </Text>
              </View>
            </View>

            {roles.length === 0 ? (
              // Default Roles Display when custom roles list is empty
              [
                {
                  id: 'manager',
                  name: 'Fleet Manager',
                  baseRole: 'MANAGER',
                  desc: 'Full operational control over vehicles, drivers, fuel review, and trip approvals.',
                  permissions: ['vehicles', 'drivers', 'fuel', 'trips', 'approvals', 'documents'],
                },
                {
                  id: 'driver',
                  name: 'Commercial Driver',
                  baseRole: 'DRIVER',
                  desc: 'Mobile driver application access: assigned truck, trips, fuel slip upload, and SOS.',
                  permissions: ['driverDuty', 'trips', 'fuel', 'cameraUpload'],
                },
                {
                  id: 'field_agent',
                  name: 'Field Logistics Agent',
                  baseRole: 'FIELD_AGENT',
                  desc: 'Dispatch and yard gate management: check-in, unloading slips, and delivery proof.',
                  permissions: ['unloading', 'places', 'documents'],
                },
              ].map((role) => (
                <Card key={role.id} padding={0} style={s.roleCard}>
                  <View style={s.roleCardHeader}>
                    <View>
                      <Text style={s.roleName}>{role.name}</Text>
                      <Text style={s.roleBase}>Base tier: {role.baseRole}</Text>
                    </View>
                    <View style={s.systemPill}>
                      <Text style={s.systemPillText}>Standard Role</Text>
                    </View>
                  </View>
                  <Text style={s.roleDesc}>{role.desc}</Text>
                  <Text style={s.permissionHeader}>Granted Permissions:</Text>
                  <View style={s.permissionChipsRow}>
                    {role.permissions.map((p) => (
                      <View key={p} style={s.permissionChip}>
                        <Ionicons name="checkmark-circle-outline" size={12} color="#059669" />
                        <Text style={s.permissionChipText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              ))
            ) : (
              roles.map((role) => {
                const keys = Array.isArray(role.permissionKeys) ? role.permissionKeys : [];
                return (
                  <Card key={role.id || role._id} padding={0} style={s.roleCard}>
                    <View style={s.roleCardHeader}>
                      <View>
                        <Text style={s.roleName}>{role.name}</Text>
                        <Text style={s.roleBase}>Base tier: {role.baseRole || 'STAFF'}</Text>
                      </View>
                      {role.isSystem ? (
                        <View style={s.systemPill}>
                          <Text style={s.systemPillText}>System</Text>
                        </View>
                      ) : (
                        <View style={s.customPill}>
                          <Text style={s.customPillText}>Custom</Text>
                        </View>
                      )}
                    </View>
                    {role.description ? (
                      <Text style={s.roleDesc}>{role.description}</Text>
                    ) : null}
                    <Text style={s.permissionHeader}>
                      Granted Permissions ({keys.length}):
                    </Text>
                    <View style={s.permissionChipsRow}>
                      {keys.map((k) => (
                        <View key={k} style={s.permissionChip}>
                          <Ionicons name="checkmark-circle-outline" size={12} color="#059669" />
                          <Text style={s.permissionChipText}>{k}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* 5. Add Employee Modal */}
      {addModalOpen && (
        <Modal
          visible={addModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setAddModalOpen(false)}
        >
          <View style={s.modalOverlay}>
            <View style={[s.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalHeading}>Add New Employee</Text>
                  <Text style={s.modalSub}>Register driver, manager, or field agent</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAddModalOpen(false)}
                  style={s.modalCloseBtn}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={22} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.modalFormScroll}>
                {formError ? (
                  <View style={s.modalErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={s.modalErrorText}>{formError}</Text>
                  </View>
                ) : null}

                {/* Role Selector */}
                <Text style={s.inputLabel}>Role Tier *</Text>
                <View style={s.rolePickerGrid}>
                  {[
                    { key: 'DRIVER', label: 'Driver', icon: 'bus-outline' },
                    { key: 'MANAGER', label: 'Manager', icon: 'shield-outline' },
                    { key: 'FIELD_AGENT', label: 'Field Agent', icon: 'business-outline' },
                  ].map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      style={[s.rolePickBtn, form.role === r.key && s.rolePickBtnActive]}
                      onPress={() => setForm((prev) => ({ ...prev, role: r.key }))}
                    >
                      <Ionicons
                        name={r.icon}
                        size={16}
                        color={form.role === r.key ? '#1A56DB' : '#64748B'}
                      />
                      <Text
                        style={[s.rolePickText, form.role === r.key && s.rolePickTextActive]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Name Fields */}
                <View style={s.formRowTwo}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.inputLabel}>First Name *</Text>
                    <TextInput
                      style={s.textInput}
                      placeholder="e.g. Ramesh"
                      placeholderTextColor="#94A3B8"
                      value={form.firstName}
                      onChangeText={(t) => setForm((prev) => ({ ...prev, firstName: t }))}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.inputLabel}>Last Name *</Text>
                    <TextInput
                      style={s.textInput}
                      placeholder="e.g. Yadav"
                      placeholderTextColor="#94A3B8"
                      value={form.lastName}
                      onChangeText={(t) => setForm((prev) => ({ ...prev, lastName: t }))}
                    />
                  </View>
                </View>

                {/* Mobile Number */}
                <Text style={s.inputLabel}>Mobile Number *</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.mobileNumber}
                  onChangeText={(t) => setForm((prev) => ({ ...prev, mobileNumber: t }))}
                />

                {/* Password */}
                <Text style={s.inputLabel}>Initial Password *</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="Enter login password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(t) => setForm((prev) => ({ ...prev, password: t }))}
                />

                {/* Branch Selection */}
                <Text style={s.inputLabel}>Branch Scope</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.branchPickerRow}>
                  <TouchableOpacity
                    style={[
                      s.branchPickItem,
                      !form.branchId && s.branchPickItemActive,
                    ]}
                    onPress={() => setForm((prev) => ({ ...prev, branchId: '' }))}
                  >
                    <Text style={[s.branchPickText, !form.branchId && s.branchPickTextActive]}>
                      Enterprise (All)
                    </Text>
                  </TouchableOpacity>
                  {(branches || [])
                    .filter((b) => b.id !== 'all')
                    .map((b) => (
                      <TouchableOpacity
                        key={b.id || b._id}
                        style={[
                          s.branchPickItem,
                          form.branchId === String(b.id || b._id) && s.branchPickItemActive,
                        ]}
                        onPress={() =>
                          setForm((prev) => ({ ...prev, branchId: String(b.id || b._id) }))
                        }
                      >
                        <Text
                          style={[
                            s.branchPickText,
                            form.branchId === String(b.id || b._id) && s.branchPickTextActive,
                          ]}
                        >
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Submit */}
                <TouchableOpacity
                  style={[s.primaryModalBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleAddSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={s.primaryModalBtnText}>Create Employee</Text>
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

  // Scope banner
  scopeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scopeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scopeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },

  infoNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: 10,
  },
  infoNoticeText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Tab Switcher
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
  },
  addEmployeeBtn: {
    flex: 1,
    backgroundColor: '#1A56DB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    shadowColor: '#1A56DB',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addEmployeeBtnText: {
    color: '#FFFFFF',
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
    height: 42,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Employee Card
  employeeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  employeeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  employeeInfo: {
    flex: 1,
    gap: 3,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  phoneMuted: {
    fontSize: 12,
    color: '#94A3B8',
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  employeeCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  branchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  branchTagText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  emailText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // Roles Container
  rolesContainer: {
    gap: 12,
  },
  rolesInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 10,
    padding: 12,
  },
  rolesInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8',
  },
  rolesInfoSub: {
    fontSize: 11,
    color: '#7E22CE',
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  roleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roleName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleBase: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  systemPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  systemPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  customPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  customPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A56DB',
  },
  roleDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  permissionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  permissionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permissionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  permissionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
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
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },

  // Modal
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
  rolePickerGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  rolePickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  rolePickBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1A56DB',
  },
  rolePickText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  rolePickTextActive: {
    color: '#1A56DB',
    fontWeight: '700',
  },
  formRowTwo: {
    flexDirection: 'row',
    gap: 10,
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
  branchPickerRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  branchPickItem: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  branchPickItemActive: {
    backgroundColor: '#1A56DB',
    borderColor: '#1A56DB',
  },
  branchPickText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  branchPickTextActive: {
    color: '#FFFFFF',
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
