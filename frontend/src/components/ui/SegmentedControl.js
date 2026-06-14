import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';

/**
 * SegmentedControl — single-choice pills (the Full / Partial toggle).
 *
 *   <SegmentedControl
 *     options={[{ label: 'Full', value: 'full' }, { label: 'Partial', value: 'partial' }]}
 *     value={mode}
 *     onChange={setMode}
 *   />
 *
 * Options accept either string[] or {label, value}[].
 */
export default function SegmentedControl({ options = [], value, onChange, style }) {
  const items = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));

  return (
    <View style={[styles.row, style]}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={String(item.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange?.(item.value)}
            style={[styles.segment, active ? styles.segmentActive : styles.segmentIdle]}
          >
            <AppText
              variant="bodyStrong"
              weight="bold"
              color={active ? colors.white : colors.textMuted}
              center
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentIdle: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
