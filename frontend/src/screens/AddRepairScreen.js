import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchVehicles, submitRepair } from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

const { height } = Dimensions.get('window');

const COLORS = {
  primary: '#4469F0',
  primaryDark: '#213EA7',
  white: '#FFFFFF',
  background: '#F3F3F6',
  textDark: '#17181C',
  textMuted: '#5D5D5E',
  border: '#E6E6EB',
  surface: '#F3F3F6',
  cardBg: 'rgba(68, 105, 240, 0.08)',
  selectedBg: 'rgba(68, 105, 240, 0.12)',
  disabledBg: '#D0D8D8',
};

export default function AddRepairScreen({ navigation }) {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [workshop, setWorkshop] = useState('');
  const [repairType, setRepairType] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles(token)
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.vehicles || []);
        setVehicles(list.map((v) => ({ label: v.registrationNumber, value: v._id })));
      })
      .catch(() => {})
      .finally(() => setVehiclesLoading(false));
  }, [token]);

  const selectVehicle = (item) => {
    setSelectedVehicle(item);
    setDropdownOpen(false);
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotos((prev) => [...prev, result.assets[0]]);
    }
  };

  const resetForm = () => {
    setSelectedVehicle(null);
    setDate(new Date());
    setWorkshop('');
    setRepairType('');
    setAmount('');
    setNotes('');
    setPhotos([]);
  };

  const handleSubmit = async () => {
    if (!selectedVehicle || !workshop || !repairType || !amount) {
      Alert.alert(t('repairs', 'missingFieldsTitle'), t('repairs', 'missingFieldsMsg'));
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRepair(token, {
        vehicleId: selectedVehicle.value,
        recordType: 'REPAIR',
        date: date.toISOString(),
        workshop,
        type: repairType,
        amount: Number(amount),
        notes,
      }, photos);
      resetForm();
      Alert.alert(t('repairs', 'successTitle'), t('repairs', 'successMsg'), [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert(t('repairs', 'errorTitle'), err.message || t('repairs', 'failedLog'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedVehicle && workshop && repairType && amount;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Green Top Section */}
      <View style={styles.topSection} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>{t('repairs', 'addRepairTitle')}</Text>
            <Text style={styles.headerStep}>{t('repairs', 'addRepairStep')}</Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Vehicle Number */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('repairs', 'vehicleLabel')}</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => !vehiclesLoading && setDropdownOpen(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconLeft}>
                  {vehiclesLoading
                    ? <ActivityIndicator size="small" color={COLORS.primary} />
                    : <Ionicons name="car-sport" size={18} color={COLORS.primary} />}
                </View>
                <Text style={[
                  styles.dropdownText,
                  !selectedVehicle && styles.dropdownPlaceholder,
                ]}>
                  {selectedVehicle?.label || t('repairs', 'selectVehicle')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Date Picker */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('repairs', 'dateLabel')}</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconLeft}>
                  <Ionicons name="calendar" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.dropdownText}>
                  {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Workshop */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('repairs', 'workshopLabel')}</Text>
              <View style={styles.inputButton}>
                <View style={styles.dropdownIconLeft}>
                  <Ionicons name="business" size={18} color={COLORS.primary} />
                </View>
                <TextInput
                  style={styles.inputText}
                  placeholder={t('repairs', 'workshopPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  value={workshop}
                  onChangeText={setWorkshop}
                />
              </View>
            </View>

            {/* Repair Type */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('repairs', 'typeLabel')}</Text>
              <View style={styles.inputButton}>
                <View style={styles.dropdownIconLeft}>
                  <Ionicons name="build" size={18} color={COLORS.primary} />
                </View>
                <TextInput
                  style={styles.inputText}
                  placeholder={t('repairs', 'typePlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  value={repairType}
                  onChangeText={setRepairType}
                />
              </View>
            </View>

            {/* Amount */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('repairs', 'amountLabel')}</Text>
              <View style={styles.inputButton}>
                <View style={styles.dropdownIconLeft}>
                  <Ionicons name="cash" size={18} color={COLORS.primary} />
                </View>
                <TextInput
                  style={styles.inputText}
                  placeholder={t('repairs', 'amountPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('repairs', 'notesLabel')}</Text>
              <View style={[styles.inputButton, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                <TextInput
                  style={[styles.inputText, { height: 60, textAlignVertical: 'top' }]}
                  placeholder={t('repairs', 'notesPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>

            {/* Photos */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('repairs', 'photosLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                {photos.map((photo, index) => (
                  <View key={index} style={{ marginRight: 12, position: 'relative' }}>
                    <Image source={{ uri: photo.uri }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                    <TouchableOpacity
                      style={{ position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.white, borderRadius: 12 }}
                      onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={{ width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}
                  onPress={pickImage}
                >
                  <Ionicons name="camera" size={28} color={COLORS.primary} />
                </TouchableOpacity>
              </ScrollView>
            </View>
          </ScrollView>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextBtn, (!isFormValid || isSubmitting) && styles.nextBtnDisabled]}
            disabled={!isFormValid || isSubmitting}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.nextText}>{t('repairs', 'submitRepair')}</Text>
                <Ionicons name="checkmark" size={20} color={COLORS.white} />
              </>
            )}
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
              <Text style={styles.modalTitle}>{t('repairs', 'selectVehicle')}</Text>
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
                  onPress={() => selectVehicle(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="car-sport"
                    size={20}
                    color={selectedVehicle?.value === item.value ? COLORS.primaryDark : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedVehicle?.value === item.value && { color: COLORS.primaryDark, fontWeight: '600' },
                    ]}
                  >
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.28,
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerStep: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  formCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 8,
    paddingHorizontal: 22,
    paddingTop: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputButton: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  dropdownIconLeft: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  dropdownPlaceholder: {
    color: COLORS.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: height * 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemSelected: {
    backgroundColor: COLORS.selectedBg,
  },
  modalItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: COLORS.white,
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  nextBtnDisabled: {
    backgroundColor: COLORS.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
