import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';

/**
 * NumericKeypad — the custom 3×4 keypad for phone / OTP / PIN / amount entry.
 *
 *   <NumericKeypad onKeyPress={(d) => setValue(v => v + d)} onBackspace={() => setValue(v => v.slice(0, -1))} />
 *   <NumericKeypad decimal onKeyPress={…} onBackspace={…} />
 *
 * Props: onKeyPress (digit string), onBackspace, decimal (show "." key),
 *        keySize, style.
 */
export default function NumericKeypad({ onKeyPress, onBackspace, decimal = false, keySize = 48, style }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimal ? '.' : '', '0', 'back'];

  return (
    <View style={[styles.grid, style]}>
      {keys.map((k, i) => {
        if (k === '') return <View key={i} style={[styles.key, styles.empty]} />;
        const isBack = k === 'back';
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={isBack ? 'Backspace' : k}
            onPress={() => (isBack ? onBackspace?.() : onKeyPress?.(k))}
            style={({ pressed }) => [
              styles.key,
              { height: keySize },
              isBack ? styles.backKey : styles.digitKey,
              pressed && styles.pressed,
            ]}
          >
            {isBack ? (
              <Ionicons name="backspace-outline" size={22} color={colors.text} />
            ) : (
              <AppText mono variant="h2" weight="semibold">
                {k}
              </AppText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  key: {
    width: '31%',
    flexGrow: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitKey: { backgroundColor: colors.surface },
  backKey: { backgroundColor: colors.background },
  empty: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.6 },
});
