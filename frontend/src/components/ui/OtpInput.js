import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme/tokens';
import AppText from './AppText';

/**
 * OtpInput — a row of N cells showing the entered code. Presentational: pair it
 * with NumericKeypad (or a hidden TextInput) that owns the `value` state.
 *
 *   <OtpInput value={code} length={6} />
 *
 * The first empty cell shows a focus ring/caret. Props: value (string),
 * length (default 6), style.
 */
export default function OtpInput({ value = '', length = 6, style }) {
  const chars = String(value).slice(0, length).split('');
  const focusedIndex = Math.min(chars.length, length - 1);

  return (
    <View style={[styles.row, style]}>
      {Array.from({ length }).map((_, i) => {
        const filled = i < chars.length;
        const focused = i === focusedIndex && !filled;
        return (
          <View key={i} style={[styles.cell, focused && styles.cellFocused, filled && styles.cellFilled]}>
            {filled ? (
              <AppText mono variant="h2" weight="semibold">
                {chars[i]}
              </AppText>
            ) : focused ? (
              <View style={styles.caret} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  cell: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: { borderColor: colors.border },
  cellFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  caret: { width: 2, height: 22, backgroundColor: colors.primary, borderRadius: 1 },
});
