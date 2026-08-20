import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, OtpInput, NumericKeypad, colors, spacing, radius } from '../../components/ui';

/**
 * E4 · OTP — code entry with a resend timer. UI-only: any 6 digits verify.
 */
const RESEND_SECONDS = 24;

export default function OtpScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const phone = route.params?.phone || '+91 98220 41188';
  const rawPhone = route.params?.rawPhone || '';
  const [code, setCode] = useState('');
  const [secs, setSecs] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secs <= 0) return undefined;
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [secs]);

  const press = (d) => setCode((c) => (c.length < 6 ? c + d : c));
  const back = () => setCode((c) => c.slice(0, -1));
  const resend = () => setSecs(RESEND_SECONDS);
  const mmss = `0:${String(secs).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <AppText variant="h1" weight="extrabold">
          Enter the code
        </AppText>
        <View style={styles.sentRow}>
          <AppText variant="body" muted>
            Sent to{' '}
            <AppText variant="body" weight="bold" mono color={colors.text}>
              {phone}
            </AppText>
          </AppText>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <AppText variant="body" weight="bold" color={colors.primary}>
              Change
            </AppText>
          </Pressable>
        </View>

        <OtpInput value={code} length={6} style={styles.otp} />

        <View style={styles.resendRow}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          {secs > 0 ? (
            <AppText variant="small" muted>
              Resend in{' '}
              <AppText variant="small" mono weight="semibold" color={colors.text}>
                {mmss}
              </AppText>
            </AppText>
          ) : (
            <Pressable onPress={resend} hitSlop={8}>
              <AppText variant="small" weight="bold" color={colors.primary}>
                Resend code
              </AppText>
            </Pressable>
          )}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="mail-outline" size={18} color={colors.infoText} />
          <AppText variant="small" color={colors.infoText} style={styles.infoText}>
            The code is read from your SMS automatically where supported.
          </AppText>
        </View>

        <View style={styles.spacer} />

        <Button
          label="Verify and continue"
          size="lg"
          iconRight="arrow-forward"
          disabled={code.length < 6}
          onPress={() => navigation.navigate('SetPin', { rawPhone })}
        />
      </View>

      <View style={[styles.keypad, { paddingBottom: insets.bottom + spacing.md }]}>
        <NumericKeypad onKeyPress={press} onBackspace={back} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 8, flexWrap: 'wrap' },
  otp: { marginTop: spacing.xl },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.lg },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    padding: 12,
  },
  infoText: { flex: 1 },
  spacer: { flex: 1 },
  keypad: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
