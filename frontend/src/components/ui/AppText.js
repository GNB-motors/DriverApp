import React from 'react';
import { Text } from 'react-native';
import { colors, typography, bodyFont, headingFont, monoFont } from '../../theme/tokens';
import { useLanguage } from '../../context/LanguageContext';

/**
 * AppText — the typographic primitive.
 *
 * Picks the correct font family for the active script automatically
 * (Latin → Inter for body / DM Sans for headings, हिन्दी → Hind, বাংলা → Hind Siliguri),
 * unless `mono` is set (DM Mono — for plates, ₹, litres, odometer).
 *
 *   <AppText variant="h2">Section</AppText>
 *   <AppText mono weight="semibold">MH 12 AB 1234</AppText>
 *   <AppText variant="label" color={colors.textMuted}>Vehicle</AppText>
 *
 * Props:
 *   variant   one of typography keys (display|h1|h2|h3|body|bodyStrong|small|label|caption)
 *   weight    override weight key (regular|medium|semibold|bold|extrabold)
 *   mono      use the monospace family (numeric/ID data)
 *   color     text color (defaults to colors.text)
 *   center    center-align
 *   muted     shorthand for color={colors.textMuted}
 */
export default function AppText({
  variant = 'body',
  weight,
  mono = false,
  color,
  center = false,
  muted = false,
  maxFontSizeMultiplier = 1.4,
  style,
  children,
  ...rest
}) {
  const { language } = useLanguage();
  const t = typography[variant] || typography.body;
  const w = weight || t.weight;
  const isHeading = variant === 'display' || variant === 'h1' || variant === 'h2' || variant === 'h3';
  const family = mono
    ? monoFont(w)
    : isHeading
    ? headingFont(language, w)
    : bodyFont(language, w);

  const resolved = {
    fontFamily: family,
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
    color: color || (muted ? colors.textMuted : colors.text),
    ...(t.uppercase ? { textTransform: 'uppercase' } : null),
    ...(center ? { textAlign: 'center' } : null),
  };

  return (
    <Text style={[resolved, style]} maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest}>
      {children}
    </Text>
  );
}
