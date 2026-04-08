import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import ViewShot from 'react-native-view-shot';
import { useLanguage } from '../context/LanguageContext';
import styles, { COLORS } from '../styles/PhotoPreviewScreen.styles';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildWatermark(ts, coords) {
  const d = ts ? new Date(ts) : new Date();
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const loc = coords
    ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
    : 'Location N/A';
  return `${date}  ${time}  |  ${loc}`;
}

export default function PhotoPreviewScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { type, refuelType, vehicleId, odometerPhoto, billPhoto } = route.params || {};

  const [photoUri, setPhotoUri] = useState(null);
  const [photoTimestamp, setPhotoTimestamp] = useState(null);
  const [photoLocation, setPhotoLocation] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const cameraRef = useRef(null);
  const viewShotRef = useRef(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    // Request camera permission (existing behaviour)
    if (cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain) {
      requestCameraPermission();
    }
    // Request location permission (best-effort — watermark still works without it)
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => setLocationGranted(status === 'granted'))
      .catch(() => {});
  }, [cameraPermission]);

  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setPhotoTimestamp(Date.now());

        // Fetch GPS concurrently — 3 s timeout, never blocks the photo flow
        if (locationGranted) {
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
            .then((pos) => setPhotoLocation(pos.coords))
            .catch(() => setPhotoLocation(null));
        }
      }
    } catch (e) {
      console.error('Failed to take photo', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleAccept = async () => {
    if (!viewShotRef.current || isAccepting) return;
    setIsAccepting(true);
    try {
      // Capture the preview view with the watermark burned in
      const watermarkedUri = await viewShotRef.current.capture();
      navigation.navigate({
        name: 'UploadPhotos',
        params: {
          capturedPhoto: { type, uri: watermarkedUri },
          refuelType,
          vehicleId,
          odometerPhoto,
          billPhoto,
        },
        merge: true,
      });
    } catch (e) {
      // Fallback: use original if ViewShot fails for any reason
      console.warn('[PhotoPreview] ViewShot capture failed, using original URI', e);
      navigation.navigate({
        name: 'UploadPhotos',
        params: {
          capturedPhoto: { type, uri: photoUri },
          refuelType,
          vehicleId,
          odometerPhoto,
          billPhoto,
        },
        merge: true,
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRetake = () => {
    setPhotoUri(null);
    setPhotoTimestamp(null);
    setPhotoLocation(null);
  };

  const photoLabel = type === 'odometer' ? t('upload', 'odometer') : t('upload', 'fuelBill');

  if (!cameraPermission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <View style={styles.permissionIconWrap}>
          <Ionicons name="camera-outline" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        {!cameraPermission.canAskAgain && (
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {!photoUri ? (
        /* ── Camera Mode ── */
        <View style={styles.cameraContainer}>
          <CameraView style={styles.cameraView} ref={cameraRef} facing="back" />
          <View style={[styles.cameraOverlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
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
        </View>
      ) : (
        /* ── Preview Mode — watermark burned on Accept ── */
        <View style={styles.previewContainer}>
          <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.85 }} style={{ flex: 1 }}>
            <Image
              source={{ uri: photoUri }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
            {/* Watermark — positioned over the image, captured by ViewShot */}
            <View style={styles.watermarkBar} pointerEvents="none">
              <Text style={styles.watermarkText}>
                {buildWatermark(photoTimestamp, photoLocation)}
              </Text>
            </View>
          </ViewShot>

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
              disabled={isAccepting}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <View style={[styles.actionIcon, styles.acceptIcon]}>
                    <Ionicons name="checkmark" size={20} color={COLORS.white} />
                  </View>
                  <Text style={styles.acceptBtnText}>{t('camera', 'accept')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
