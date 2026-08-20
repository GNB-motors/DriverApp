import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import Card from './Card';
import { colors, spacing, radius } from '../../theme/tokens';

/** Shared building blocks for the Owner and Manager back-office screens. */

export const TONE = {
  success: { fg: colors.success, bg: colors.validBg },
  confirmed: { fg: colors.success, bg: colors.validBg },
  paid: { fg: colors.success, bg: colors.validBg },
  done: { fg: colors.success, bg: colors.validBg },
  warning: { fg: colors.warning, bg: colors.pendingBg },
  pending: { fg: colors.warning, bg: colors.pendingBg },
  error: { fg: colors.error, bg: colors.expiredBg },
  rejected: { fg: colors.error, bg: colors.expiredBg },
  failed: { fg: colors.error, bg: colors.expiredBg },
  in_transit: { fg: colors.infoText, bg: colors.infoBg },
  info: { fg: colors.infoText, bg: colors.infoBg },
  primary: { fg: colors.primaryDeep, bg: colors.tealTint },
  neutral: { fg: colors.textMuted, bg: '#ECECEE' },
  purple: { fg: '#4A4266', bg: '#F0EEF6' },
};

export function toneColor(name) {
  if (name === 'success') return colors.success;
  if (name === 'warning') return colors.warning;
  if (name === 'error') return colors.error;
  if (name === 'info') return colors.infoText;
  return colors.text;
}

export function Pill({ tone = 'neutral', label, style }) {
  const t = TONE[tone] || TONE.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      <AppText variant="caption" weight="bold" color={t.fg}>{label}</AppText>
    </View>
  );
}

export function Monogram({ initials, size = 40 }) {
  return (
    <View style={[styles.mono, { width: size, height: size, borderRadius: radius.md }]}>
      <AppText weight="bold" color="#4A4266" style={{ fontSize: size * 0.36 }}>{initials}</AppText>
    </View>
  );
}

export function SectionHeader({ label, right }) {
  return (
    <View style={styles.sectionHead}>
      <AppText variant="label" muted>{label}</AppText>
      {right || null}
    </View>
  );
}

export function StatTile({ label, value, sub, color }) {
  return (
    <Card elevated="sm" padding={14} style={styles.statTile}>
      <AppText variant="caption" muted>{label}</AppText>
      <View style={styles.statValRow}>
        <AppText mono variant="h2" weight="semibold" color={color ? toneColor(color) : colors.text}>{value}</AppText>
        {sub ? <AppText variant="caption" mono muted>{sub}</AppText> : null}
      </View>
    </Card>
  );
}

export function RouteLine({ from, to, size = 'body' }) {
  return (
    <View style={styles.route}>
      <AppText variant={size} weight="semibold">{from}</AppText>
      <View style={styles.dashed} />
      <AppText variant={size} weight="semibold">{to}</AppText>
    </View>
  );
}

export function LedgerRow({ item }) {
  const credit = item.dir === 'credit';
  return (
    <View style={styles.ledgerRow}>
      <View style={[styles.ledgerIcon, { backgroundColor: credit ? colors.validBg : colors.expiredBg }]}>
        <Ionicons name={credit ? 'arrow-up' : 'arrow-down'} size={15} color={credit ? colors.success : colors.error} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="small" weight="semibold">{item.title}</AppText>
        <AppText variant="caption" mono muted>{item.meta}</AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <AppText mono variant="bodyStrong" weight="semibold" color={credit ? colors.success : colors.error}>{item.delta}</AppText>
        {item.balance ? <AppText variant="caption" mono muted>{item.balance}</AppText> : null}
      </View>
    </View>
  );
}

export function FilterChips({ options, value, onChange, style }) {
  return (
    <View style={[styles.chipRow, style]}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const on = val === value;
        return (
          <Pressable key={val} onPress={() => onChange?.(val)} style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
            <AppText variant="small" weight={on ? 'bold' : 'semibold'} color={on ? colors.white : colors.text}>{label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Back-header for Owner/Ops detail screens (no sidebar). */
export function BackHeader({ title, subtitle, right, onBack }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.backHeader, { paddingTop: insets.top + spacing.sm }]}>
      <StatusBar style="dark" />
      <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <AppText variant="h3" weight="extrabold" numberOfLines={1}>{title}</AppText>
        {subtitle ? <AppText variant="caption" mono muted numberOfLines={1}>{subtitle}</AppText> : null}
      </View>
      {right || null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, alignSelf: 'flex-start' },
  mono: { backgroundColor: '#F0EEF6', alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statTile: { flex: 1, gap: 6 },
  statValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dashed: { flex: 1, height: 0, borderTopWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  ledgerIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full },
  chipOn: { backgroundColor: colors.black },
  chipOff: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  backHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
