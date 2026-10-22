/**
 * PodSubmitScreen.js
 *
 * Driver interface to submit POD (Proof of Delivery).
 * Step 1: Pick image -> uploadPodDocument -> receive documentId
 * Step 2: Fill details -> submitPod -> trigger ErpContext refresh
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useErp } from '../../context/ErpContext';
import { useAuth } from '../../context/AuthContext';
import { uploadPodDocument, submitPod } from '../../services/erpApi';
import { AppText, Button, Card, colors, spacing, radius } from '../../components/ui';
import { TextInput } from 'react-native';
import VehicleLoader from '../../components/ui/VehicleLoader';

export default function PodSubmitScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { activeTrip, triggerRefresh } = useErp();
  
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    receivedDate: new Date().toISOString().split('T')[0],
    copyType: 'ORIGINAL', // ORIGINAL or XEROX
    remarks: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    if (!file) return Alert.alert('Missing POD', 'Please attach a photo of the signed POD.');

    setLoading(true);
    try {
      // Step 1: Upload image
      setLoadingMessage('Uploading POD image...');
      const uploadRes = await uploadPodDocument(token, {
        uri: file.uri,
        name: file.name || 'pod.jpg',
        type: file.mimeType || 'image/jpeg'
      });

      // Step 2: Submit POD
      setLoadingMessage('Submitting Proof of Delivery...');
      await submitPod(token, {
        tripId: activeTrip._id,
        documentId: uploadRes.documentId,
        receivedDate: form.receivedDate,
        copyType: form.copyType,
        remarks: form.remarks,
        receivedVia: 'DRIVER_APP'
      });

      triggerRefresh();
      navigation.goBack();
      Alert.alert('Success', 'POD submitted successfully.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to submit POD');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <StatusBar style="dark" />
      <VehicleLoader visible={loading} message={loadingMessage} />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" weight="extrabold">Submit POD</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card padding={20} style={{ marginBottom: 16 }}>
          <AppText variant="label" muted style={{ marginBottom: 10 }}>POD PHOTO</AppText>
          
          <Pressable style={styles.imagePicker} onPress={pickImage}>
            {file ? (
              <Image source={{ uri: file.uri }} style={styles.imagePreview} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={32} color={colors.primary} />
                <AppText variant="small" weight="semibold" color={colors.primary} style={{ marginTop: 8 }}>Tap to take photo</AppText>
              </>
            )}
          </Pressable>
          {file && (
            <Pressable onPress={() => setFile(null)} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
              <AppText variant="small" color={colors.error} weight="bold">Remove</AppText>
            </Pressable>
          )}
        </Card>

        <Card padding={20}>
          <AppText variant="label" muted style={{ marginBottom: 16 }}>DELIVERY DETAILS</AppText>
          
          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Copy Type</AppText>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {['ORIGINAL', 'XEROX'].map(type => (
                <Pressable
                  key={type}
                  style={[styles.radioBtn, form.copyType === type && styles.radioBtnActive]}
                  onPress={() => setForm(f => ({ ...f, copyType: type }))}
                >
                  <AppText variant="small" weight="bold" color={form.copyType === type ? colors.white : colors.text}>
                    {type}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Remarks (Optional)</AppText>
            <TextInput
              style={styles.input}
              value={form.remarks}
              onChangeText={(t) => setForm(f => ({ ...f, remarks: t }))}
              placeholder="Any issues or short-supply noted?"
              multiline
              numberOfLines={3}
            />
          </View>

          <Button label="Submit POD" onPress={handleSubmit} size="lg" style={{ marginTop: 16 }} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingBottom: 16, backgroundColor: colors.surface },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22, paddingBottom: 40 },
  imagePicker: {
    height: 160,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  field: { marginBottom: 16 },
  label: { marginBottom: 8, color: colors.textMuted },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
  radioBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  radioBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
