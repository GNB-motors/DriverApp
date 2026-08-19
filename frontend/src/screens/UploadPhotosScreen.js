import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import {
  View,
  Alert,
  BackHandler,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { scanDocument, uploadDocument, submitFuelLog, fetchLastOdometer } from '../services/api';
import logger from '../utils/logger';
import { compressImage } from '../utils/imageUtils';
import * as ImagePicker from 'expo-image-picker';
import dayjs from 'dayjs';
import { SELECTED_VEHICLE_KEY } from './VehicleScreen';
import PhotoTaskCard from '../components/PhotoTaskCard';
import EntrySummaryCard from '../components/EntrySummaryCard';
import { AppText, Button, ScreenHeader, colors } from '../components/ui';

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
  originalOcrData: {},
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
        originalOcrData: {
          ...state.originalOcrData,
          litres: action.payload.volume != null ? String(action.payload.volume) : state.originalOcrData.litres,
          rate: action.payload.rate != null ? String(action.payload.rate) : state.originalOcrData.rate,
          location: action.payload.location || state.originalOcrData.location,
          refuelTime: action.payload.datetime || state.originalOcrData.refuelTime,
        }
      };
    case 'OCR_ODOMETER_SUCCESS':
      return {
        ...state,
        odometerReading: action.payload.reading != null ? String(action.payload.reading) : state.odometerReading,
        odometerError: action.payload.error || state.odometerError,
        originalOcrData: {
          ...state.originalOcrData,
          odometerReading: action.payload.reading != null ? String(action.payload.reading) : state.originalOcrData.odometerReading,
        }
      };
    default:
      return state;
  }
}

