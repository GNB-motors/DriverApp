import React from 'react';
import AppText from './AppText';
import { colors } from '../../theme/tokens';

/**
 * MoneyText — one place that knows how rupees are written in this app.
 *
 * Screens were formatting money four different ways (`toLocaleString('en-IN')`,
 * bare `toLocaleString()`, hand-written "₹4.2L", and raw numbers), so the same
 * amount read differently on two screens. Always render currency through this.
 *
 *   <MoneyText amount={1840000} />              → ₹18,40,000
 *   <MoneyText amount={1840000} compact />      → ₹18.4L
 *   <MoneyText amount={-2400} signed />         → −₹2,400  (in danger red)
 *
 * `null`/`undefined` renders an em dash rather than "₹NaN".
 */
export default function MoneyText({
  amount,
  compact = false,
  signed = false,
  variant = 'body',
  weight = 'bold',
  color,
  muted,
  style,
  ...rest
}) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return (
      <AppText variant={variant} weight={weight} muted style={style} {...rest}>
        —
      </AppText>
    );
  }

  const value = Number(amount);
  const negative = value < 0;
  const resolved = color || (signed && negative ? colors.danger : undefined);

  return (
    <AppText
      variant={variant}
      weight={weight}
      color={resolved}
      muted={muted}
      style={style}
      {...rest}
    >
      {negative && signed ? '−' : ''}
      {formatMoney(Math.abs(value), compact)}
    </AppText>
  );
}

/** ₹ + Indian digit grouping, or lakh/crore shorthand when `compact`. */
export function formatMoney(value, compact = false) {
  if (!compact) return `₹${groupIndian(Math.round(value))}`;

  if (value >= 1_00_00_000) return `₹${trim(value / 1_00_00_000)}Cr`;
  if (value >= 1_00_000) return `₹${trim(value / 1_00_000)}L`;
  if (value >= 1_000) return `₹${trim(value / 1_000)}K`;
  return `₹${Math.round(value)}`;
}

/** 2,50,000 — not 250,000. Written out because RN's Intl support varies by build. */
function groupIndian(n) {
  const s = String(n);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

/** One decimal, but drop a trailing ".0" — "₹4.2L", "₹18L". */
const trim = (n) => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};
