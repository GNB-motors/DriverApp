import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme/tokens';

/**
 * StepProgress — horizontal progress indicator, two variants.
 *
 *   // segments: a flow's step bar (Fuel step 1 of 2)
 *   <StepProgress variant="segments" total={2} current={1} />
 *
 *   // dots: node-and-connector progress (Home active-trip, 8 stages)
 *   <StepProgress variant="dots" total={8} current={3} />
 *
 * Props: total, current (number completed/active), variant ('segments'|'dots'),
 *        color, trackColor, onPrimary (use light colors on a gradient header), style.
 */
export default function StepProgress({
  total = 0,
  current = 0,
  variant = 'segments',
  color = colors.primary,
  trackColor = colors.border,
  onPrimary = false,
  style,
}) {
  const fill = onPrimary ? colors.white : color;
  const track = onPrimary ? 'rgba(255,255,255,0.28)' : trackColor;

  if (variant === 'dots') {
    const nodes = [];
    for (let i = 0; i < total; i++) {
      const done = i < current;
      if (i > 0) {
        nodes.push(
          <View key={`c${i}`} style={[styles.connector, { backgroundColor: i <= current - 1 ? fill : track }]} />,
        );
      }
      nodes.push(
        <View key={`n${i}`} style={[styles.node, { backgroundColor: done ? fill : track }]} />,
      );
    }
    return <View style={[styles.dotsRow, style]}>{nodes}</View>;
  }

  // segments
  return (
    <View style={[styles.segRow, style]}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: i < current ? fill : track }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segRow: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 6, borderRadius: radius.full },
  dotsRow: { flexDirection: 'row', alignItems: 'center' },
  node: { width: 11, height: 11, borderRadius: radius.full },
  connector: { flex: 1, height: 3 },
});
