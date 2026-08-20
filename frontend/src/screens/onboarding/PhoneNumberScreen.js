import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, NumericKeypad, colors, spacing, radius } from '../../components/ui';

/**
 * E3 · Phone number — number entry + custom keypad. UI-only (no OTP request).
 */
const formatPhone = (d) => (d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);

export default function PhoneNumberScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(true);

  const ready = phone.length === 10 && consent;
  const press = (d) => setPhone((p) => (p.length < 10 ? p + d : p));
  const back = () => setPhone((p) => p.slice(0, -1));

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
          What is your mobile number?
        </AppText>
        <AppText variant="body" muted style={styles.subtitle}>
          We send a 6-digit code to verify it. Standard SMS rates may apply.
        </AppText>

        <View style={styles.field}>
          <View style={styles.countryCode}>
            <AppText mono variant="h3" weight="semibold">
              +91
            </AppText>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </View>
          <View style={styles.divider} />
          <AppText mono variant="h2" weight="semibold" style={styles.phone} color={phone ? colors.text : colors.textMuted}>
            {phone ? formatPhone(phone) : '00000 00000'}
          </AppText>
          <View style={styles.caret} />
        </View>

        <Pressable style={styles.consent} onPress={() => setConsent((c) => !c)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
          <View style={[styles.checkbox, consent && styles.checkboxOn]}>
            {consent ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
          </View>
          <AppText variant="small" muted style={styles.consentText}>
            I agree to the Terms of Service and Privacy Policy.
          </AppText>
        </Pressable>

        <View style={styles.spacer} />

        <Button
          label="Send code"
          size="lg"
          iconRight="arrow-forward"
          disabled={!ready}
          onPress={() => navigation.navigate('Otp', { phone: `+91 ${formatPhone(phone)}`, rawPhone: phone })}
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
  subtitle: { marginTop: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 58,
  },
  countryCode: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { width: 1, height: 24, backgroundColor: colors.border },
  phone: { flex: 1, letterSpacing: 1 },
  caret: { width: 2, height: 24, backgroundColor: colors.primary, borderRadius: 1 },
  consent: { flexDirection: 'row', gap: 10, marginTop: spacing.lg, alignItems: 'flex-start' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentText: { flex: 1 },
  spacer: { flex: 1 },
  keypad: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
