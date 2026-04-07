import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  BackHandler,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { scanDocument, uploadDocument, submitFuelLog } from '../services/api';
import styles, { COLORS } from '../styles/UploadPhotosScreen.styles';

function makeFileObj(uri) {
  return { uri, name: uri.split('/').pop() || 'photo.jpg', type: 'image/jpeg' };
}

export default function UploadPhotosScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { token, user } = useAuth();

  // Cache refuelType + vehicleId across navigation merges
  const cachedTypeRef = useRef(route.params?.refuelType);
  const cachedVehicleIdRef = useRef(route.params?.vehicleId);
  if (route.params?.refuelType) cachedTypeRef.current = route.params.refuelType;
  if (route.params?.vehicleId) cachedVehicleIdRef.current = route.params.vehicleId;

  const needsOdometer = cachedTypeRef.current === 'full';

  const [odometerPhoto, setOdometerPhoto] = useState(null);
  const [billPhoto, setBillPhoto] = useState(null);

  // Silent OCR results — driver never sees these, passed straight to payload
  const [ocrLitres, setOcrLitres] = useState(null);
  const [ocrRate, setOcrRate] = useState(null);
  const [ocrOdometer, setOcrOdometer] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  // Pick up captured photos returned from PhotoPreviewScreen
  useEffect(() => {
    if (route.params?.odometerPhoto) setOdometerPhoto(route.params.odometerPhoto);
    if (route.params?.billPhoto) setBillPhoto(route.params.billPhoto);

    if (route.params?.capturedPhoto) {
      const { type, uri } = route.params.capturedPhoto;
      if (type === 'odometer') {
        setOdometerPhoto(uri);
        runOcrOdometer(uri);
      }
      if (type === 'bill') {
        setBillPhoto(uri);
        runOcrBill(uri);
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
    try {
      const result = await scanDocument(token, makeFileObj(uri), 'FUEL_RECEIPT');
      if (result?.litres != null) setOcrLitres(parseFloat(result.litres));
      if (result?.rate != null) setOcrRate(parseFloat(result.rate));
    } catch {
      // OCR failure is non-fatal — manager reviews if data missing
    }
  };

  const runOcrOdometer = async (uri) => {
    if (!uri || !token) return;
    try {
      const result = await scanDocument(token, makeFileObj(uri), 'ODOMETER');
      if (result?.odometerReading != null) setOcrOdometer(parseFloat(result.odometerReading));
    } catch {
      // Non-fatal
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

  const isComplete = needsOdometer ? odometerPhoto && billPhoto : billPhoto;

  const handleSubmit = async () => {
    const vehicleId = cachedVehicleIdRef.current;
    if (!vehicleId) {
      Alert.alert('Error', 'Vehicle not selected. Please go back and select a vehicle.');
      return;
    }

    setSubmitting(true);
    try {
      // Upload bill photo
      const billDoc = await uploadDocument(token, makeFileObj(billPhoto), vehicleId, 'FUEL_SLIP');
      const documentId = billDoc?._id;

      // Upload odometer photo (FULL_TANK only)
      let odometerDocId = null;
      if (needsOdometer && odometerPhoto) {
        const odomDoc = await uploadDocument(
          token, makeFileObj(odometerPhoto), vehicleId, 'ODOMETER',
        );
        odometerDocId = odomDoc?._id;
      }

      // Submit fuel log — include OCR-extracted values if available
      await submitFuelLog(token, {
        vehicleId,
        driverId: user._id,
        fuelType: 'DIESEL',
        fillingType: needsOdometer ? 'FULL_TANK' : 'PARTIAL',
        ...(ocrLitres != null && { litres: ocrLitres }),
        ...(ocrRate != null && { rate: ocrRate }),
        ...(needsOdometer && ocrOdometer != null && { odometerReading: ocrOdometer }),
        documentId,
        odometerDocId,
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
            {done ? 'Photo captured' : 'Tap camera to capture'}
          </Text>
        </View>
        {done ? (
          /* Accept is final — no retake option here */
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={20} color={COLORS.success} />
          </View>
        ) : (
          <TouchableOpacity style={styles.cameraBtn} onPress={() => openCamera(type)}>
            <Ionicons name="camera" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    );
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

        {/* Photo Tasks */}
        <View style={styles.contentCard}>
          <Text style={styles.sectionLabel}>Required Photos</Text>

          {needsOdometer &&
            renderPhotoTask(t('upload', 'odometer'), 'speedometer-outline', 'odometer', odometerPhoto)}
          {renderPhotoTask(t('upload', 'fuelBill'), 'receipt-outline', 'bill', billPhoto)}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, (!isComplete || submitting) && styles.submitBtnDisabled]}
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
