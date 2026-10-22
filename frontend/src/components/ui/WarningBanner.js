import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';

/**
 * WarningBanner — inline notice with a leading icon and optional action.
 * Four tones matching the Nova status vocabulary.
 *
 *   <WarningBanner tone="warning" message="Licence expires in 24 days." actionLabel="Open documents" onAction={…} />
 *   <WarningBanner tone="info" message="Owner confirms before it reaches your wallet." />
 *   <WarningBanner tone="error" title="Bill rejected" message="Photo not readable." />
 *
 * Props: tone ('warning' | 'info' | 'error' | 'success'), icon (Ionicons override),
 *        title, message, actionLabel, onAction, style.
 */
const TONES = {
  warning: { bg: colors.pendingBg, fg: colors.pendingText, border: 'rgba(197,98,0,0.16)', icon: 'warning-outline' },
  info: { bg: colors.infoBg, fg: colors.infoText, border: 'rgba(38,102,184,0.16)', icon: 'information-circle-outline' },
  error: { bg: colors.expiredBg, fg: colors.expiredText, border: 'rgba(187,38,38,0.16)', icon: 'close-circle-outline' },
  success: { bg: colors.validBg, fg: colors.validText, border: 'rgba(24,122,50,0.16)', icon: 'checkmark-circle-outline' },
};

export default function WarningBanner({ tone = 'warning', icon, title, message, actionLabel, onAction, style }) {
  const t = TONES[tone] || TONES.warning;
  return (
    <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      <Ionicons name={icon || t.icon} size={18} color={t.fg} style={styles.icon} />
      <View style={styles.body}>
        {title ? (
          <AppText variant="small" weight="bold" color={t.fg}>
            {title}
          </AppText>
        ) : null}
        {message ? (
          <AppText variant="small" color={t.fg} style={title ? styles.msgWithTitle : null}>
            {message}
          </AppText>
        ) : null}
        {actionLabel ? (
          <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" style={styles.action}>
            <AppText variant="small" weight="bold" color={t.fg}>
              {actionLabel} →
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: 2 },
  msgWithTitle: { opacity: 0.9 },
  action: { marginTop: 6, alignSelf: 'flex-start' },
});
