import React from 'react';
import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, colors, radius } from './ui';

/**
 * PhotoTaskCard — a required-photo row (captured / pending / analyzing).
 * Matches the upload-photos design: green-tint card when captured (with a
 * Retake action), dashed card when pending (camera + gallery).
 */
export default function PhotoTaskCard({
  title,
  icon,
  type,
  photoUri,
  onCameraPress,
  onGalleryPress,
  capturedText,
  pendingText,
  isLoading,
  analyzingText,
  retakeText,
}) {
  const done = !!photoUri;

  return (
    <View style={[styles.card, done ? styles.cardDone : styles.cardPending]}>
      <View style={styles.iconTile}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>

      <View style={styles.info}>
        <AppText variant="h3" weight="bold">{title}</AppText>
        {isLoading ? (
          <AppText variant="small" weight="semibold" color={colors.primary} style={styles.status}>
            {analyzingText}
          </AppText>
        ) : done ? (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark" size={15} color={colors.validText} />
            <AppText variant="small" weight="semibold" color={colors.validText}>{capturedText}</AppText>
          </View>
        ) : (
          <AppText variant="small" muted style={styles.status}>{pendingText}</AppText>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ paddingRight: 8 }} />
      ) : done ? (
        <Pressable
          style={styles.retake}
          onPress={() => onCameraPress(type)}
          accessibilityLabel={`Retake ${type} photo`}
        >
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={20} color={colors.white} />
          </View>
          {retakeText ? <AppText variant="caption" weight="bold" color={colors.primary}>{retakeText}</AppText> : null}
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={styles.cameraBtn}
            onPress={() => onCameraPress(type)}
            accessibilityLabel={`Take ${type} photo`}
          >
            <Ionicons name="camera" size={22} color={colors.white} />
          </Pressable>
          <Pressable
            style={styles.galleryBtn}
            onPress={() => onGalleryPress(type)}
            accessibilityLabel={`Upload ${type} from gallery`}
          >
            <Ionicons name="image-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  cardDone: { backgroundColor: colors.validBg, borderWidth: 1.5, borderColor: '#9FDCC0' },
  cardPending: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: '#C9D4D0', borderStyle: 'dashed' },
  iconTile: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  status: { marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  retake: { alignItems: 'center', gap: 4 },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cameraBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  galleryBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
