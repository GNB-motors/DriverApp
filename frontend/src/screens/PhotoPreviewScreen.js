import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLanguage } from '../context/LanguageContext';
import styles, { COLORS } from '../styles/PhotoPreviewScreen.styles';

export default function PhotoPreviewScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { type, refuelType, odometerPhoto, billPhoto } = route.params || {};
  const [photoUri, setPhotoUri] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const takePhoto = async () => {
    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: false });
        if (photo && photo.uri) {
          setPhotoUri(photo.uri);
        }
      } catch (e) {
        console.error('Failed to take photo', e);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleAccept = () => {
    navigation.navigate({
      name: 'UploadPhotos',
      params: {
        capturedPhoto: { type, uri: photoUri },
        refuelType,
        odometerPhoto,
        billPhoto,
      },
      merge: true,
    });
  };

  const handleRetake = () => {
    setPhotoUri(null);
  };

  const photoLabel = type === 'odometer' ? t('upload', 'odometer') : t('upload', 'fuelBill');

  // Loading state
  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Permission denied state
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <View style={styles.permissionIconWrap}>
          <Ionicons name="camera-outline" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        {!permission.canAskAgain && (
          <Text style={styles.permissionSubtitle}>
            Permission denied. Please enable camera access in your device settings.
          </Text>
        )}
        <TouchableOpacity style={styles.permissionBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.white} />
          <Text style={styles.permissionBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Camera / Preview
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {!photoUri ? (
        /* ── Camera Mode ── */
        <View style={styles.cameraContainer}>
          <CameraView style={styles.cameraView} ref={cameraRef} facing="back">
            <View style={styles.cameraOverlay}>
              {/* Top Bar */}
              <View style={styles.cameraTopBar}>
                <TouchableOpacity
                  style={styles.cameraCloseBtn}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="close" size={22} color={COLORS.white} />
                </TouchableOpacity>
                <View style={styles.cameraLabel}>
                  <Text style={styles.cameraLabelText}>{photoLabel}</Text>
                </View>
                <View style={{ width: 40 }} />
              </View>

              {/* Capture Button */}
              <View style={styles.cameraBottomBar}>
                <TouchableOpacity
                  style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
                  onPress={takePhoto}
                  disabled={isCapturing}
                >
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      ) : (
        /* ── Preview Mode ── */
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: photoUri }}
            style={styles.imagePreview}
            resizeMode="contain"
          />
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.retakeBtn]}
              onPress={handleRetake}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, styles.retakeIcon]}>
                <Ionicons name="close" size={20} color={COLORS.retake} />
              </View>
              <Text style={styles.retakeBtnText}>{t('camera', 'retake')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={handleAccept}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, styles.acceptIcon]}>
                <Ionicons name="checkmark" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.acceptBtnText}>{t('camera', 'accept')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
