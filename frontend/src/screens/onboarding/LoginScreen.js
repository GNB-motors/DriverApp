import React, { useState } from 'react';
import { View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, bodyFont, colors, spacing, radius } from '../../components/ui';

/**
 * Employee sign-in — email + phone + password (password auth for now; OTP flow
 * kept in OtpScreen for later). UI-only: valid-looking input signs in, and the
 * phone number still drives the demo role (driver / owner / manager).
 */
export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [hidden, setHidden] = useState(true);
  const [focus, setFocus] = useState(null);

  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  const phoneOk = phone.replace(/\D/g, '').length === 10;
  const ready = emailOk && phoneOk && password.length >= 4;

  const signIn = () => navigation.navigate('SetPin', { rawPhone: phone.replace(/\D/g, '') });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AppText variant="h1" weight="extrabold">Sign in</AppText>
        <AppText variant="body" muted style={styles.subtitle}>
          Enter your work email, phone number and password to continue.
        </AppText>

        {/* Email */}
        <AppText variant="label" muted style={styles.label}>Email</AppText>
        <View style={[styles.field, focus === 'email' && styles.fieldFocused]}>
          <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocus('email')}
            onBlur={() => setFocus(null)}
            style={[styles.input, { fontFamily: bodyFont('en', 'medium') }]}
          />
          {emailOk ? <Ionicons name="checkmark-circle" size={18} color={colors.success} /> : null}
        </View>

        {/* Phone */}
        <AppText variant="label" muted style={styles.label}>Phone number</AppText>
        <View style={[styles.field, focus === 'phone' && styles.fieldFocused]}>
          <AppText mono weight="semibold" color={colors.text}>+91</AppText>
          <View style={styles.vline} />
          <TextInput
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
            placeholder="00000 00000"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={10}
            onFocus={() => setFocus('phone')}
            onBlur={() => setFocus(null)}
            style={[styles.input, styles.mono, { fontFamily: bodyFont('en', 'medium') }]}
          />
          {phoneOk ? <Ionicons name="checkmark-circle" size={18} color={colors.success} /> : null}
        </View>

        {/* Password */}
        <AppText variant="label" muted style={styles.label}>Password</AppText>
        <View style={[styles.field, focus === 'password' && styles.fieldFocused]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={hidden}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocus('password')}
            onBlur={() => setFocus(null)}
            style={[styles.input, { fontFamily: bodyFont('en', 'medium') }]}
          />
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <Pressable style={styles.forgot} hitSlop={6} onPress={() => {}}>
          <AppText variant="small" weight="bold" color={colors.primary}>Forgot password?</AppText>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="Sign in" size="lg" iconRight="arrow-forward" disabled={!ready} onPress={signIn} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  subtitle: { marginTop: 8 },
  label: { marginTop: spacing.lg, marginBottom: 8 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, height: 56,
  },
  fieldFocused: { borderColor: colors.primary },
  input: { flex: 1, fontSize: 16, color: colors.text, padding: 0 },
  mono: { letterSpacing: 1 },
  vline: { width: 1, height: 24, backgroundColor: colors.border },
  forgot: { alignSelf: 'flex-end', marginTop: 12 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
