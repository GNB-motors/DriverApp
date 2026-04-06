import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { fetchVehicles } from '../services/vehicleService';
import { fetchLastOdometer } from '../services/mileageService';
import styles, { COLORS } from '../styles/RefuelDetailsScreen.styles';

export default function RefuelDetailsScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { user, token } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [fuelType, setFuelType] = useState(null);       // 'DIESEL' | 'ADBLUE'
  const [fillingType, setFillingType] = useState(null);  // 'FULL_TANK' | 'PARTIAL'
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lastOdometer, setLastOdometer] = useState(null);

  // Load vehicles on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchVehicles(token);
        const list = Array.isArray(data) ? data : data?.results || [];
        setVehicles(list);
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to load vehicles');
      } finally {
        setLoadingVehicles(false);
      }
    })();
  }, [token]);

  // Fetch last odometer when vehicle changes
  useEffect(() => {
    if (!selectedVehicle) {
      setLastOdometer(null);
      return;
    }
    (async () => {
      try {
        const data = await fetchLastOdometer(token, selectedVehicle._id);
        setLastOdometer(data); // null if first log
      } catch {
        setLastOdometer(null);
      }
    })();
  }, [selectedVehicle, token]);

  const driverName = user?.name || user?.firstName
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : 'Driver';

  const selectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setDropdownOpen(false);
  };

  const canProceed = selectedVehicle && fuelType && fillingType;

  const handleNext = () => {
    navigation.navigate('UploadPhotos', {
      vehicleId: selectedVehicle._id,
      vehicleReg: selectedVehicle.registrationNumber,
      driverId: user?.id || user?._id,
      fuelType,
      fillingType,
      lastOdometer: lastOdometer?.odometerReading || null,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

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
          {/* Vehicle Dropdown */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('refuel', 'vehicleInput')}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setDropdownOpen(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownIconLeft}>
                <Ionicons name="car-sport" size={18} color={COLORS.primary} />
              </View>
              <Text style={[
                styles.dropdownText,
                !selectedVehicle && styles.dropdownPlaceholder,
              ]}>
                {selectedVehicle
                  ? `${selectedVehicle.registrationNumber} (${selectedVehicle.vehicleType || ''})`
                  : t('refuel', 'selectVehicle')}
              </Text>
              {loadingVehicles ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
            {lastOdometer && (
              <Text style={styles.hintText}>
                Last odometer: {lastOdometer.odometerReading} km
              </Text>
            )}
          </View>

          {/* Driver Name (auto-filled from login) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('refuel', 'driverInput')}</Text>
            <View style={[styles.dropdownButton, styles.inputWrapperDisabled]}>
              <View style={styles.dropdownIconLeft}>
                <Ionicons name="person" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.disabledText}>{driverName}</Text>
            </View>
          </View>

          {/* Fuel Type */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>FUEL TYPE</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[styles.optionCard, fuelType === 'DIESEL' && styles.optionSelected]}
                onPress={() => setFuelType('DIESEL')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, fuelType === 'DIESEL' && styles.optionIconSelected]}>
                  <Ionicons name="flame" size={22} color={fuelType === 'DIESEL' ? COLORS.primaryDark : COLORS.primary} />
                </View>
                <Text style={[styles.optionText, fuelType === 'DIESEL' && styles.optionTextSelected]}>Diesel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, fuelType === 'ADBLUE' && styles.optionSelected]}
                onPress={() => setFuelType('ADBLUE')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, fuelType === 'ADBLUE' && styles.optionIconSelected]}>
                  <Ionicons name="water" size={22} color={fuelType === 'ADBLUE' ? COLORS.primaryDark : COLORS.primary} />
                </View>
                <Text style={[styles.optionText, fuelType === 'ADBLUE' && styles.optionTextSelected]}>AdBlue</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filling Type */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('refuel', 'typeInput')}</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[styles.optionCard, fillingType === 'FULL_TANK' && styles.optionSelected]}
                onPress={() => setFillingType('FULL_TANK')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, fillingType === 'FULL_TANK' && styles.optionIconSelected]}>
                  <Ionicons name="speedometer" size={22} color={fillingType === 'FULL_TANK' ? COLORS.primaryDark : COLORS.primary} />
                </View>
                <Text style={[styles.optionText, fillingType === 'FULL_TANK' && styles.optionTextSelected]}>
                  {t('refuel', 'full')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, fillingType === 'PARTIAL' && styles.optionSelected]}
                onPress={() => setFillingType('PARTIAL')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, fillingType === 'PARTIAL' && styles.optionIconSelected]}>
                  <Ionicons name="water-outline" size={22} color={fillingType === 'PARTIAL' ? COLORS.primaryDark : COLORS.primary} />
                </View>
                <Text style={[styles.optionText, fillingType === 'PARTIAL' && styles.optionTextSelected]}>
                  {t('refuel', 'partial')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
            disabled={!canProceed}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>{t('refuel', 'next')}</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Vehicle Dropdown Modal */}
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
            {loadingVehicles ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ padding: 30 }} />
            ) : (
              <FlatList
                data={vehicles}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedVehicle?._id === item._id && styles.modalItemSelected,
                    ]}
                    onPress={() => selectVehicle(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="car-sport"
                      size={20}
                      color={selectedVehicle?._id === item._id ? COLORS.primaryDark : COLORS.textMuted}
                    />
                    <Text style={[
                      styles.modalItemText,
                      selectedVehicle?._id === item._id && styles.modalItemTextSelected,
                    ]}>
                      {item.registrationNumber} {item.vehicleType ? `(${item.vehicleType})` : ''}
                    </Text>
                    {selectedVehicle?._id === item._id && (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', padding: 20, color: COLORS.textMuted }}>
                    No vehicles found
                  </Text>
                }
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