export default function UploadPhotosScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const cachedTypeRef = useRef(route.params?.refuelType);
  const cachedVehicleIdRef = useRef(route.params?.vehicleId);
  const cachedVehicleLabelRef = useRef(route.params?.vehicleLabel);
  const cachedDriverIdRef = useRef(route.params?.driverId || null);
  const cachedOrgIdRef = useRef(route.params?.orgId || null);
  if (route.params?.refuelType) cachedTypeRef.current = route.params.refuelType;
  if (route.params?.vehicleId) cachedVehicleIdRef.current = route.params.vehicleId;
  if (route.params?.vehicleLabel) cachedVehicleLabelRef.current = route.params.vehicleLabel;
  if (route.params?.driverId) cachedDriverIdRef.current = route.params.driverId;
  if (route.params?.orgId) cachedOrgIdRef.current = route.params.orgId;

  const needsOdometer = cachedTypeRef.current === 'full';
  const isFieldAgent = user?.role === 'FIELD_AGENT';
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
    fetchLastOdometer(token, vehicleId, cachedOrgIdRef.current)
      .then((data) => setLastOdometer(data || null))
      .catch(() => { });
  }, [token]);

  const runOcrBill = useCallback(async (uri) => {
    if (!uri || !token) return;
    setBillOcrPending(true);
    try {
      const compressed = await compressImage(uri, 0.7);
      const result = await scanDocument(token, makeFileObj(compressed), 'FUEL_RECEIPT', cachedOrgIdRef.current);
      logger.info('OCR', `FUEL_RECEIPT result: confidence=${result?.confidence ?? 'n/a'} litres=${result?.volume ?? '-'} rate=${result?.rate ?? '-'}`);
      dispatch({ type: 'OCR_BILL_SUCCESS', payload: result || {} });
    } catch {
    } finally {
      setBillOcrPending(false);
    }
  }, [token, dispatch]);

  const runOcrOdometer = useCallback(async (uri) => {
    if (!uri || !token) return;
    dispatch({ type: 'SET_ODOMETER_ERROR', error: null });
    setOdometerOcrPending(true);
    try {
      const compressed = await compressImage(uri, 0.7);
      const result = await scanDocument(token, makeFileObj(compressed), 'ODOMETER', cachedOrgIdRef.current);
      logger.info('OCR', `ODOMETER result: reading=${result?.reading ?? '-'} confidence=${result?.confidence ?? 'n/a'}`);

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
  }, [token, lastOdometer, dispatch]);

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
  }, [route.params, runOcrBill, runOcrOdometer]);

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        Alert.alert(t('upload', 'discardTitle'), t('upload', 'discardMsg'), [
          { text: t('upload', 'cancel'), onPress: () => null, style: 'cancel' },
          { text: t('upload', 'yesGoBack'), onPress: () => navigation.goBack() },
        ]);
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }, [t, navigation])
  );

  const confirmDiscard = () => {
    Alert.alert(t('upload', 'discardTitle'), t('upload', 'discardMsg'), [
      { text: t('upload', 'cancel'), style: 'cancel' },
      { text: t('upload', 'yesGoBack'), onPress: () => navigation.goBack() },
    ]);
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

  const isComplete = !!billPhoto;

  const handleSubmit = async () => {
    let vehicleId = cachedVehicleIdRef.current;
    const orgId = cachedOrgIdRef.current;     // set for field agents, null for drivers

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

    logger.info('UploadPhotos', `Submit started — vehicleId=${vehicleId} isFieldAgent=${isFieldAgent} orgId=${orgId ?? 'n/a'}`);
    setSubmitting(true);
    try {
      const compressedBill = await compressImage(billPhoto, 0.75);
      logger.info('UploadPhotos', 'Uploading fuel slip document');
      const billDoc = await uploadDocument(
        token, makeFileObj(compressedBill), vehicleId, 'FUEL_SLIP', null,
        isFieldAgent ? orgId : null,
      );
      const documentId = billDoc?._id;
      logger.info('UploadPhotos', `Fuel slip uploaded — documentId=${documentId}`);

      let odometerDocId = null;
      if (needsOdometer && odometerPhoto) {
        logger.info('UploadPhotos', 'Uploading odometer document');
        const compressedOdometer = await compressImage(odometerPhoto, 0.75);
        const odomDoc = await uploadDocument(
          token, makeFileObj(compressedOdometer), vehicleId, 'ODOMETER', null,
          isFieldAgent ? orgId : null,
        );
        odometerDocId = odomDoc?._id;
        logger.info('UploadPhotos', `Odometer uploaded — odometerDocId=${odometerDocId}`);
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

      // Field agents pass the selected driver; regular drivers pass themselves
      const driverId = isFieldAgent ? cachedDriverIdRef.current : user?._id;

      // Check for manual OCR edits
      const original = state.originalOcrData;
      const edited = {
        litres: state.litres,
        rate: state.rate,
        odometerReading: state.odometerReading,
        location: state.location,
        refuelTime: state.refuelTime,
      };

      let isEdited = false;
      const edits = {};

      for (const key of Object.keys(edited)) {
        if (original[key] != null && original[key] !== '' && edited[key] !== original[key]) {
          isEdited = true;
          edits[key] = { original: original[key], edited: edited[key] };
        }
      }

      if (isEdited) {
        Sentry.withScope((scope) => {
          scope.setTag('vehicleId', vehicleId);
          if (driverId) scope.setTag('driverId', driverId);
          scope.setContext('ocr_edits', {
            originalData: original,
            submittedData: edited,
            changes: edits,
          });
          Sentry.captureMessage('OCR_DATA_EDITED');
        });
      }

      logger.info('UploadPhotos', `Submitting fuel log — driverId=${driverId} fillingType=${needsOdometer ? 'FULL_TANK' : 'PARTIAL'}`);
      await submitFuelLog(
        token,
        {
          vehicleId,
          driverId,
          fuelType: devFt,
          fillingType: needsOdometer ? 'FULL_TANK' : 'PARTIAL',
          ...(devL != null && !isNaN(devL) && { litres: devL }),
          ...(devR != null && !isNaN(devR) && { rate: devR }),
          ...(needsOdometer && devO != null && !isNaN(devO) && { odometerReading: devO }),
          ...(devLoc && { location: devLoc }),
          ...(refuelTimeIso && { refuelTime: refuelTimeIso }),
          ...(documentId && { documentId }),
          ...(odometerDocId && { odometerDocId }),
        },
        isFieldAgent ? orgId : null,  // X-Org-Id header for field agents
      );

      logger.info('UploadPhotos', 'Fuel log submitted successfully');
      // Replace the old success Alert with the dedicated success screen.
      // reset → [Main, RefuelSuccess] so back/Home lands on the dashboard.
      const totalAmount = (devL != null && !isNaN(devL) && devR != null && !isNaN(devR)) ? devL * devR : null;
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          {
            name: 'RefuelSuccess',
            params: {
              vehicleLabel: cachedVehicleLabelRef.current || null,
              litres: (devL != null && !isNaN(devL)) ? devL : null,
              amount: totalAmount,
            },
          },
        ],
      });
    } catch (err) {
      logger.error('UploadPhotos', `Submit failed: ${err.message}`);
      Alert.alert(t('upload', 'error'), err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitDisabled = !isComplete || submitting || billOcrPending || odometerOcrPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <StatusBar style="light" />

      <ScreenHeader title={t('upload', 'title')} subtitle={t('upload', 'step')} onBack={confirmDiscard}>
        <View style={styles.progress}>
          <View style={[styles.segment, styles.segmentActive]} />
          <View style={[styles.segment, styles.segmentActive]} />
        </View>
      </ScreenHeader>

      <View style={styles.card}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <AppText variant="label" muted style={styles.sectionLabel}>{t('upload', 'requiredPhotos')}</AppText>

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
              retakeText={t('upload', 'retake')}
            />
          )}
          <PhotoTaskCard
            title={t('upload', isFieldAgent ? 'fuelBillFieldAgent' : 'fuelBill')}
            icon="receipt-outline"
            type="bill"
            photoUri={billPhoto}
            onCameraPress={openCamera}
            onGalleryPress={pickFromGallery}
            capturedText={t('upload', 'photoCaptured')}
            pendingText={t('upload', 'cameraOrGallery')}
            isLoading={billOcrPending}
            analyzingText={t('upload', 'analyzing')}
            retakeText={t('upload', 'retake')}
          />

          {/* Readability hint */}
          <View style={styles.hint}>
            <Ionicons name="information-circle" size={18} color="#A9781C" style={{ marginTop: 1 }} />
            <AppText variant="small" weight="medium" style={styles.hintText}>
              Make sure the odometer and bill numbers are clearly readable before submitting.
            </AppText>
          </View>

          {/* Payload summary once all required photos are captured */}
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
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          icon="checkmark-circle"
          label={isComplete ? t('upload', 'submit') : t('upload', 'submitDisabled')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitDisabled}
          size="lg"
        />
      </View>
    </KeyboardAvoidingView>
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
  },
  scroll: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 24 },
  sectionLabel: { marginBottom: 16 },

  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.pendingBg,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 18,
  },
  hintText: { flex: 1, color: '#8A6E22', lineHeight: 18 },

  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: 22,
    paddingTop: 16,
    shadowColor: '#0A1024',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
  },
});
