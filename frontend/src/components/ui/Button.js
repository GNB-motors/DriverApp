import React from 'react';
import { Pressable, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, elevation, TOUCH_TARGET } from '../../theme/tokens';
import AppText from './AppText';

/**
 * Button — primary | secondary | ghost | danger, in sm | md | lg.
 *
 *   <Button label="Primary action" onPress={...} />
 *   <Button variant="secondary" icon="add" label="Add" />
 *   <Button variant="danger" loading label="Deleting…" />
 *
 * Props: variant, size, label, icon (Ionicons, left), iconRight,
 *        loading, disabled, fullWidth, onPress, style.
 */
const SIZES = {
  sm: { minHeight: TOUCH_TARGET, paddingV: 10, paddingH: 16, text: 'small', icon: 16, radius: radius.md },
  md: { minHeight: 52, paddingV: 14, paddingH: 20, text: 'bodyStrong', icon: 18, radius: radius.lg },
  lg: { minHeight: 58, paddingV: 17, paddingH: 24, text: 'h3', icon: 20, radius: radius.lg },
};

const VARIANTS = {
  primary: { bg: colors.primary, fg: colors.white, border: 'transparent', shadow: elevation.md },
  secondary: { bg: colors.surface, fg: colors.primary, border: '#C7D0F7', shadow: elevation.none },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent', shadow: elevation.none },
  danger: { bg: colors.errorStrong, fg: colors.white, border: 'transparent', shadow: elevation.md },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  label,
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  onPress,
  style,
  children,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: s.minHeight,
          paddingVertical: s.paddingV,
          paddingHorizontal: s.paddingH,
          borderRadius: s.radius,
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border === 'transparent' ? 0 : 1.5,
        },
        variant === 'primary' || variant === 'danger' ? v.shadow : null,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && (variant === 'primary' || variant === 'danger' ? styles.disabledFill : styles.disabledDim),
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={s.icon} color={v.fg} /> : null}
          {children ?? (
            <AppText variant={s.text} weight="bold" color={v.fg} center>
              {label}
            </AppText>
          )}
          {iconRight ? <Ionicons name={iconRight} size={s.icon} color={v.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  disabledFill: {
    backgroundColor: '#D0D8D8',
    borderColor: '#D0D8D8',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledDim: { opacity: 0.45 },
});
