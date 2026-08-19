import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme/tokens';

/**
 * PinDots — the filled/empty dot indicator for PIN entry (E5 Set PIN, unlock).
 *
 *   <PinDots filled={2} length={4} />
 *
 * Props: filled (number entered), length (default 4), onPrimary (light on a
 * gradient background), style.
 */
export default function PinDots({ filled = 0, length = 4, onPrimary = false, style }) {
  const fillColor = onPrimary ? colors.white : colors.primary;
  const emptyColor = onPrimary ? 'rgba(255,255,255,0.32)' : colors.border;
  return (
    <View style={[styles.row, style]}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: i < filled ? fillColor : emptyColor }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  dot: { width: 16, height: 16, borderRadius: radius.full },
});
