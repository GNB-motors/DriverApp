import React from 'react';
import { View } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

/** Divider — hairline separator. Pass `spacing` for vertical margin. */
export default function Divider({ spacing: gap = spacing.md, color = colors.border, style }) {
  return <View style={[{ height: 1, backgroundColor: color, marginVertical: gap }, style]} />;
}
