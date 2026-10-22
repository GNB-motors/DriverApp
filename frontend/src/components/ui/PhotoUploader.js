import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';
import Badge from './Badge';

/**
 * PhotoUploader — the attach-a-photo card used by Add bill, Consignment note,
 * POD, and repair logs. Handles a single photo or a multi-page set.
 *
 *   // single required bill photo
 *   <PhotoUploader
 *     title="Bill photo" required
 *     photos={photo ? [{ uri: photo.uri, name: 'IMG_2381', quality: 'ok' }] : []}
 *     onCapture={openCamera} onPick={openGallery} onRemove={() => setPhoto(null)}
 *     note="Amount read from photo"
 *   />
 *
 *   // multi-page (Consignment note)
 *   <PhotoUploader title="Note pages" max={3} photos={pages} onCapture={…} onAddPage={…} onRemove={remove} />
 *
 * Props: title, required, photos ([{uri,name,quality:'ok'|'warn'}]), max (default 1),
 *        onCapture, onPick, onAddPage, onRemove(index), note, style.
 */
export default function PhotoUploader({
  title = 'Photo',
  required = false,
  photos = [],
  max = 1,
  onCapture,
  onPick,
  onAddPage,
  onRemove,
  note,
  style,
}) {
  const hasPhotos = photos.length > 0;
  const canAddMore = photos.length < max;
  const multi = max > 1;

  return (
    <View style={[styles.card, hasPhotos && styles.cardActive, style]}>
      <View style={styles.header}>
        <AppText variant="bodyStrong" weight="bold">
          {title}
        </AppText>
        {required ? <Badge tone="info" label="Required" /> : null}
        {multi ? (
          <AppText variant="caption" mono muted style={styles.count}>
            {photos.length} of {max}
          </AppText>
        ) : null}
      </View>

      {hasPhotos ? (
        <View style={styles.thumbs}>
          {photos.map((p, i) => (
            <View key={i} style={styles.thumb}>
              {p.uri ? (
                <Image source={{ uri: p.uri }} style={styles.thumbImg} />
              ) : (
                <Ionicons name="document-text-outline" size={24} color={colors.textMuted} />
              )}
              {onRemove ? (
                <Pressable onPress={() => onRemove(i)} hitSlop={6} style={styles.remove} accessibilityLabel="Remove photo">
                  <Ionicons name="close" size={12} color={colors.white} />
                </Pressable>
              ) : null}
              {p.quality ? (
                <View style={[styles.qualityStrip, { backgroundColor: p.quality === 'ok' ? colors.success : colors.warning }]}>
                  <AppText variant="caption" weight="bold" color={colors.white}>
                    {p.quality === 'ok' ? 'Clear' : 'Check edges'}
                  </AppText>
                </View>
              ) : null}
            </View>
          ))}
          {multi && canAddMore ? (
            <Pressable onPress={onAddPage || onCapture} style={styles.addTile} accessibilityLabel="Add page">
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
              <AppText variant="caption" weight="bold" color={colors.primary}>
                Add page
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {(!hasPhotos || (!multi && hasPhotos)) ? (
        <View style={styles.actions}>
          <Pressable onPress={onCapture} style={[styles.actionBtn, styles.actionPrimary]} accessibilityRole="button">
            <Ionicons name="camera" size={18} color={colors.white} />
            <AppText variant="small" weight="bold" color={colors.white}>
              {hasPhotos ? 'Retake' : 'Camera'}
            </AppText>
          </Pressable>
          {onPick ? (
            <Pressable onPress={onPick} style={[styles.actionBtn, styles.actionTint]} accessibilityRole="button">
              <Ionicons name="image" size={18} color={colors.primary} />
              <AppText variant="small" weight="bold" color={colors.primary}>
                Gallery
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {note ? (
        <View style={styles.noteRow}>
          <View style={styles.noteDot} />
          <AppText variant="caption" muted>
            {note}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 12,
  },
  cardActive: { borderColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: { marginLeft: 'auto' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: {
    width: 92,
    height: 112,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    alignItems: 'center',
  },
  addTile: {
    width: 92,
    height: 112,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionTint: { backgroundColor: colors.tealTint },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteDot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.accent },
});
