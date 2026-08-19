import React from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../theme/tokens';

/**
 * BottomSheet — a modal sheet that slides up over a scrim. Used by the Language
 * picker (light scrim) and SOS options (dark scrim).
 *
 *   <BottomSheet visible={open} onClose={() => setOpen(false)}>
 *     …sheet content…
 *   </BottomSheet>
 *
 *   <BottomSheet visible={open} onClose={close} scrim="dark">…</BottomSheet>
 *
 * Props: visible, onClose, scrim ('light' | 'dark'), showHandle (default true),
 *        children, style (applied to the sheet surface).
 */
export default function BottomSheet({ visible, onClose, scrim = 'light', showHandle = true, children, style }) {
  const insets = useSafeAreaInsets();
  const scrimColor = scrim === 'dark' ? 'rgba(18,18,20,0.66)' : 'rgba(18,18,20,0.48)';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable style={[styles.scrim, { backgroundColor: scrimColor }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }, style]}>
          {showHandle ? <View style={styles.handle} /> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    gap: spacing.md,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: '#D8D8DE',
    alignSelf: 'center',
    marginBottom: 4,
  },
});
