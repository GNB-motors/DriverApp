import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { fetchVehicles, fetchFieldAgentVehicles, fetchFieldAgentDrivers } from '../services/api';
import logger from '../utils/logger';
import { AppText, Button, ScreenHeader, colors, radius, fontFamily } from '../components/ui';

export default function RefuelDetailsScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
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
      <StatusBar style="light" />

      <ScreenHeader
        title={t('refuel', 'title')}
        subtitle={t('refuel', 'step')}
        onBack={() => navigation.goBack()}
      >
        <View style={styles.progress}>
          <View style={[styles.segment, styles.segmentActive]} />
          <View style={styles.segment} />
        </View>
      </ScreenHeader>

      <View style={styles.card}>
            {isFieldAgent ? (
              // ── Field Agent Form ───────────────────────────────────────
              <>
                {/* Vehicle Number */}
                <Field label="Vehicle Number *">
                  <TouchableOpacity
                    style={styles.selectRow}
                    onPress={() => !faLoading && setVehicleModalOpen(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.selectLeft}>
                      <View style={styles.iconTile}>
                        {faLoading
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : <Ionicons name="car-sport" size={18} color={colors.primary} />}
                      </View>
                      <AppText mono={!!faSelectedVehicle} weight="semibold" muted={!faSelectedVehicle} style={styles.selectValue} numberOfLines={1}>
                        {faSelectedVehicle?.label || 'Select vehicle number'}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </Field>

                {/* Organization (auto) */}
                <Field label="Organization">
                  <View style={[styles.selectRow, styles.selectDisabled]}>
                    <View style={styles.selectLeft}>
                      <View style={styles.iconTile}>
                        <Ionicons name="business" size={18} color={colors.primary} />
                      </View>
                      <AppText weight="semibold" muted style={styles.selectValue} numberOfLines={1}>
                        {faSelectedVehicle?.orgName || 'Auto-filled from vehicle'}
                      </AppText>
                    </View>
                  </View>
                </Field>

                {/* Driver Name */}
                <Field label="Driver Name *">
                  <TouchableOpacity
                    style={[styles.selectRow, !faSelectedVehicle && styles.selectDisabled]}
                    onPress={() => faSelectedVehicle && setDriverModalOpen(true)}
                    activeOpacity={faSelectedVehicle ? 0.7 : 1}
                  >
                    <View style={styles.selectLeft}>
                      <View style={styles.iconTile}>
                        <Ionicons name="person" size={18} color={colors.primary} />
                      </View>
                      <AppText weight="semibold" muted={!faSelectedDriver} style={styles.selectValue} numberOfLines={1}>
                        {faSelectedDriver?.label || (faSelectedVehicle ? 'Select driver' : 'Select vehicle first')}
                      </AppText>
                    </View>
                    {faSelectedVehicle ? <Ionicons name="chevron-down" size={20} color={colors.primary} /> : null}
                  </TouchableOpacity>
                </Field>
              </>
            ) : (
              // ── Driver Form ────────────────────────────────────────────
              <>
                {/* Vehicle Number */}
                <Field label={t('refuel', 'vehicleInput')}>
                  <TouchableOpacity
                    style={[styles.selectRow, vehicleAssigned && styles.selectDisabled]}
                    onPress={() => !vehicleAssigned && !vehiclesLoading && setDropdownOpen(true)}
                    activeOpacity={vehicleAssigned ? 1 : 0.7}
                  >
                    <View style={styles.selectLeft}>
                      <View style={styles.iconTile}>
                        {vehiclesLoading
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : <Ionicons name="car-sport" size={18} color={colors.primary} />}
                      </View>
                      <AppText mono={!!selectedVehicle} weight="semibold" muted={!selectedVehicle} style={styles.selectValue} numberOfLines={1}>
                        {selectedVehicle?.label || t('refuel', 'selectVehicle')}
                      </AppText>
                    </View>
                    {!vehicleAssigned ? <Ionicons name="chevron-down" size={20} color={colors.primary} /> : null}
                  </TouchableOpacity>
                </Field>

                {/* Driver Name (read-only) */}
                <Field label={t('refuel', 'driverInput')}>
                  <View style={[styles.selectRow, styles.selectDisabled]}>
                    <View style={styles.selectLeft}>
                      <View style={styles.iconTile}>
                        <Ionicons name="person" size={18} color={colors.primary} />
                      </View>
                      <AppText weight="semibold" style={styles.selectValue} numberOfLines={1}>
                        {driverName || 'Driver'}
                      </AppText>
                    </View>
                  </View>
                </Field>
              </>
            )}

            {/* Refuel Type — both roles */}
            <Field label={t('refuel', 'typeInput')}>
              <View style={styles.typeRow}>
                <TypeCard
                  selected={refuelType === 'full'}
                  onPress={() => setRefuelType('full')}
                  icon="speedometer"
                  label={t('refuel', 'full')}
                />
                <TypeCard
                  selected={refuelType === 'partial'}
                  onPress={() => setRefuelType('partial')}
                  icon="water"
                  label={t('refuel', 'partial')}
                />
              </View>
            </Field>
          </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0)', colors.surface]}
          style={StyleSheet.absoluteFill}
        />
        <Button
          label={t('refuel', 'next')}
          iconRight="arrow-forward"
          disabled={!isNextEnabled}
          onPress={handleNext}
          size="lg"
        />
      </View>

      {/* ── Driver Vehicle Dropdown Modal ─────────────────────────────── */}
      <Modal visible={dropdownOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownOpen(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <AppText variant="h3" weight="bold">{t('refuel', 'vehicleInput')}</AppText>
              <TouchableOpacity onPress={() => setDropdownOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={vehicles}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = selectedVehicle?.value === item.value;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => { setSelectedVehicle(item); setDropdownOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="car-sport" size={20} color={isSelected ? colors.primary : colors.textMuted} />
                    <AppText mono weight="semibold" color={isSelected ? colors.primary : colors.text} style={styles.modalItemContent}>
                      {item.label}
                    </AppText>
                    {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
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
              <AppText variant="h3" weight="bold">Select Vehicle</AppText>
              <TouchableOpacity onPress={() => { setVehicleModalOpen(false); setVehicleSearch(''); }} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={vehicleSearch}
                onChangeText={setVehicleSearch}
                placeholder="Search by registration number..."
                placeholderTextColor={colors.textMuted}
                autoFocus
                style={styles.searchInput}
              />
              {vehicleSearch.length > 0 && (
                <TouchableOpacity onPress={() => setVehicleSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredVehicles}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<AppText muted center style={styles.modalEmpty}>No vehicles found</AppText>}
              renderItem={({ item }) => {
                const isSelected = faSelectedVehicle?.value === item._id;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => selectFaVehicle(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="car-sport" size={20} color={isSelected ? colors.primary : colors.textMuted} />
                    <View style={styles.modalItemContent}>
                      <AppText mono weight="semibold" color={isSelected ? colors.primary : colors.text}>
                        {item.registrationNumber}
                      </AppText>
                      {item.orgId?.companyName ? <AppText variant="small" muted>{item.orgId.companyName}</AppText> : null}
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
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
              <AppText variant="h3" weight="bold">Select Driver</AppText>
              <TouchableOpacity onPress={() => { setDriverModalOpen(false); setDriverSearch(''); }} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={driverSearch}
                onChangeText={setDriverSearch}
                placeholder="Search by name or mobile..."
                placeholderTextColor={colors.textMuted}
                autoFocus
                style={styles.searchInput}
              />
              {driverSearch.length > 0 && (
                <TouchableOpacity onPress={() => setDriverSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredDrivers}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<AppText muted center style={styles.modalEmpty}>No drivers found for this organization</AppText>}
              renderItem={({ item }) => {
                const isSelected = faSelectedDriver?.value === item._id;
                const name = `${item.firstName} ${item.lastName || ''}`.trim();
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => selectFaDriver(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person" size={20} color={isSelected ? colors.primary : colors.textMuted} />
                    <View style={styles.modalItemContent}>
                      <AppText weight="semibold" color={isSelected ? colors.primary : colors.text}>{name}</AppText>
                      {item.mobileNumber ? <AppText variant="small" muted mono>{item.mobileNumber}</AppText> : null}
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
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

// ── Small presentational helpers ──────────────────────────────────────────
function Field({ label, children }) {
  return (
    <View style={styles.fieldContainer}>
      <AppText variant="label" muted style={styles.label}>{label}</AppText>
      {children}
    </View>
  );
}

function TypeCard({ selected, onPress, icon, label }) {
  return (
    <TouchableOpacity
      style={[styles.optionCard, selected && styles.optionCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Ionicons name={icon} size={20} color={selected ? colors.white : colors.textMuted} />
      </View>
      <AppText variant="bodyStrong" weight="bold" color={selected ? colors.primary : colors.textMuted}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  progress: { flexDirection: 'row', gap: 8, marginTop: 16 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  segmentActive: { backgroundColor: colors.white },

  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -18,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
  },

  fieldContainer: { marginBottom: 18 },
  label: { marginBottom: 9 },

  // Select rows (vehicle / driver / org)
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectDisabled: { opacity: 0.7 },
  selectLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectValue: { flex: 1, fontSize: 16 },

  // Refuel type cards
  typeRow: { flexDirection: 'row', gap: 12 },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionCardSelected: { backgroundColor: colors.tealTint, borderColor: colors.primary },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionIconSelected: { backgroundColor: colors.primary },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingTop: 16,
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(16,33,31,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  modalItemSelected: { backgroundColor: colors.tealTint },
  modalItemContent: { flex: 1 },
  modalEmpty: { paddingVertical: 30 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.display.regular,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
});
