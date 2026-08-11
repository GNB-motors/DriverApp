import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import MoneyText from './MoneyText';
import { colors, radius } from '../../theme/tokens';

/**
 * AgeingBar — receivables split by age bucket, as a proportional stacked bar
 * plus a legend. Mirrors the web's `Erp/AgeingBar`.
 *
 * Colour encodes severity, not category: the older the money, the hotter the
 * band. That is the whole point of the chart, so the ramp is fixed rather than
 * taken from a palette.
 *
 *   <AgeingBar buckets={[{ bucket: '0-30', label: '0–30 days', amount: 1840000, count: 22 }]} />
 */
const TONE = {
  '0-30': colors.success,
  '31-60': colors.warning,
  '61-90': colors.accent,
  '90+': colors.danger,
};

const fallback = [colors.success, colors.warning, colors.accent, colors.danger];

export default function AgeingBar({ buckets = [], style }) {
  const rows = buckets.filter((b) => Number(b?.amount) > 0);
  const total = rows.reduce((sum, b) => sum + Number(b.amount || 0), 0);

  if (!total) {
    return (
      <View style={style}>
        <AppText variant="small" muted>Nothing outstanding.</AppText>
      </View>
    );
  }

  return (
    <View style={style}>
      <View style={styles.bar}>
        {rows.map((b, i) => (
          <View
            key={b.bucket ?? i}
            style={{
              flex: Number(b.amount),
              backgroundColor: TONE[b.bucket] || fallback[i % fallback.length],
            }}
          />
        ))}
      </View>

      <View style={styles.legend}>
        {rows.map((b, i) => {
          const share = Math.round((Number(b.amount) / total) * 100);
          return (
            <View key={b.bucket ?? i} style={styles.row}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: TONE[b.bucket] || fallback[i % fallback.length] },
                ]}
              />
              <AppText variant="small" weight="medium" style={styles.rowLabel} numberOfLines={1}>
                {b.label || b.bucket}
              </AppText>
              {b.count != null && (
                <AppText variant="caption" muted style={styles.count}>
                  {b.count}
                </AppText>
              )}
              <AppText variant="caption" muted style={styles.share}>
                {share}%
              </AppText>
              <MoneyText amount={b.amount} compact variant="small" weight="bold" />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  legend: { marginTop: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  swatch: { width: 9, height: 9, borderRadius: radius.full },
  rowLabel: { flex: 1 },
  count: { minWidth: 26, textAlign: 'right' },
  share: { minWidth: 34, textAlign: 'right' },
});
