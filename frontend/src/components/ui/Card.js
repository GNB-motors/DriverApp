import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, elevation } from '../../theme/tokens';

/**
 * Card — surface container with consistent radius / elevation.
 *
 *   <Card>…</Card>
 *   <Card elevated="md" onPress={…} />
 *   <Card variant="tinted" />   // teal-tint background, no border
 *
 * Props: variant (surface|tinted|outline), elevated (none|sm|md|lg),
 *        padding (number), onPress, style.
 */
export default function Card({
  variant = 'surface',
  elevated = 'sm',
  padding = spacing.md,
  onPress,
  style,
  children,
  ...rest
}) {
  const variantStyle =
    variant === 'tinted'
      ? { backgroundColor: colors.tealTint }
      : variant === 'outline'
      ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
      : { backgroundColor: colors.surface };

  const composed = [
    styles.card,
    variantStyle,
    elevation[elevated] || elevation.sm,
    { padding },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [composed, pressed && styles.pressed]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={composed} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg },
  pressed: { opacity: 0.9 },
});
