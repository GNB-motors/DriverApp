/**
 * Legacy theme object — kept for backwards compatibility with screens that
 * still import `theme`. Values are remapped onto the Highway Sahayak design
 * tokens (see theme/tokens.js), so existing references shift to the new
 * palette automatically. New code should import from theme/tokens directly.
 */
import { colors, spacing, radius } from './tokens';

export const theme = {
  colors: {
    primary: colors.primary,
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    background: colors.surface,
    surface: colors.background,
    textPrimary: colors.text,
    textSecondary: colors.textMuted,
    border: colors.border,
  },
  typography: {
    large: { fontSize: 24, fontWeight: 'bold' },
    medium: { fontSize: 18, fontWeight: '600' },
    normal: { fontSize: 16, fontWeight: '400' },
    small: { fontSize: 14, fontWeight: '400' },
  },
  spacing: {
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
  },
  components: {
    buttonHeight: 52,
    borderRadius: radius.sm,
  },
};
