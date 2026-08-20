import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AppText, PinDots, NumericKeypad, colors, spacing, radius } from '../../components/ui';

/**
 * E5 · Set PIN — so the wallet is not open to anyone. UI-only: completing (or
 * skipping) triggers the local demo sign-in and enters the app.
 */
export default function SetPinScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { demoLogin } = useAuth();
  const rawPhone = route.params?.rawPhone || '';
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (pin.length === 4) {
      const id = setTimeout(() => demoLogin({ rawPhone }), 180);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [pin]);

  const press = (d) => setPin((p) => (p.length < 4 ? p + d : p));
  const back = () => setPin((p) => p.slice(0, -1));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => demoLogin({ rawPhone })} hitSlop={10}>
          <AppText variant="body" weight="bold" color={colors.textMuted}>
            Skip
          </AppText>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.lockTile}>
          <Ionicons name="lock-closed" size={26} color={colors.primary} />
        </View>
        <AppText variant="h1" weight="extrabold" center>
          Set a 4-digit PIN
        </AppText>
        <AppText variant="body" muted center style={styles.subtitle}>
          You will need it to open the app and to see your wallet.
        </AppText>

        <PinDots filled={pin.length} length={4} style={styles.dots} />

        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <AppText variant="caption" muted>
            Do not use 1234 or your year of birth.
          </AppText>
        </View>
      </View>

      <View style={[styles.keypad, { paddingBottom: insets.bottom + spacing.md }]}>
        <NumericKeypad onKeyPress={press} onBackspace={back} keySize={54} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, paddingHorizontal: spacing.lg, alignItems: 'center', paddingTop: spacing.xxl },
  lockTile: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  subtitle: { marginTop: 8, paddingHorizontal: spacing.lg },
  dots: { marginTop: spacing.xxl },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  keypad: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
