import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, elevation } from '../../theme/tokens';
import AppText from './AppText';

/**
 * SegmentedControl — single-choice pills.
 *
 *   // solid (default): active segment fills with primary
 *   <SegmentedControl options={['Full', 'Partial']} value={mode} onChange={setMode} />
 *
 *   // pill: rounded track with a white active pill (Wallet Bills/Ledger, "Paid by")
 *   <SegmentedControl
 *     variant="pill"
 *     options={[{ label: 'Bills', value: 'bills', badge: '1' }, { label: 'Ledger', value: 'ledger' }]}
 *     value={tab}
 *     onChange={setTab}
 *   />
 *
 * Options accept string[] or { label, value, badge }[].
 * Props: options, value, onChange, variant ('solid' | 'pill'), style.
 */
export default function SegmentedControl({ options = [], value, onChange, variant = 'solid', style }) {
  const items = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
  const pill = variant === 'pill';

  return (
    <View style={[pill ? styles.trackPill : styles.row, style]}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={String(item.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange?.(item.value)}
            style={[
              pill ? styles.segmentPill : styles.segment,
              pill
                ? active && styles.segmentPillActive
                : active
                ? styles.segmentActive
                : styles.segmentIdle,
            ]}
          >
            <AppText
              variant="bodyStrong"
              weight="bold"
              color={pill ? (active ? colors.text : colors.textMuted) : active ? colors.white : colors.textMuted}
              center
            >
              {item.label}
            </AppText>
            {item.badge != null ? (
              <View style={styles.badge}>
                <AppText variant="caption" weight="bold" mono color={colors.pendingText}>
                  {String(item.badge)}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // solid
  row: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
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
  // pill
  trackPill: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.full,
    backgroundColor: '#E9E9ED',
  },
  segmentPill: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentPillActive: {
    backgroundColor: colors.surface,
    ...elevation.sm,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.pendingBg,
  },
});
