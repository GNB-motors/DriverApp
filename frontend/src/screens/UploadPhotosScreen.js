import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  BackHandler,
  StatusBar,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { scanDocument, uploadDocument } from '../services/documentService';
import { submitFuelLog } from '../services/mileageService';
import styles, { COLORS } from '../styles/UploadPhotosScreen.styles';

export default function UploadPhotosScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { token } = useAuth();

  const {
    vehicleId,
    vehicleReg,
    driverId,
    fuelType,
    fillingType,
    lastOdometer,
  } = route.params || {};

  const needsOdometer = fillingType === 'FULL_TANK';

  const [odometerPhoto, setOdometerPhoto] = useState(null);
  const [billPhoto, setBillPhoto] = useState(null);

  // OCR-filled / manual fields
  const [litres, setLitres] = useState('');
  const [rate, setRate] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [location, setLocation] = useState('');

  // Loading states
  const [scanningBill, setScanningBill] = useState(false);
  const [scanningOdo, setScanningOdo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Odometer validation error
  const [odoError, setOdoError] = useState('');

  useEffect(() => {
    if (route.params?.capturedPhoto) {
      const { type, uri } = route.params.capturedPhoto;
      const file = { uri, name: `${type}_${Date.now()}.jpg`, type: 'image/jpeg' };

      if (type === 'odometer') {
        setOdometerPhoto(uri);
        runOcrScan(file, 'ODOMETER', 'odometer');
      }
      if (type === 'bill') {
        setBillPhoto(uri);
        runOcrScan(file, 'FUEL_RECEIPT', 'bill');
      }
    }
    if (route.params?.odometerPhoto) setOdometerPhoto(route.params.odometerPhoto);
    if (route.params?.billPhoto) setBillPhoto(route.params.billPhoto);
  }, [route.params]);

  // Validate odometer
  useEffect(() => {
    if (odometerReading && lastOdometer) {
      const val = parseFloat(odometerReading);
      if (val <= lastOdometer) {
        setOdoError(`Must be greater than last reading (${lastOdometer} km)`);
      } else {
        setOdoError('');
      }
    } else {
      setOdoError('');
    }
  }, [odometerReading, lastOdometer]);

  useEffect(() => {
    const backAction = () => {
      Alert.alert('Discard progress?', 'Going back will reset your progress.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Go Back', onPress: () => navigation.goBack() },
      ]);
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, []);

  const runOcrScan = async (file, docType, photoType) => {
    const setter = photoType === 'bill' ? setScanningBill : setScanningOdo;
    setter(true);
    try {
      const ocrData = await scanDocument(token, file, docType);
      if (ocrData) {
        if (ocrData.litres && !litres) setLitres(String(ocrData.litres));
        if (ocrData.rate && !rate) setRate(String(ocrData.rate));
        if (ocrData.odometerReading && !odometerReading) {
          setOdometerReading(String(ocrData.odometerReading));
        }
      }
    } catch (err) {
      console.warn('OCR scan failed:', err.message);
    } finally {
      setter(false);
    }
  };

  const openCamera = (type) => {
    navigation.navigate('PhotoPreview', {
      type,
      refuelType: fillingType === 'FULL_TANK' ? 'full' : 'partial',
      odometerPhoto,
      billPhoto,
    });
  };

  const photosComplete = needsOdometer ? odometerPhoto && billPhoto : billPhoto;
  const fieldsComplete = litres && rate && (!needsOdometer || (odometerReading && !odoError));
  const isComplete = photosComplete && fieldsComplete;

  const handleSubmit = async () => {
    if (!isComplete) return;
    setSubmitting(true);

    try {
      // 1. Upload documents
      const billFile = { uri: billPhoto, name: `bill_${Date.now()}.jpg`, type: 'image/jpeg' };
      const billDoc = await uploadDocument(token, billFile, vehicleId, 'FUEL_SLIP');

      let odoDocId = undefined;
      if (needsOdometer && odometerPhoto) {
        const odoFile = { uri: odometerPhoto, name: `odo_${Date.now()}.jpg`, type: 'image/jpeg' };
        const odoDoc = await uploadDocument(token, odoFile, vehicleId, 'ODOMETER');
        odoDocId = odoDoc._id;
      }

      // 2. Submit fuel log
      const payload = {
        vehicleId,
        driverId,
        fuelType,
        fillingType,
        litres: parseFloat(litres),
        rate: parseFloat(rate),
        documentId: billDoc._id,
      };
      if (needsOdometer && odometerReading) {
        payload.odometerReading = parseFloat(odometerReading);
      }
      if (odoDocId) payload.odometerDocId = odoDocId;
      if (location.trim()) payload.location = location.trim();

      await submitFuelLog(token, payload);

      Alert.alert('Success', t('upload', 'successMsg'), [
        { text: 'OK', onPress: () => navigation.navigate('Main') },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPhotoTask = (title, icon, type, photoUri, scanning) => {
    const done = !!photoUri;
    return (
      <View style={[styles.taskCard, done && styles.taskCardComplete]}>
        <View style={[styles.taskIconContainer, done && styles.taskIconContainerComplete]}>
          <Ionicons name={icon} size={24} color={done ? COLORS.success : COLORS.primary} />
        </View>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{title}</Text>
          <Text style={[styles.taskStatus, done && styles.taskStatusComplete]}>
            {scanning ? 'Scanning with OCR...' : done ? 'Photo captured' : 'Tap camera to capture'}
          </Text>
        </View>
        {scanning ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : done ? (
          <View style={styles.successActions}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={20} color={COLORS.success} />
            </View>
            <TouchableOpacity onPress={() => openCamera(type)} style={styles.retakeBtn}>
              <Text style={styles.retakeText}>{t('upload', 'retake')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.cameraBtn} onPress={() => openCamera(type)}>
            <Ionicons name="camera" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderInput = (label, value, setValue, placeholder, keyboardType = 'default', error = '') => (
    <View style={styles.inputFieldContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.textInput, error ? styles.textInputError : null]}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Alert.alert('Discard progress?', 'Going back will reset your progress.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes, Go Back', onPress: () => navigation.goBack() },
              ]);
            }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>{t('upload', 'title')}</Text>
            <Text style={styles.headerStep}>{t('upload', 'step')}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressSegment, styles.progressSegmentActive]} />
          <View style={[styles.progressSegment, styles.progressSegmentActive]} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={styles.contentCard} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Photo Section */}
            <Text style={styles.sectionLabel}>Required Photos</Text>
            {needsOdometer &&
              renderPhotoTask(t('upload', 'odometer'), 'speedometer-outline', 'odometer', odometerPhoto, scanningOdo)}
            {renderPhotoTask(t('upload', 'fuelBill'), 'receipt-outline', 'bill', billPhoto, scanningBill)}

            {/* Input Fields */}
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Fuel Details</Text>

            {renderInput('Litres', litres, setLitres, 'e.g. 150.5', 'decimal-pad')}
            {renderInput('Rate (₹/litre)', rate, setRate, 'e.g. 90.00', 'decimal-pad')}

            {litres && rate ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>
                  ₹ {(parseFloat(litres || 0) * parseFloat(rate || 0)).toFixed(2)}
                </Text>
              </View>
            ) : null}

            {needsOdometer &&
              renderInput('Odometer Reading (km)', odometerReading, setOdometerReading, 'e.g. 125430', 'numeric', odoError)}

            {renderInput('Location (optional)', location, setLocation, 'e.g. Reliance Pump, Highway 4')}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, !isComplete && styles.submitBtnDisabled]}
            disabled={!isComplete || submitting}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                <Text style={styles.submitText}>
                  {isComplete ? t('upload', 'submit') : t('upload', 'submitDisabled')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
