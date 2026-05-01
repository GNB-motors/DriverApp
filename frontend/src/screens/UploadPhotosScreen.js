import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  BackHandler,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { scanDocument, uploadDocument, submitFuelLog, fetchLastOdometer } from '../services/api';
import { compressImage } from '../utils/imageUtils';
import * as ImagePicker from 'expo-image-picker';
import { SELECTED_VEHICLE_KEY } from './VehicleScreen';
import styles, { COLORS } from '../styles/UploadPhotosScreen.styles';

function makeFileObj(uri) {
  return { uri, name: uri.split('/').pop() || 'photo.jpg', type: 'image/jpeg' };
}

export default function UploadPhotosScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { token, user } = useAuth();

  // Cache refuelType + vehicleId + vehicleLabel across navigation merges
  const cachedTypeRef = useRef(route.params?.refuelType);
  const cachedVehicleIdRef = useRef(route.params?.vehicleId);
  const cachedVehicleLabelRef = useRef(route.params?.vehicleLabel);
  if (route.params?.refuelType) cachedTypeRef.current = route.params.refuelType;
  if (route.params?.vehicleId) cachedVehicleIdRef.current = route.params.vehicleId;
  if (route.params?.vehicleLabel) cachedVehicleLabelRef.current = route.params.vehicleLabel;

  const needsOdometer = cachedTypeRef.current === 'full';
  const driverName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Driver' : 'Driver';

  const [odometerPhoto, setOdometerPhoto] = useState(null);
  const [billPhoto, setBillPhoto] = useState(null);

  // Silent OCR results — driver never sees these, passed straight to payload
  const [ocrLitres, setOcrLitres] = useState(null);
  const [ocrRate, setOcrRate] = useState(null);
  const [ocrOdometer, setOcrOdometer] = useState(null);
  const [ocrLocation, setOcrLocation] = useState(null);
  const [ocrDatetime, setOcrDatetime] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [billOcrPending, setBillOcrPending] = useState(false);
  const [odometerOcrPending, setOdometerOcrPending] = useState(false);

  // ── Last-odometer guard (mirrors main-frontend MileageFuelLogPage) ────────
  // Fetched once when the screen mounts with a vehicleId. Used to block
  // submissions where the new reading ≤ the previous recorded reading.
  const [lastOdometer, setLastOdometer] = useState(null);   // { odometerReading, refuelTime }
  const [odometerError, setOdometerError] = useState(null); // string | null

  // ── Dev-only payload override state ──────────────────────────────────────
  // In __DEV__ mode the preview panel exposes editable TextInputs so engineers
  // can tweak OCR-extracted values before hitting submit.
  // In production this object is never mutated — the raw OCR state is used directly.
  const [devPayload, setDevPayload] = useState({
    fuelType: 'DIESEL',
    litres: '',
    rate: '',
    odometerReading: '',
    location: '',
  });

  // Keep devPayload in sync whenever OCR values arrive
  useEffect(() => {
    if (!__DEV__) return;
    setDevPayload(prev => ({
      ...prev,
      litres: ocrLitres != null ? String(ocrLitres) : prev.litres,
      rate: ocrRate != null ? String(ocrRate) : prev.rate,
      odometerReading: ocrOdometer != null ? String(ocrOdometer) : prev.odometerReading,
      location: ocrLocation != null ? ocrLocation : prev.location,
    }));
  }, [ocrLitres, ocrRate, ocrOdometer, ocrLocation]);

  // ── Fetch last odometer when vehicleId is available ────────────────────────
  useEffect(() => {
    const vehicleId = cachedVehicleIdRef.current;
    if (!vehicleId || !token) return;
    fetchLastOdometer(token, vehicleId)
      .then((data) => setLastOdometer(data || null))
      .catch(() => { }); // Non-fatal — just means no prior logs
  }, [token]);

  // Pick up captured photos returned from PhotoPreviewScreen
  useEffect(() => {
    if (route.params?.odometerPhoto) setOdometerPhoto(route.params.odometerPhoto);
    if (route.params?.billPhoto) setBillPhoto(route.params.billPhoto);

    if (route.params?.capturedPhoto) {
      const { type, uri, originalUri } = route.params.capturedPhoto;
      const ocrUri = originalUri || uri;
      if (type === 'odometer') {
        setOdometerPhoto(uri);
        runOcrOdometer(ocrUri);
      }
      if (type === 'bill') {
        setBillPhoto(uri);
        runOcrBill(ocrUri);
      }
    }
  }, [route.params]);

  useEffect(() => {
    const backAction = () => {
      Alert.alert('Discard progress?', 'Going back will reset your progress. Are you sure?', [
        { text: 'Cancel', onPress: () => null, style: 'cancel' },
        { text: 'Yes, Go Back', onPress: () => navigation.goBack() },
      ]);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // Silent OCR — pre-extracts values, no driver interaction needed
  const runOcrBill = async (uri) => {
    if (!uri || !token) return;
    setBillOcrPending(true);
    try {
      const compressed = await compressImage(uri, 0.7);
      const result = await scanDocument(token, makeFileObj(compressed), 'FUEL_RECEIPT');
      console.log('[OCR FUEL_RECEIPT] Full result:', JSON.stringify(result, null, 2));
      // OCR returns `volume` (litres), `rate`, and `location` from the fuel receipt parser
      if (result?.volume != null) setOcrLitres(parseFloat(result.volume));
      if (result?.rate != null) setOcrRate(parseFloat(result.rate));
      if (result?.location) setOcrLocation(result.location);
      if (result?.datetime) setOcrDatetime(result.datetime);
    } catch {
      // OCR failure is non-fatal — manager reviews if data missing
    } finally {
      setBillOcrPending(false);
    }
  };

  const runOcrOdometer = async (uri) => {
    if (!uri || !token) return;
    setOdometerError(null);
    setOdometerOcrPending(true);
    try {
      const compressed = await compressImage(uri, 0.7);
      const result = await scanDocument(token, makeFileObj(compressed), 'ODOMETER');
      console.log('[OCR ODOMETER] Full result:', JSON.stringify(result, null, 2));
      // OCR may return reading as a string like "1,05,450", "105450 km", or "9195.7 km"
      // Preserve the decimal point so parseFloat works correctly, then round to nearest integer
      if (result?.reading != null) {
        const raw = result.reading.toString().replace(/[^\d.]/g, ''); // strip non-numeric except '.'
        const sanitized = Math.round(parseFloat(raw));                // e.g. "9195.7" → 9196
        if (!isNaN(sanitized)) {
          setOcrOdometer(sanitized);
          // ── Validate immediately against last recorded odometer ──────────
          if (lastOdometer?.odometerReading != null && sanitized <= lastOdometer.odometerReading) {
            setOdometerError(
              `Odometer reading (${sanitized} km) must be greater than the last recorded reading (${lastOdometer.odometerReading} km). Please retake or upload a clearer image.`
            );
          }
        } else {
          setOdometerError('Could not read odometer value from this image. Please retake or upload a clearer image.');
        }
      } else {
        setOdometerError('No odometer reading detected. Please retake or upload a clearer image.');
      }
    } catch {
      setOdometerError('Odometer scan failed. Please retake or upload a clearer image.');
    } finally {
      setOdometerOcrPending(false);
    }
  };

  const openCamera = (type) => {
    navigation.navigate('PhotoPreview', {
      type,
      refuelType: cachedTypeRef.current,
      vehicleId: cachedVehicleIdRef.current,
      odometerPhoto,
      billPhoto,
    });
  };

  const pickFromGallery = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const uri = result.assets[0].uri;
    if (type === 'odometer') {
      setOdometerPhoto(uri);
      runOcrOdometer(uri);
    } else {
      setBillPhoto(uri);
      runOcrBill(uri);
    }
  };

  const isComplete = needsOdometer ? odometerPhoto && billPhoto : billPhoto;

  const handleSubmit = async () => {
    let vehicleId = cachedVehicleIdRef.current;
    if (!vehicleId) {
      // Fallback: read from persisted selection in AsyncStorage
      try {
        const raw = await AsyncStorage.getItem(SELECTED_VEHICLE_KEY);
        if (raw) vehicleId = JSON.parse(raw)._id;
      } catch { }
    }
    if (!vehicleId) {
      Alert.alert('Error', 'Vehicle not selected. Please go back and select a vehicle.');
      return;
    }

    setSubmitting(true);
    try {
      // Compress then upload bill photo — forward app-side OCR so DB document is always populated
      const compressedBill = await compressImage(billPhoto, 0.75);
      const billOcrPayload = {};
      if (ocrLitres != null && !isNaN(ocrLitres)) billOcrPayload.volume = ocrLitres;
      if (ocrRate != null && !isNaN(ocrRate)) billOcrPayload.rate = ocrRate;
      if (ocrLocation) billOcrPayload.location = ocrLocation;
      if (ocrDatetime) billOcrPayload.datetime = ocrDatetime;
      const billDoc = await uploadDocument(
        token, makeFileObj(compressedBill), vehicleId, 'FUEL_SLIP',
        Object.keys(billOcrPayload).length ? billOcrPayload : null,
      );
      const documentId = billDoc?._id;

      // Compress then upload odometer photo (FULL_TANK only)
      let odometerDocId = null;
      if (needsOdometer && odometerPhoto) {
        const compressedOdometer = await compressImage(odometerPhoto, 0.75);
        const odomOcrPayload = ocrOdometer != null && !isNaN(ocrOdometer)
          ? { reading: ocrOdometer }
          : null;
        const odomDoc = await uploadDocument(
          token, makeFileObj(compressedOdometer), vehicleId, 'ODOMETER', odomOcrPayload,
        );
        odometerDocId = odomDoc?._id;
      }

      // ── Odometer guard — same rule as main-frontend ────────────────────────
      // In __DEV__ mode use the editable override; in prod use raw OCR value.
      const devL = __DEV__ && devPayload.litres !== '' ? parseFloat(devPayload.litres) : ocrLitres;
      const devR = __DEV__ && devPayload.rate !== '' ? parseFloat(devPayload.rate) : ocrRate;
      const devO = __DEV__ && devPayload.odometerReading !== ''
        ? Math.round(parseFloat(devPayload.odometerReading))
        : ocrOdometer;
      const devLoc = __DEV__ ? devPayload.location || ocrLocation : ocrLocation;
      const devFt = __DEV__ ? (devPayload.fuelType || 'DIESEL') : 'DIESEL';

      // Only hard-block if we have a reading AND it goes backwards — OCR failure is allowed through
      if (needsOdometer && lastOdometer?.odometerReading != null && devO != null && !isNaN(devO)) {
        if (devO <= lastOdometer.odometerReading) {
          Alert.alert(
            'Invalid Odometer Reading',
            `The odometer reading (${devO} km) must be strictly greater than the last recorded reading (${lastOdometer.odometerReading} km).\n\nPlease retake the odometer photo or enter the correct value.`,
          );
          setSubmitting(false);
          return;
        }
      }

      await submitFuelLog(token, {
        vehicleId,
        driverId: user?._id,
        fuelType: devFt,
        fillingType: needsOdometer ? 'FULL_TANK' : 'PARTIAL',
        ...(devL != null && !isNaN(devL) && { litres: devL }),
        ...(devR != null && !isNaN(devR) && { rate: devR }),
        ...(needsOdometer && devO != null && !isNaN(devO) && { odometerReading: devO }),
        ...(devLoc && { location: devLoc }),
        ...(ocrDatetime && { refuelTime: ocrDatetime }),
        documentId: documentId || null,
        odometerDocId: odometerDocId || null,
      });

      Alert.alert('Success', t('upload', 'successMsg'), [
        { text: 'OK', onPress: () => navigation.navigate('Main') },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPhotoTask = (title, icon, type, photoUri) => {
    const done = !!photoUri;
    return (
      <View style={[styles.taskCard, done && styles.taskCardComplete]}>
        <View style={[styles.taskIconContainer, done && styles.taskIconContainerComplete]}>
          <Ionicons name={icon} size={24} color={done ? COLORS.success : COLORS.primary} />
        </View>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{title}</Text>
          <Text style={[styles.taskStatus, done && styles.taskStatusComplete]}>
            {done ? 'Photo captured' : 'Camera or gallery'}
          </Text>
        </View>
        {done ? (
          /* Captured — show tick */
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={20} color={COLORS.success} />
          </View>
        ) : (
          /* Not captured — show Camera + Gallery buttons */
          <View style={styles.photoActionButtons}>
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={() => openCamera(type)}
              accessibilityLabel={`Take ${type} photo`}
            >
              <Ionicons name="camera" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.galleryBtn}
              onPress={() => pickFromGallery(type)}
              accessibilityLabel={`Upload ${type} from gallery`}
            >
              <Ionicons name="image-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ── Payload Preview ─────────────────────────────────────────────────────────
  const renderPayloadPreview = () => {
    const vehicleLabel = cachedVehicleLabelRef.current || '—';
    const fillingType = needsOdometer ? 'Full Tank' : 'Partial Fill';
    const fillingColor = needsOdometer ? COLORS.primary : '#F59E0B';

    const editableRows = [
      { label: 'Litres', key: 'litres', value: devPayload.litres, placeholder: 'Not captured', unit: 'L' },
      { label: 'Rate', key: 'rate', value: devPayload.rate, placeholder: 'Not captured', unit: '₹/L' },
      ...(needsOdometer ? [{ label: 'Odometer', key: 'odometerReading', value: devPayload.odometerReading, placeholder: 'Not captured', unit: 'km', isOdo: true }] : []),
      { label: 'Location', key: 'location', value: devPayload.location, placeholder: 'Not captured', unit: null },
    ];

    return (
      <View style={styles.previewCard}>

        {/* ── Header ── */}
        <View style={styles.previewHeader}>
          <View style={styles.previewHeaderLeft}>
            <Ionicons name="receipt-outline" size={17} color={COLORS.primary} />
            <Text style={styles.previewTitle}>Entry Summary</Text>
          </View>
          {__DEV__ && (
            <View style={styles.devBadge}>
              <Text style={styles.devBadgeText}>DEV • EDITABLE</Text>
            </View>
          )}
        </View>

        {/* ── Identity chips: Vehicle + Driver + Filling type ── */}
        <View style={styles.previewChips}>
          <View style={styles.previewChip}>
            <Ionicons name="car-outline" size={13} color={COLORS.primary} />
            <Text style={styles.previewChipText}>{vehicleLabel}</Text>
          </View>
          <View style={styles.previewChip}>
            <Ionicons name="person-outline" size={13} color={COLORS.primary} />
            <Text style={styles.previewChipText}>{driverName}</Text>
          </View>
          <View style={[styles.previewChip, { borderColor: fillingColor, backgroundColor: fillingColor + '18' }]}>
            <Ionicons name={needsOdometer ? 'speedometer-outline' : 'water-outline'} size={13} color={fillingColor} />
            <Text style={[styles.previewChipText, { color: fillingColor }]}>{fillingType}</Text>
          </View>
          {__DEV__ && (
            <View style={[styles.previewChip, { borderColor: '#64748B' }]}>
              <Text style={[styles.previewChipText, { color: '#64748B' }]}>{devPayload.fuelType}</Text>
            </View>
          )}
        </View>

        {/* ── Odometer guard banner ── */}
        {needsOdometer && (
          <View style={[
            styles.odoContextBanner,
            odometerError ? styles.odoContextBannerError : styles.odoContextBannerInfo,
          ]}>
            <Ionicons
              name={odometerError ? 'alert-circle' : 'speedometer-outline'}
              size={13}
              color={odometerError ? COLORS.errorText : COLORS.primary}
            />
            <Text style={[
              styles.odoContextText,
              odometerError && styles.odoContextTextError,
            ]}>
              {odometerError
                ? odometerError
                : lastOdometer?.odometerReading != null
                  ? `Last recorded: ${lastOdometer.odometerReading} km — new reading must exceed this.`
                  : 'No prior full-tank logs found. Starting fresh.'}
            </Text>
          </View>
        )}

        {/* ── Divider ── */}
        <View style={styles.previewDivider} />

        {/* ── Editable / read-only data rows ── */}
        {editableRows.map(({ label, key, value, placeholder, unit, isOdo }, idx) => {
          const isLast = idx === editableRows.length - 1;
          const hasError = isOdo && !!odometerError;
          return (
            <View key={key} style={[styles.previewRow, isLast && styles.previewRowLast]}>
              <Text style={styles.previewLabel}>{label}</Text>
              {__DEV__ ? (
                <View style={styles.previewInputWrapper}>
                  <TextInput
                    style={[
                      styles.previewInput,
                      hasError && styles.previewInputError,
                    ]}
                    value={value}
                    onChangeText={(txt) => {
                      setDevPayload(prev => ({ ...prev, [key]: txt }));
                      if (isOdo && lastOdometer?.odometerReading != null) {
                        const parsed = Math.round(parseFloat(txt));
                        if (!txt || isNaN(parsed)) setOdometerError('Odometer reading is required for FULL_TANK.');
                        else if (parsed <= lastOdometer.odometerReading) setOdometerError(`Must be > ${lastOdometer.odometerReading} km (last recorded).`);
                        else setOdometerError(null);
                      }
                    }}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                    keyboardType={['litres', 'rate', 'odometerReading'].includes(key) ? 'numeric' : 'default'}
                    returnKeyType="done"
                  />
                  {unit && <Text style={styles.previewInputUnit}>{unit}</Text>}
                </View>
              ) : (
                <View style={styles.previewInputWrapper}>
                  <Text style={[styles.previewValue, !value && styles.previewValueMissing]}>
                    {value || placeholder}
                  </Text>
                  {unit && !!value && <Text style={styles.previewInputUnit}>{unit}</Text>}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
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
              Alert.alert('Discard progress?', 'Going back will reset your progress. Are you sure?', [
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

        {/* Photo Tasks + Payload Preview (scrollable) */}
        <View style={styles.contentCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.sectionLabel}>Required Photos</Text>

            {needsOdometer &&
              renderPhotoTask(t('upload', 'odometer'), 'speedometer-outline', 'odometer', odometerPhoto)}
            {renderPhotoTask(t('upload', 'fuelBill'), 'receipt-outline', 'bill', billPhoto)}

            {/* Show payload summary once all required photos are captured */}
            {isComplete && renderPayloadPreview()}
          </ScrollView>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!isComplete || submitting || billOcrPending || odometerOcrPending) && styles.submitBtnDisabled,
            ]}
            disabled={!isComplete || submitting || billOcrPending || odometerOcrPending}
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
    </KeyboardAvoidingView>
  );
}
