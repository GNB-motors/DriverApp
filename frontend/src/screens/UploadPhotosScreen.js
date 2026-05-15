import React, { useState, useEffect, useRef, useReducer } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  BackHandler,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { scanDocument, uploadDocument, submitFuelLog, fetchLastOdometer } from '../services/api';
import { compressImage } from '../utils/imageUtils';
import * as ImagePicker from 'expo-image-picker';
import dayjs from 'dayjs';
import { SELECTED_VEHICLE_KEY } from './VehicleScreen';
import styles, { COLORS } from '../styles/UploadPhotosScreen.styles';
import PhotoTaskCard from '../components/PhotoTaskCard';
import EntrySummaryCard from '../components/EntrySummaryCard';

function makeFileObj(uri) {
  return { uri, name: uri.split('/').pop() || 'photo.jpg', type: 'image/jpeg' };
}

const initialState = {
  fuelType: 'DIESEL',
  litres: '',
  rate: '',
  odometerReading: '',
  location: '',
  refuelTime: '',
  odometerError: null,
};

function formReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_ODOMETER_ERROR':
      return { ...state, odometerError: action.error };
    case 'OCR_BILL_SUCCESS':
      return {
        ...state,
        litres: action.payload.volume != null ? String(action.payload.volume) : state.litres,
        rate: action.payload.rate != null ? String(action.payload.rate) : state.rate,
        location: action.payload.location || state.location,
        refuelTime: action.payload.datetime || state.refuelTime,
      };
    case 'OCR_ODOMETER_SUCCESS':
      return {
        ...state,
        odometerReading: action.payload.reading != null ? String(action.payload.reading) : state.odometerReading,
        odometerError: action.payload.error || state.odometerError,
      };
    default:
      return state;
  }
}

