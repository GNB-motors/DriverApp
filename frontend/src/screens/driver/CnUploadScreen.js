/**
 * CnUploadScreen.js
 *
 * Driver interface to upload a Bilty (Consignment Note).
 * Step 1: Pick image -> uploadBiltyDocument -> receive documentId
 * Step 2: Fill details -> submitConsignment -> trigger ErpContext refresh
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useErp } from '../../context/ErpContext';
import { useAuth } from '../../context/AuthContext';
import { uploadBiltyDocument, submitConsignment } from '../../services/erpApi';
import { AppText, Button, Card, colors, spacing, radius } from '../../components/ui';
import { TextInput } from 'react-native';
import VehicleLoader from '../../components/ui/VehicleLoader';

export default function CnUploadScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { activeTrip, triggerRefresh } = useErp();
  
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    cnNumber: '',
    cnDate: new Date().toISOString().split('T')[0],
    loadedQty: '',
    qtyUnit: 'TONS',
    sealNumbers: '',
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
    if (!file) return Alert.alert('Missing Bilty', 'Please attach a photo of the bilty.');
    if (!form.cnNumber || !form.loadedQty) return Alert.alert('Missing Details', 'Please fill the CN number and loaded quantity.');

    setLoading(true);
    try {
      // Step 1: Upload image
      setLoadingMessage('Uploading Bilty image...');
      const uploadRes = await uploadBiltyDocument(token, {
        uri: file.uri,
        name: file.name || 'bilty.jpg',
        type: file.mimeType || 'image/jpeg'
      });

      // Step 2: Submit CN
      setLoadingMessage('Submitting Consignment...');
      await submitConsignment(token, {
        tripId: activeTrip._id,
        documentId: uploadRes.documentId,
        cnNumber: form.cnNumber,
        cnDate: form.cnDate,
        loadedQty: Number(form.loadedQty),
        qtyUnit: form.qtyUnit,
        sealNumbers: form.sealNumbers,
      });

      triggerRefresh();
      navigation.goBack();
      Alert.alert('Success', 'Bilty uploaded successfully.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to submit CN');
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
        <AppText variant="h2" weight="extrabold">Upload Bilty</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card padding={20} style={{ marginBottom: 16 }}>
          <AppText variant="label" muted style={{ marginBottom: 10 }}>BILTY PHOTO</AppText>
          
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
          <AppText variant="label" muted style={{ marginBottom: 16 }}>CONSIGNMENT DETAILS</AppText>
          
          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>CN Number</AppText>
            <TextInput
              style={styles.input}
              value={form.cnNumber}
              onChangeText={(t) => setForm(f => ({ ...f, cnNumber: t }))}
              placeholder="e.g. CN-10294"
            />
          </View>

          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Loaded Qty (Tons)</AppText>
            <TextInput
              style={styles.input}
              value={form.loadedQty}
              onChangeText={(t) => setForm(f => ({ ...f, loadedQty: t }))}
              keyboardType="decimal-pad"
              placeholder="e.g. 24.5"
            />
          </View>

          <View style={styles.field}>
            <AppText variant="small" weight="semibold" style={styles.label}>Seal Numbers (Optional)</AppText>
            <TextInput
              style={styles.input}
              value={form.sealNumbers}
              onChangeText={(t) => setForm(f => ({ ...f, sealNumbers: t }))}
              placeholder="e.g. SL-001, SL-002"
            />
          </View>

          <Button label="Submit Bilty" onPress={handleSubmit} size="lg" style={{ marginTop: 16 }} />
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
  },
});
