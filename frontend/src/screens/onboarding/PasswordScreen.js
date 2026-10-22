import React, { useState } from 'react';
import { View, TextInput, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, bodyFont, colors, spacing, radius } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

/**
 * E4b · Password — sign-in with a password (temporary; OTP flow is kept in
 * OtpScreen for when we switch back). UI-only: any password of 4+ chars signs in.
 */
export default function PasswordScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { demoLogin } = useAuth();
  const phone = route.params?.phone || '+91 98220 41188';
  const rawPhone = route.params?.rawPhone || '';
  const [password, setPassword] = useState('');
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);

  const ready = password.length >= 4;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <AppText variant="h1" weight="extrabold">Enter your password</AppText>
        <View style={styles.sentRow}>
          <AppText variant="body" muted>
            Signing in as{' '}
            <AppText variant="body" weight="bold" mono color={colors.text}>{phone}</AppText>
          </AppText>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <AppText variant="body" weight="bold" color={colors.primary}>Change</AppText>
          </Pressable>
        </View>

        <AppText variant="label" muted style={styles.label}>Password</AppText>
        <View style={[styles.field, focused && styles.fieldFocused]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={hidden}
            placeholder="Your password"
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[styles.input, { fontFamily: bodyFont('en', 'medium') }]}
          />
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <Pressable style={styles.forgot} hitSlop={6} onPress={() => {}}>
          <AppText variant="small" weight="bold" color={colors.primary}>Forgot password?</AppText>
        </Pressable>

        <View style={styles.spacer} />

        <Button
          label="Sign in"
          size="lg"
          iconRight="arrow-forward"
          disabled={!ready}
          onPress={() => demoLogin({ rawPhone })}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 8, flexWrap: 'wrap' },
  label: { marginTop: spacing.xl, marginBottom: 8 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, height: 56,
  },
  fieldFocused: { borderColor: colors.primary },
  input: { flex: 1, fontSize: 16, color: colors.text, padding: 0 },
  forgot: { alignSelf: 'flex-end', marginTop: 12 },
  spacer: { flex: 1 },
});
