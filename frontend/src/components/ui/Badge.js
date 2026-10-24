import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';

/**
 * Badge — status pill. Use a preset tone or pass custom bg/fg.
 *
 *   <Badge tone="valid" label="Valid" />
 *   <Badge tone="expired" label="Expired" />
 *   <Badge tone="onDuty" dot label="On Duty" />
 *
 * Tones: valid | expired | pending | info | neutral | onDuty.
 */
const TONES = {
  valid: { bg: colors.validBg, fg: colors.validText },
  expired: { bg: colors.expiredBg, fg: colors.expiredText },
  pending: { bg: colors.pendingBg, fg: colors.pendingText },
  info: { bg: colors.infoBg, fg: colors.infoText },
  inTransit: { bg: colors.infoBg, fg: colors.infoText, dotColor: colors.infoBlue },
  neutral: { bg: colors.background, fg: colors.textMuted },
  onDuty: { bg: colors.tealTint, fg: colors.primary, dotColor: colors.success },
};

export default function Badge({ tone = 'info', label, dot = false, bg, fg, style }) {
  const t = TONES[tone] || TONES.info;
  const background = bg || t.bg;
  const foreground = fg || t.fg;

  return (
    <View style={[styles.pill, { backgroundColor: background }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: t.dotColor || foreground }]} /> : null}
      <AppText variant="caption" weight="bold" color={foreground} numberOfLines={1} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: radius.full },
  text: { fontSize: 12, letterSpacing: 0.2, textTransform: 'none' },
});
