import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import AppText from './AppText';

/**
 * RadioCard — a selectable option row with a leading glyph/avatar tile, a
 * title + subtitle, and a radio indicator. Used by language selection (E2 / 13).
 *
 *   <RadioCard glyph="अ" title="हिन्दी" subtitle="Hindi" selected={lang === 'hi'} onPress={() => setLang('hi')} />
 *   <RadioCard icon="cash-outline" title="My pocket" selected onPress={…} />
 *
 * Props: glyph (short text) OR icon (Ionicons), title, subtitle, selected, onPress, style.
 */
export default function RadioCard({ glyph, icon, title, subtitle, selected = false, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.card, selected && styles.cardSelected, style]}
    >
      <View style={[styles.tile, selected && styles.tileSelected]}>
        {glyph ? (
          <AppText variant="h3" weight="bold" color={selected ? colors.primary : colors.textMuted}>
            {glyph}
          </AppText>
        ) : icon ? (
          <Ionicons name={icon} size={20} color={selected ? colors.primary : colors.textMuted} />
        ) : null}
      </View>

      <View style={styles.textBlock}>
        <AppText variant="bodyStrong" weight="bold">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.tealTint },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: { backgroundColor: colors.surface },
  textBlock: { flex: 1, gap: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
});
