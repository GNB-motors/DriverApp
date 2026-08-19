import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, elevation } from '../../theme/tokens';
import AppText from './AppText';

/**
 * WalletHeroCard — the blue gradient wallet balance card.
 * Appears on Home, Profile, More, and the Wallet screens.
 *
 *   <WalletHeroCard balance="₹4,820" caption="1 bill pending · 4 confirmed" onPress={…} />
 *   <WalletHeroCard
 *     label="BALANCE" balance="₹4,820" caption="Company owes you this much"
 *     chips={[{ label: '+₹9,820 confirmed' }, { label: '−₹5,000 advances' }]}
 *   />
 *   <WalletHeroCard compact balance="₹4,820" caption="Settle-up figure" />
 *
 * Props: label, balance (string), caption, chips ([{label}]), onPress, compact, style.
 */
export default function WalletHeroCard({
  label = 'WALLET · OWED TO YOU',
  balance,
  caption,
  chips,
  onPress,
  compact = false,
  style,
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={style}>
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.card, compact && styles.compact]}
      >
        <View style={styles.topRow}>
          <View style={styles.textBlock}>
            <AppText variant="label" weight="bold" color={colors.onPrimaryMuted}>
              {label}
            </AppText>
            <AppText
              mono
              weight="semibold"
              color={colors.white}
              style={compact ? styles.balanceSm : styles.balance}
            >
              {balance}
            </AppText>
            {caption ? (
              <AppText variant="small" color={colors.onPrimaryMuted}>
                {caption}
              </AppText>
            ) : null}
          </View>
          {onPress ? (
            <View style={styles.chevron}>
              <Ionicons name="chevron-forward" size={18} color={colors.white} />
            </View>
          ) : null}
        </View>

        {chips && chips.length ? (
          <View style={styles.chips}>
            {chips.map((c, i) => (
              <View key={i} style={styles.chip}>
                <AppText mono variant="small" weight="semibold" color={colors.white}>
                  {c.label}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: 18,
    gap: 14,
    overflow: 'hidden',
    ...elevation.md,
  },
  compact: { padding: 16, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  textBlock: { flex: 1, gap: 4 },
  balance: { fontSize: 38, lineHeight: 42 },
  balanceSm: { fontSize: 28, lineHeight: 32 },
  chevron: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.onPrimaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.onPrimaryFaint,
  },
});
