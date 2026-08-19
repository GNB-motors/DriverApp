import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';

/**
 * KeyValueTable — a bordered card of label/value rows with hairline dividers.
 * Used by Trip detail summary, Bill detail sheet, Fuel details, etc.
 *
 *   <KeyValueTable>
 *     <KeyValueRow label="Category" value="Other · Tyre air fill" />
 *     <KeyValueRow label="Bill date" value="04 Aug 2026" mono />
 *     <KeyValueRow label="Wallet after confirm" value="₹6,070" mono valueColor={colors.success} />
 *     <KeyValueRow label="Amount claimed" value="₹1,250" mono highlight />
 *   </KeyValueTable>
 *
 * KeyValueRow props: label, value, mono (value uses mono font), valueColor,
 *                    highlight (emphasised footer row), strike (line-through value).
 */
export function KeyValueRow({ label, value, mono = false, valueColor, highlight = false, strike = false }) {
  return (
    <View style={[styles.row, highlight && styles.rowHighlight]}>
      <AppText variant="small" weight={highlight ? 'bold' : 'regular'} color={highlight ? colors.text : colors.textMuted}>
        {label}
      </AppText>
      <AppText
        mono={mono}
        variant={highlight ? 'h3' : 'small'}
        weight={highlight ? 'semibold' : 'medium'}
        color={valueColor || colors.text}
        style={strike ? styles.strike : null}
      >
        {value}
      </AppText>
    </View>
  );
}

export default function KeyValueTable({ children, style }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.table, style]}>
      {rows.map((child, i) => (
        <View key={i}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowHighlight: { backgroundColor: colors.background, paddingVertical: 14 },
  divider: { height: 1, backgroundColor: colors.border },
  strike: { textDecorationLine: 'line-through', color: colors.textMuted },
});
