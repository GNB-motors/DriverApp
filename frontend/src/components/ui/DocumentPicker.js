import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoDocumentPicker from 'expo-document-picker';
import AppText from './AppText';
import { colors, radius } from './index';

export default function DocumentPicker({ label = 'Upload Document', onDocumentSelected, style }) {
  const handlePress = async () => {
    try {
      const result = await ExpoDocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onDocumentSelected(result.assets[0]);
      }
    } catch (err) {
      console.warn('Error picking document', err);
    }
  };

  return (
    <Pressable style={[styles.container, style]} onPress={handlePress}>
      <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
      <AppText variant="bodyStrong" weight="semibold" color={colors.primary} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.tealTint,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  label: {
    marginLeft: 8,
  },
});
