import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, Stop, RadialGradient } from 'react-native-svg';
import { AppText } from '../../components/ui';

export const BRAND = '#2F58EE';
export const INK = '#0F1428';
export const HERO_COLORS = ['#0E1B4D', '#1C358F', BRAND];

export function Glow({ id, size, rgb, opacity, style }) {
  const r = size / 2;
  return (
    <Svg width={size} height={size} style={[styles.absolute, style]}>
      <Defs>
        <RadialGradient id={id} cx={r} cy={r} r={r * Math.SQRT2} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={`rgb(${rgb})`} stopOpacity={opacity} />
          <Stop offset="0.7" stopColor={`rgb(${rgb})`} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
    </Svg>
  );
}

export function LineIcon({ size, color, strokeWidth = 1.9, children }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export function ArrowRightIcon() {
  return (
    <LineIcon size={20} color="#FFFFFF" strokeWidth={2}>
      <Path d="M5 12h14" />
      <Path d="m12 5 7 7-7 7" />
    </LineIcon>
  );
}

export function CtaButton({ label, onPress, disabled = false, loading = false, showArrow = true, raised = true }) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        raised && !disabled && styles.ctaRaised,
        disabled && !loading && styles.ctaDisabled,
        pressed && styles.ctaPressed,
      ]}
    >
      <AppText weight="semibold" color="#FFFFFF" style={styles.ctaLabel}>
        {label}
      </AppText>
      {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : showArrow ? <ArrowRightIcon /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  absolute: { position: 'absolute' },
  cta: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4469F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaRaised: { boxShadow: '0 10px 24px rgba(47,88,238,0.35)' },
  ctaDisabled: { backgroundColor: '#C3CEFA' },
  ctaPressed: { backgroundColor: '#213EA7' },
  ctaLabel: { fontSize: 17, lineHeight: 22 },
});
