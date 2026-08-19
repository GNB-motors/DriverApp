import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, elevation } from '../../theme/tokens';
import AppText from './AppText';
import Button from './Button';

/**
 * AlertCard — a notification row for the Alerts screen.
 * A colored icon tile + title + relative time + body, with an optional inline CTA.
 *
 *   <AlertCard
 *     tone="error" icon="close-circle" title="Bill rejected" time="2 h"
 *     message="Food · ₹210. Photo is blurred."
 *     actionLabel="Re-submit bill" onAction={…}
 *   />
 *   <AlertCard tone="success" icon="checkmark" title="Toll bill confirmed · +₹340" time="03 Aug" compact />
 *
 * Props: tone ('error'|'warning'|'success'|'info'), icon, title, time, message,
 *        actionLabel, onAction, compact (read/earlier style), onPress, style.
 */
const TONES = {
  error: { bg: colors.expiredBg, fg: colors.expiredText, border: 'rgba(187,38,38,0.20)' },
  warning: { bg: colors.pendingBg, fg: colors.pendingText, border: 'rgba(197,98,0,0.20)' },
  success: { bg: colors.validBg, fg: colors.validText, border: colors.border },
  info: { bg: colors.infoBg, fg: colors.infoText, border: colors.border },
};

export default function AlertCard({
  tone = 'info',
  icon = 'notifications',
  title,
  time,
  message,
  actionLabel,
  onAction,
  compact = false,
  onPress,
  style,
}) {
  const t = TONES[tone] || TONES.info;
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.card,
        compact ? styles.compact : { borderColor: t.border },
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconTile, compact ? styles.iconTileSm : null, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={compact ? 16 : 20} color={t.fg} />
        </View>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <AppText variant={compact ? 'small' : 'bodyStrong'} weight="bold" style={styles.title}>
              {title}
            </AppText>
            {time ? (
              <AppText variant="caption" mono muted>
                {time}
              </AppText>
            ) : null}
          </View>
          {message ? (
            <AppText variant="small" muted numberOfLines={compact ? 1 : 3}>
              {message}
            </AppText>
          ) : null}
        </View>
      </View>

      {actionLabel && !compact ? (
        <Button label={actionLabel} size="sm" onPress={onAction} fullWidth={false} style={styles.action} />
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
    ...elevation.sm,
  },
  compact: {
    borderColor: 'transparent',
    ...elevation.none,
  },
  header: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileSm: { width: 34, height: 34, borderRadius: radius.full },
  titleBlock: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1 },
  action: { alignSelf: 'flex-start', marginLeft: 52 },
});
