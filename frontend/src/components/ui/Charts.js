import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';

/**
 * Pure-RN charts (no dependencies) for the fuel-trend and spend-by-category cards.
 */

/**
 * BarChart — vertical bars scaled to the max value, with axis labels.
 *
 *   <BarChart
 *     data={[{ label: 'Mar', value: 52 }, … , { label: 'Aug', value: 88 }]}
 *     highlightLast
 *   />
 *
 * Props: data ([{label, value}]), height, color, highlightLast, style.
 */
export function BarChart({ data = [], height = 120, color = colors.primary, highlightLast = true, style }) {
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  return (
    <View style={[styles.barChart, { height: height + 20 }, style]}>
      {data.map((d, i) => {
        const isLast = highlightLast && i === data.length - 1;
        const h = Math.max(3, Math.round(((Number(d.value) || 0) / max) * height));
        return (
          <View key={i} style={styles.barCol}>
            <View
              style={[
                styles.bar,
                { height: h, backgroundColor: isLast ? color : color + '66' },
              ]}
            />
            <AppText variant="caption" mono muted style={styles.barLabel}>
              {d.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

/**
 * ProgressBar — a labeled horizontal bar row (spend-by-category).
 *
 *   <ProgressBar label="Toll" percent={72} value="₹4,220" />
 *
 * Props: label, percent (0–100), value (right-aligned mono), color, style.
 */
export function ProgressBar({ label, percent = 0, value, color = colors.primary, style }) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <View style={[styles.progRow, style]}>
      <AppText variant="small" style={styles.progLabel} numberOfLines={1}>
        {label}
      </AppText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      {value != null ? (
        <AppText variant="small" mono style={styles.progValue}>
          {value}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '70%', borderRadius: radius.sm },
  barLabel: { marginTop: 2 },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progLabel: { width: 56 },
  track: {
    flex: 1,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: 7, borderRadius: radius.full },
  progValue: { width: 60, textAlign: 'right' },
});
