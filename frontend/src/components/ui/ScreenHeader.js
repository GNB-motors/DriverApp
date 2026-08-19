import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';

/**
 * ScreenHeader — the Nova blue gradient header (linear-gradient(180deg,#213EA7,#2F58EE,#4469F0)).
 * Handles the status-bar inset itself.
 *
 *   <ScreenHeader title="Documents" subtitle="Step 2 of 3" onBack={() => nav.goBack()} />
 *   <ScreenHeader title="Refuel" right={<SomeAction />} rounded />
 *
 * Props: title, subtitle, onBack, right (node), rounded (rounds bottom corners),
 *        children (extra content below the title row, e.g. a progress bar).
 */
export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  rounded = false,
  children,
  style,
}) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={colors.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[
        styles.header,
        { paddingTop: insets.top + spacing.sm },
        rounded && styles.rounded,
        style,
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
        ) : null}

        <View style={styles.titleBlock}>
          <AppText variant="h2" weight="extrabold" color={colors.white} numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="small" weight="semibold" color={colors.onPrimaryMuted} numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        {right ? <View style={styles.right}>{right}</View> : null}
      </View>

      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  rounded: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.onPrimaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  right: { marginLeft: 'auto' },
});
