import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/tokens';
import AppText from './AppText';
import Button from './Button';

/**
 * EmptyState — shown when a real API call returns nothing (or errors).
 *
 *   <EmptyState icon="cube-outline" title="No trips yet" />
 *   <EmptyState error title="Couldn't load" message="Check your connection." onAction={refetch} />
 *
 * Pass onAction (+ optional actionLabel) to render a retry button — used for the
 * error state so a failure offers a way out instead of looking like emptiness.
 */
export default function EmptyState({ icon = 'file-tray-outline', title = 'Nothing here yet', message, error = false, actionLabel = 'Try again', onAction, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.icon}>
        <Ionicons name={error ? 'cloud-offline-outline' : icon} size={30} color={error ? colors.error : colors.textMuted} />
      </View>
      <AppText variant="bodyStrong" weight="bold" center>{title}</AppText>
      {message ? <AppText variant="small" muted center style={styles.msg}>{message}</AppText> : null}
      {onAction ? (
        <Button variant="secondary" size="sm" label={actionLabel} onPress={onAction} fullWidth={false} style={styles.action} />
      ) : null}
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
  action: { marginTop: 12 },
});
