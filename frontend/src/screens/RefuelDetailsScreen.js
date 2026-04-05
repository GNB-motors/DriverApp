import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import styles, { COLORS } from '../styles/RefuelDetailsScreen.styles';

const VEHICLES = [
  { label: 'MH 12 AB 1234', value: 'MH 12 AB 1234' },
  { label: 'MH 14 XY 9876', value: 'MH 14 XY 9876' },
  { label: 'DL 01 AA 1111', value: 'DL 01 AA 1111' },
];

export default function RefuelDetailsScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { vehicleAssigned } = route.params || {};
  const [vehicleNumber, setVehicleNumber] = useState('MH 12 AB 1234');
  const [refuelType, setRefuelType] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleNext = () => {
    navigation.navigate('UploadPhotos', { refuelType });
  };

  const selectVehicle = (value) => {
    setVehicleNumber(value);
    setDropdownOpen(false);
  };

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
          {/* Vehicle Number - Custom Dropdown */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('refuel', 'vehicleInput')}</Text>
            <TouchableOpacity
              style={[styles.dropdownButton, vehicleAssigned && styles.inputWrapperDisabled]}
              onPress={() => !vehicleAssigned && setDropdownOpen(true)}
              activeOpacity={vehicleAssigned ? 1 : 0.7}
            >
              <View style={styles.dropdownIconLeft}>
                <Ionicons name="car-sport" size={18} color={COLORS.primary} />
              </View>
              <Text style={[
                styles.dropdownText,
                !vehicleNumber && styles.dropdownPlaceholder,
              ]}>
                {vehicleNumber || t('refuel', 'selectVehicle')}
              </Text>
              {!vehicleAssigned && (
                <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Driver Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('refuel', 'driverInput')}</Text>
            <View style={[styles.dropdownButton, styles.inputWrapperDisabled]}>
              <View style={styles.dropdownIconLeft}>
                <Ionicons name="person" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.disabledText}>Rajesh Kumar</Text>
            </View>
          </View>

          {/* Refuel Type */}
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
            style={[styles.nextBtn, (!vehicleNumber || !refuelType) && styles.nextBtnDisabled]}
            disabled={!vehicleNumber || !refuelType}
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
            <FlatList
              data={VEHICLES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    vehicleNumber === item.value && styles.modalItemSelected,
                  ]}
                  onPress={() => selectVehicle(item.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="car-sport"
                    size={20}
                    color={vehicleNumber === item.value ? COLORS.primaryDark : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.modalItemText,
                      vehicleNumber === item.value && styles.modalItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {vehicleNumber === item.value && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
