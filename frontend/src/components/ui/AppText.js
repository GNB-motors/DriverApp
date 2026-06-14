import React from 'react';
import { Text } from 'react-native';
import { colors, typography, bodyFont, monoFont } from '../../theme/tokens';
import { useLanguage } from '../../context/LanguageContext';

/**
 * AppText — the typographic primitive.
 *
 * Picks the correct font family for the active script automatically
 * (Latin → Plus Jakarta Sans, हिन्दी → Hind, বাংলা → Hind Siliguri),
 * unless `mono` is set (Spline Sans Mono — for plates, ₹, litres, odometer).
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
  style,
  children,
  ...rest
}) {
  const { language } = useLanguage();
  const t = typography[variant] || typography.body;
  const w = weight || t.weight;
  const family = mono ? monoFont(w) : bodyFont(language, w);

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
    <Text style={[resolved, style]} {...rest}>
      {children}
    </Text>
  );
}