export default function UploadPhotosScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { token, user } = useAuth();

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

  const [submitting, setSubmitting] = useState(false);
  const [billOcrPending, setBillOcrPending] = useState(false);
  const [odometerOcrPending, setOdometerOcrPending] = useState(false);

  const [lastOdometer, setLastOdometer] = useState(null);

  const [state, dispatch] = useReducer(formReducer, initialState);

  useEffect(() => {
    const vehicleId = cachedVehicleIdRef.current;
    if (!vehicleId || !token) return;
    fetchLastOdometer(token, vehicleId)
      .then((data) => setLastOdometer(data || null))
      .catch(() => { });
  }, [token]);

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
      Alert.alert(t('upload', 'discardTitle'), t('upload', 'discardMsg'), [
        { text: t('upload', 'cancel'), onPress: () => null, style: 'cancel' },
        { text: t('upload', 'yesGoBack'), onPress: () => navigation.goBack() },
      ]);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [t, navigation]);

  const runOcrBill = async (uri) => {
    if (!uri || !token) return;
    setBillOcrPending(true);
    try {
      const compressed = await compressImage(uri, 0.7);
      const result = await scanDocument(token, makeFileObj(compressed), 'FUEL_RECEIPT');
      console.log('[OCR FUEL_RECEIPT] Full result:', JSON.stringify(result, null, 2));
      dispatch({ type: 'OCR_BILL_SUCCESS', payload: result || {} });
    } catch {
    } finally {
      setBillOcrPending(false);
    }
  };

  const runOcrOdometer = async (uri) => {
    if (!uri || !token) return;
    dispatch({ type: 'SET_ODOMETER_ERROR', error: null });
    setOdometerOcrPending(true);
    try {
      const compressed = await compressImage(uri, 0.7);
      const result = await scanDocument(token, makeFileObj(compressed), 'ODOMETER');
      console.log('[OCR ODOMETER] Full result:', JSON.stringify(result, null, 2));
      
      let error = null;
      let sanitized = null;
      if (result?.reading != null) {
        const raw = result.reading.toString().replace(/[^\d.]/g, '');
        sanitized = parseFloat(raw);
        if (!isNaN(sanitized)) {
          if (lastOdometer?.odometerReading != null && sanitized <= lastOdometer.odometerReading) {
            error = `Odometer reading (${sanitized} km) must be greater than the last recorded reading (${lastOdometer.odometerReading} km). Please retake or upload a clearer image.`;
          }
        } else {
          error = 'Could not read odometer value from this image. Please retake or upload a clearer image.';
          sanitized = null;
        }
      } else {
        error = 'No odometer reading detected. Please retake or upload a clearer image.';
      }
      
      dispatch({ 
        type: 'OCR_ODOMETER_SUCCESS', 
        payload: { reading: sanitized, error } 
      });
    } catch {
      dispatch({ type: 'SET_ODOMETER_ERROR', error: 'Odometer scan failed. Please retake or upload a clearer image.' });
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
      try {
        const raw = await AsyncStorage.getItem(SELECTED_VEHICLE_KEY);
        if (raw) vehicleId = JSON.parse(raw)._id;
      } catch { }
    }
    if (!vehicleId) {
      Alert.alert(t('upload', 'error'), t('upload', 'vehicleNotSelected'));
      return;
    }

    setSubmitting(true);
    try {
      const compressedBill = await compressImage(billPhoto, 0.75);
      const billDoc = await uploadDocument(
        token, makeFileObj(compressedBill), vehicleId, 'FUEL_SLIP', null
      );
      const documentId = billDoc?._id;

      let odometerDocId = null;
      if (needsOdometer && odometerPhoto) {
        const compressedOdometer = await compressImage(odometerPhoto, 0.75);
        const odomDoc = await uploadDocument(
          token, makeFileObj(compressedOdometer), vehicleId, 'ODOMETER', null
        );
        odometerDocId = odomDoc?._id;
      }

      const devL = state.litres !== '' ? parseFloat(state.litres) : null;
      const devR = state.rate !== '' ? parseFloat(state.rate) : null;
      const devO = state.odometerReading !== '' ? parseFloat(state.odometerReading) : null;
      const devLoc = state.location;
      const devFt = state.fuelType || 'DIESEL';
      const devDt = state.refuelTime;

      let refuelTimeIso = undefined;
      if (devDt) {
        const parsed = dayjs(`${String(devDt).trim().replace(' ', 'T')}+05:30`);
        if (parsed.isValid()) {
          refuelTimeIso = parsed.toISOString();
        }
      }

      if (needsOdometer && lastOdometer?.odometerReading != null && devO != null && !isNaN(devO)) {
        if (devO <= lastOdometer.odometerReading) {
          Alert.alert(
            t('upload', 'invalidOdoTitle'),
            t('upload', 'invalidOdoMsg')
              .replace('{{new}}', devO)
              .replace('{{last}}', lastOdometer.odometerReading),
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
        ...(refuelTimeIso && { refuelTime: refuelTimeIso }),
        documentId: documentId || null,
        odometerDocId: odometerDocId || null,
      });

      Alert.alert(t('upload', 'success'), t('upload', 'successMsg'), [
        { text: 'OK', onPress: () => navigation.navigate('Main') },
      ]);
    } catch (err) {
      Alert.alert(t('upload', 'error'), err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
              Alert.alert(t('upload', 'discardTitle'), t('upload', 'discardMsg'), [
                { text: t('upload', 'cancel'), style: 'cancel' },
                { text: t('upload', 'yesGoBack'), onPress: () => navigation.goBack() },
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
            <Text style={styles.sectionLabel}>{t('upload', 'requiredPhotos')}</Text>

            {needsOdometer && (
              <PhotoTaskCard
                title={t('upload', 'odometer')}
                icon="speedometer-outline"
                type="odometer"
                photoUri={odometerPhoto}
                onCameraPress={openCamera}
                onGalleryPress={pickFromGallery}
                capturedText={t('upload', 'photoCaptured')}
                pendingText={t('upload', 'cameraOrGallery')}
                isLoading={odometerOcrPending}
                analyzingText={t('upload', 'analyzing')}
              />
            )}
            <PhotoTaskCard
              title={t('upload', 'fuelBill')}
              icon="receipt-outline"
              type="bill"
              photoUri={billPhoto}
              onCameraPress={openCamera}
              onGalleryPress={pickFromGallery}
              capturedText={t('upload', 'photoCaptured')}
              pendingText={t('upload', 'cameraOrGallery')}
              isLoading={billOcrPending}
              analyzingText={t('upload', 'analyzing')}
            />

            {/* Show payload summary once all required photos are captured */}
            {isComplete && (
              <EntrySummaryCard
                state={state}
                dispatch={dispatch}
                driverName={driverName}
                vehicleLabel={cachedVehicleLabelRef.current || '—'}
                needsOdometer={needsOdometer}
                lastOdometer={lastOdometer}
              />
            )}
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
