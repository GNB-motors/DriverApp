import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/tokens';
import AppText from './AppText';

/**
 * EmptyState — shown when a real API call returns nothing (or errors).
 *
 *   <EmptyState icon="cube-outline" title="No trips yet" />
 *   <EmptyState error title="Couldn't load" message="Pull to retry." />
 */
export default function EmptyState({ icon = 'file-tray-outline', title = 'Nothing here yet', message, error = false, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.icon}>
        <Ionicons name={error ? 'cloud-offline-outline' : icon} size={30} color={error ? colors.error : colors.textMuted} />
      </View>
      <AppText variant="bodyStrong" weight="bold" center>{title}</AppText>
      {message ? <AppText variant="small" muted center style={styles.msg}>{message}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 6 },
  icon: {
    width: 72, height: 72, borderRadius: radius.xl, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  msg: { marginTop: 2, maxWidth: 280 },
});
