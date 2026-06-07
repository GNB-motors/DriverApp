import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { fetchVehicles, fetchFieldAgentVehicles, fetchFieldAgentDrivers } from '../services/api';
import logger from '../utils/logger';
import styles, { COLORS } from '../styles/RefuelDetailsScreen.styles';

export default function RefuelDetailsScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { token, user } = useAuth();
  const isFieldAgent = user?.role === 'FIELD_AGENT';

  const {
    vehicleAssigned,
    vehicleId: preselectedId,
    vehicleLabel: preselectedLabel,
  } = route.params || {};

  // ── Shared state ──────────────────────────────────────────────────────
  const [refuelType, setRefuelType] = useState(null);

  // ── Driver flow state ─────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(
    preselectedId && preselectedLabel ? { label: preselectedLabel, value: preselectedId } : null,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ── Field agent state ─────────────────────────────────────────────────
  const [allVehicles, setAllVehicles] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [faLoading, setFaLoading] = useState(true);

  const [faSelectedVehicle, setFaSelectedVehicle] = useState(null); // { value, label, orgId, orgName }
  const [faSelectedDriver, setFaSelectedDriver] = useState(null);   // { value, label }

  const [vehicleSearch, setVehicleSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [driverModalOpen, setDriverModalOpen] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isFieldAgent) {
      Promise.all([fetchFieldAgentVehicles(token), fetchFieldAgentDrivers(token)])
        .then(([vList, dList]) => {
          const vArr = Array.isArray(vList) ? vList : [];
          const dArr = Array.isArray(dList) ? dList : [];
          setAllVehicles(vArr);
          setAllDrivers(dArr);
          logger.info('RefuelDetails', `Loaded ${vArr.length} vehicles, ${dArr.length} drivers for field agent`);
        })
        .catch((err) => logger.error('RefuelDetails', 'Failed to load FA vehicles/drivers', err?.message))
        .finally(() => setFaLoading(false));
    } else {
      fetchVehicles(token)
        .then((data) => {
          const list = Array.isArray(data) ? data : (data?.vehicles || []);
          setVehicles(list.map((v) => ({ label: v.registrationNumber, value: v._id })));
        })
        .catch(() => {})
        .finally(() => setVehiclesLoading(false));
    }
  }, [token, isFieldAgent]);

  // ── Field agent computed lists ────────────────────────────────────────
  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.toLowerCase();
    return allVehicles.filter((v) =>
      (v.registrationNumber || '').toLowerCase().includes(q),
    );
  }, [allVehicles, vehicleSearch]);

  const filteredDrivers = useMemo(() => {
    if (!faSelectedVehicle) return [];
    const vehicleOrgId = faSelectedVehicle.orgId;
    const q = driverSearch.toLowerCase();
    return allDrivers.filter((d) => {
      const dOrgId = d.orgId?._id || d.orgId;
      if (dOrgId !== vehicleOrgId) return false;
      const name = `${d.firstName} ${d.lastName || ''}`.trim().toLowerCase();
      return name.includes(q) || (d.mobileNumber || '').includes(driverSearch);
    });
  }, [allDrivers, faSelectedVehicle, driverSearch]);

  // ── Navigation ────────────────────────────────────────────────────────
  const handleNext = () => {
    if (isFieldAgent) {
      navigation.navigate('UploadPhotos', {
        refuelType,
        vehicleId: faSelectedVehicle.value,
        vehicleLabel: faSelectedVehicle.label,
        driverId: faSelectedDriver.value,
        orgId: faSelectedVehicle.orgId,
      });
    } else {
      navigation.navigate('UploadPhotos', {
        refuelType,
        vehicleId: selectedVehicle?.value,
        vehicleLabel: selectedVehicle?.label,
      });
    }
  };

  const isNextEnabled = isFieldAgent
    ? !!faSelectedVehicle && !!faSelectedDriver && !!refuelType
    : !!selectedVehicle && !!refuelType;

  // ── Helpers ───────────────────────────────────────────────────────────
  const selectFaVehicle = (v) => {
    const orgId = v.orgId?._id || v.orgId;
    const orgName = v.orgId?.companyName || '';
    setFaSelectedVehicle({ value: v._id, label: v.registrationNumber, orgId, orgName });
    if (faSelectedDriver) {
      const prevOrgId = faSelectedVehicle?.orgId;
      if (prevOrgId && prevOrgId !== orgId) {
        setFaSelectedDriver(null);
        logger.info('RefuelDetails', 'Driver reset — vehicle org changed');
      }
    }
    setVehicleSearch('');
    setVehicleModalOpen(false);
    logger.info('RefuelDetails', `Vehicle selected: ${v.registrationNumber} (org: ${orgName})`);
  };

  const selectFaDriver = (d) => {
    const name = `${d.firstName} ${d.lastName || ''}`.trim();
    setFaSelectedDriver({ value: d._id, label: name });
    setDriverSearch('');
    setDriverModalOpen(false);
    logger.info('RefuelDetails', `Driver selected: ${name}`);
  };

  const driverName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Green Top Section */}
      <View style={styles.topSection}>
        <View style={styles.circleOne} />
        <View style={styles.circleTwo} />
        <View style={styles.circleThree} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>{t('refuel', 'title')}</Text>
            <Text style={styles.headerStep}>{t('refuel', 'step')}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressSegment, styles.progressSegmentActive]} />
          <View style={styles.progressSegment} />
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {isFieldAgent ? (
            // ── Field Agent Form ───────────────────────────────────────
            <>
              {/* Vehicle Number */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Vehicle Number *</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => !faLoading && setVehicleModalOpen(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownIconLeft}>
                    {faLoading
                      ? <ActivityIndicator size="small" color={COLORS.primary} />
                      : <Ionicons name="car-sport" size={18} color={COLORS.primary} />}
                  </View>
                  <Text style={[styles.dropdownText, !faSelectedVehicle && styles.dropdownPlaceholder]}>
                    {faSelectedVehicle?.label || 'Select vehicle number'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Organization (auto-populated) */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Organization</Text>
                <View style={[styles.dropdownButton, styles.inputWrapperDisabled]}>
                  <View style={styles.dropdownIconLeft}>
                    <Ionicons name="business" size={18} color={COLORS.primary} />
                  </View>
                  <Text style={styles.disabledText}>
                    {faSelectedVehicle?.orgName || 'Auto-filled from vehicle'}
                  </Text>
                </View>
              </View>

              {/* Driver Name */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Driver Name *</Text>
                <TouchableOpacity
                  style={[styles.dropdownButton, !faSelectedVehicle && styles.inputWrapperDisabled]}
                  onPress={() => faSelectedVehicle && setDriverModalOpen(true)}
                  activeOpacity={faSelectedVehicle ? 0.7 : 1}
                >
                  <View style={styles.dropdownIconLeft}>
                    <Ionicons name="person" size={18} color={COLORS.primary} />
                  </View>
                  <Text style={[styles.dropdownText, !faSelectedDriver && styles.dropdownPlaceholder]}>
                    {faSelectedDriver?.label || (faSelectedVehicle ? 'Select driver' : 'Select vehicle first')}
                  </Text>
                  {faSelectedVehicle && (
                    <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // ── Driver Form ────────────────────────────────────────────
            <>
              {/* Vehicle Number */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('refuel', 'vehicleInput')}</Text>
                <TouchableOpacity
                  style={[styles.dropdownButton, vehicleAssigned && styles.inputWrapperDisabled]}
                  onPress={() => !vehicleAssigned && !vehiclesLoading && setDropdownOpen(true)}
                  activeOpacity={vehicleAssigned ? 1 : 0.7}
                >
                  <View style={styles.dropdownIconLeft}>
                    {vehiclesLoading
                      ? <ActivityIndicator size="small" color={COLORS.primary} />
                      : <Ionicons name="car-sport" size={18} color={COLORS.primary} />}
                  </View>
                  <Text style={[styles.dropdownText, !selectedVehicle && styles.dropdownPlaceholder]}>
                    {selectedVehicle?.label || t('refuel', 'selectVehicle')}
                  </Text>
                  {!vehicleAssigned && (
                    <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Driver Name (read-only) */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('refuel', 'driverInput')}</Text>
                <View style={[styles.dropdownButton, styles.inputWrapperDisabled]}>
                  <View style={styles.dropdownIconLeft}>
                    <Ionicons name="person" size={18} color={COLORS.primary} />
                  </View>
                  <Text style={styles.disabledText}>{driverName || 'Driver'}</Text>
                </View>
              </View>
            </>
          )}

          {/* Refuel Type — same for both roles */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('refuel', 'typeInput')}</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[styles.optionCard, refuelType === 'full' && styles.optionSelected]}
                onPress={() => setRefuelType('full')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, refuelType === 'full' && styles.optionIconSelected]}>
                  <Ionicons
                    name="speedometer"
                    size={22}
                    color={refuelType === 'full' ? COLORS.primaryDark : COLORS.primary}
                  />
                </View>
                <Text style={[styles.optionText, refuelType === 'full' && styles.optionTextSelected]}>
                  {t('refuel', 'full')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, refuelType === 'partial' && styles.optionSelected]}
                onPress={() => setRefuelType('partial')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, refuelType === 'partial' && styles.optionIconSelected]}>
                  <Ionicons
                    name="water"
                    size={22}
                    color={refuelType === 'partial' ? COLORS.primaryDark : COLORS.primary}
                  />
                </View>
                <Text style={[styles.optionText, refuelType === 'partial' && styles.optionTextSelected]}>
                  {t('refuel', 'partial')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextBtn, !isNextEnabled && styles.nextBtnDisabled]}
            disabled={!isNextEnabled}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>{t('refuel', 'next')}</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Driver Vehicle Dropdown Modal ─────────────────────────────── */}
      <Modal visible={dropdownOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('refuel', 'vehicleInput')}</Text>
              <TouchableOpacity onPress={() => setDropdownOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={vehicles}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedVehicle?.value === item.value && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedVehicle(item);
                    setDropdownOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="car-sport"
                    size={20}
                    color={selectedVehicle?.value === item.value ? COLORS.primaryDark : COLORS.textMuted}
                  />
                  <Text style={[
                    styles.modalItemText,
                    selectedVehicle?.value === item.value && styles.modalItemTextSelected,
                  ]}>
                    {item.label}
                  </Text>
                  {selectedVehicle?.value === item.value && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Field Agent: Vehicle Modal with Search ────────────────────── */}
      <Modal visible={vehicleModalOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setVehicleModalOpen(false); setVehicleSearch(''); }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vehicle</Text>
              <TouchableOpacity onPress={() => { setVehicleModalOpen(false); setVehicleSearch(''); }}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
              <TextInput
                value={vehicleSearch}
                onChangeText={setVehicleSearch}
                placeholder="Search by registration number..."
                placeholderTextColor={COLORS.textMuted}
                autoFocus
                style={styles.searchInput}
              />
              {vehicleSearch.length > 0 && (
                <TouchableOpacity onPress={() => setVehicleSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredVehicles}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.modalEmptyText}>No vehicles found</Text>
              }
              renderItem={({ item }) => {
                const isSelected = faSelectedVehicle?.value === item._id;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => selectFaVehicle(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="car-sport" size={20} color={isSelected ? COLORS.primaryDark : COLORS.textMuted} />
                    <View style={styles.modalItemContent}>
                      <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                        {item.registrationNumber}
                      </Text>
                      {item.orgId?.companyName && (
                        <Text style={styles.modalItemSubtitle}>{item.orgId.companyName}</Text>
                      )}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Field Agent: Driver Modal with Search ─────────────────────── */}
      <Modal visible={driverModalOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setDriverModalOpen(false); setDriverSearch(''); }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Driver</Text>
              <TouchableOpacity onPress={() => { setDriverModalOpen(false); setDriverSearch(''); }}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
              <TextInput
                value={driverSearch}
                onChangeText={setDriverSearch}
                placeholder="Search by name or mobile..."
                placeholderTextColor={COLORS.textMuted}
                autoFocus
                style={styles.searchInput}
              />
              {driverSearch.length > 0 && (
                <TouchableOpacity onPress={() => setDriverSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredDrivers}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.modalEmptyText}>No drivers found for this organization</Text>
              }
              renderItem={({ item }) => {
                const isSelected = faSelectedDriver?.value === item._id;
                const name = `${item.firstName} ${item.lastName || ''}`.trim();
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => selectFaDriver(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person" size={20} color={isSelected ? COLORS.primaryDark : COLORS.textMuted} />
                    <View style={styles.modalItemContent}>
                      <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                        {name}
                      </Text>
                      {item.mobileNumber && (
                        <Text style={styles.modalItemSubtitle}>{item.mobileNumber}</Text>
                      )}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
