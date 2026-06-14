import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/tokens';
import AppText from './AppText';

/**
 * Chip — outlined pill with optional leading icon. Static or selectable.
 *
 *   <Chip icon="car-outline" label="MH 12 AB 1234" mono />
 *   <Chip label="Diesel" color="#64748B" />
 *   <Chip label="Full" selected onPress={...} />
 *
 * Props: label, icon, color (accent — border/text/icon), mono, selected, onPress.
 */
export default function Chip({ label, icon, color = colors.primary, mono = false, selected = false, onPress, style }) {
  const tint = color + '18'; // ~9% alpha fill
  const body = (
    <View
      style={[
        styles.chip,
        { borderColor: color, backgroundColor: selected ? tint : colors.surface },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={13} color={color} /> : null}
      <AppText variant="caption" weight="bold" mono={mono} color={color} style={styles.text}>
        {label}
      </AppText>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.7 }}>
        {body}
      </Pressable>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, letterSpacing: 0.2, textTransform: 'none' },
});
