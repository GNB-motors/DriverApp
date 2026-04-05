import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, BackHandler, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import styles, { COLORS } from '../styles/UploadPhotosScreen.styles';

export default function UploadPhotosScreen({ navigation, route }) {
  const { t } = useLanguage();

  // Robustly cache refuelType so it survives all navigation merges and hot-reloads
  const cachedTypeRef = useRef(route.params?.refuelType);
  if (route.params?.refuelType) {
    cachedTypeRef.current = route.params.refuelType;
  }

  const needsOdometer = cachedTypeRef.current === 'full';

  const [odometerPhoto, setOdometerPhoto] = useState(null);
  const [billPhoto, setBillPhoto] = useState(null);

  useEffect(() => {
    if (route.params?.odometerPhoto) setOdometerPhoto(route.params.odometerPhoto);
    if (route.params?.billPhoto) setBillPhoto(route.params.billPhoto);

    if (route.params?.capturedPhoto) {
      const { type, uri } = route.params.capturedPhoto;
      if (type === 'odometer') setOdometerPhoto(uri);
      if (type === 'bill') setBillPhoto(uri);
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

  const openCamera = (type) => {
    navigation.navigate('PhotoPreview', {
      type,
      refuelType: cachedTypeRef.current,
      odometerPhoto,
      billPhoto,
    });
  };

  const isComplete = needsOdometer ? odometerPhoto && billPhoto : billPhoto;

  const handleSubmit = () => {
    Alert.alert('Success', t('upload', 'successMsg'), [
      { text: 'OK', onPress: () => navigation.navigate('Main') },
    ]);
  };

  const renderPhotoTask = (title, icon, type, photoUri) => {
    const done = !!photoUri;
    return (
      <View style={[styles.taskCard, done && styles.taskCardComplete]}>
        <View style={[styles.taskIconContainer, done && styles.taskIconContainerComplete]}>
          <Ionicons
            name={icon}
            size={24}
            color={done ? COLORS.success : COLORS.primary}
          />
        </View>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{title}</Text>
          <Text style={[styles.taskStatus, done && styles.taskStatusComplete]}>
            {done ? 'Photo captured' : 'Tap camera to capture'}
          </Text>
        </View>
        {done ? (
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

        {/* Content Card */}
        <View style={styles.contentCard}>
          <Text style={styles.sectionLabel}>Required Photos</Text>

          {needsOdometer &&
            renderPhotoTask(t('upload', 'odometer'), 'speedometer-outline', 'odometer', odometerPhoto)}
          {renderPhotoTask(t('upload', 'fuelBill'), 'receipt-outline', 'bill', billPhoto)}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, !isComplete && styles.submitBtnDisabled]}
            disabled={!isComplete}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
            <Text style={styles.submitText}>
              {isComplete ? t('upload', 'submit') : t('upload', 'submitDisabled')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
