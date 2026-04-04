import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { theme } from '../theme/theme';
import { useLanguage } from '../context/LanguageContext';

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
        const photo = await cameraRef.current.takePictureAsync({
            base64: false
        });
        if (photo && photo.uri) {
           setPhotoUri(photo.uri);
        }
      } catch (e) {
        console.error("Failed to take photo", e);
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
        refuelType, // Bounce it back flawlessly
        odometerPhoto, // Bounce it back
        billPhoto // Bounce it back
      },
      merge: true,
    });
  };

  const handleRetake = () => {
    setPhotoUri(null);
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }



  if (!permission.granted) {
    // If permanently denied or still requesting
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }]}>
        <Ionicons name="camera-outline" size={64} color="#fff" style={{ marginBottom: 20 }} />
        <Text style={styles.cameraText}>Camera access required</Text>
        {!permission.canAskAgain && (
           <Text style={[styles.cameraText, { fontSize: 14, marginTop: 8, opacity: 0.7 }]}>Permissions denied in device settings</Text>
        )}
        <TouchableOpacity style={[styles.btn, styles.retakeBtn, { marginTop: 30, width: '100%' }]} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>{t('sos', 'cancel')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!photoUri ? (
        <View style={styles.cameraContainer}>
          <CameraView 
            style={styles.cameraView} 
            ref={cameraRef} 
            facing="back"
          >
            <View style={styles.overlay}>
              <View style={styles.captureArea}>
                <TouchableOpacity style={[styles.captureBtn, isCapturing && { opacity: 0.5 }]} onPress={takePhoto} disabled={isCapturing}>
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      ) : (
        <View style={styles.previewView}>
          <Image source={{ uri: photoUri }} style={styles.imagePreview} resizeMode="contain" />
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.btn, styles.retakeBtn]} onPress={handleRetake}>
              <Ionicons name="close" size={24} color="#fff" />
              <Text style={styles.btnText}>{t('camera', 'retake')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAccept}>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.btnText}>{t('camera', 'accept')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraContainer: { flex: 1, borderRadius: 16, overflow: 'hidden', margin: theme.spacing.sm },
  cameraView: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
  cameraText: { color: '#fff', textAlign: 'center', ...theme.typography.medium },
  captureArea: { width: '100%', alignItems: 'center' },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  previewView: { flex: 1, padding: theme.spacing.lg },
  imagePreview: { flex: 1, backgroundColor: '#111', borderRadius: 16, marginBottom: theme.spacing.lg },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  btn: { flex: 1, height: 60, borderRadius: theme.components.borderRadius, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  retakeBtn: { backgroundColor: theme.colors.error, marginRight: 8 },
  acceptBtn: { backgroundColor: theme.colors.success, marginLeft: 8 },
  btnText: { color: '#fff', marginLeft: 8, ...theme.typography.medium, fontWeight: 'bold' },
});
