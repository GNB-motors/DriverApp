import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useLanguage } from '../context/LanguageContext';

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
    // Restore bounced back photos in case of screen remount
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
        { text: 'Yes, Go Back', onPress: () => navigation.goBack() }
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
      billPhoto
    });
  };

  const isComplete = needsOdometer ? (odometerPhoto && billPhoto) : billPhoto;

  const handleSubmit = () => {
    Alert.alert('Success ✅', t('upload', 'successMsg'), [
      { text: 'OK', onPress: () => navigation.navigate('Main') }
    ]);
  };

  const renderPhotoTask = (title, type, photoUri) => (
    <View style={styles.taskCard}>
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle}>{title}</Text>
      </View>
      {photoUri ? (
        <View style={styles.successBadge}>
          <Ionicons name="checkmark-circle" size={32} color={theme.colors.success} />
          <TouchableOpacity onPress={() => openCamera(type)} style={styles.retakeBtn}>
            <Text style={styles.retakeText}>{t('upload', 'retake')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.cameraBtn} onPress={() => openCamera(type)}>
          <Ionicons name="camera" size={32} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('upload', 'title')}</Text>
        <Text style={styles.headerSubtitle}>{t('upload', 'step')}</Text>
      </View>

      <View style={styles.content}>
        {needsOdometer && renderPhotoTask(t('upload', 'odometer'), 'odometer', odometerPhoto)}
        {renderPhotoTask(t('upload', 'fuelBill'), 'bill', billPhoto)}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, !isComplete && styles.submitBtnDisabled]}
          disabled={!isComplete}
          onPress={handleSubmit}
        >
          <Text style={styles.submitText}>
            {isComplete ? t('upload', 'submit') : t('upload', 'submitDisabled')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: theme.colors.border },
  headerTitle: { ...theme.typography.large, color: theme.colors.textPrimary },
  headerSubtitle: { ...theme.typography.small, color: theme.colors.primary, fontWeight: 'bold', marginTop: 4 },
  content: { flex: 1, padding: theme.spacing.lg },
  taskCard: { backgroundColor: theme.colors.surface, borderRadius: theme.components.borderRadius, padding: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  taskInfo: { flex: 1 },
  taskTitle: { ...theme.typography.medium, color: theme.colors.textPrimary, fontWeight: 'bold' },
  cameraBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  successBadge: { alignItems: 'center' },
  retakeBtn: { marginTop: 4 },
  retakeText: { color: theme.colors.primary, fontSize: 12, fontWeight: 'bold' },
  footer: { padding: theme.spacing.lg, backgroundColor: '#fff', borderTopWidth: 1, borderColor: theme.colors.border },
  submitBtn: { backgroundColor: theme.colors.success, height: 60, borderRadius: theme.components.borderRadius, justifyContent: 'center', alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: theme.colors.border },
  submitText: { color: '#fff', ...theme.typography.medium },
});
