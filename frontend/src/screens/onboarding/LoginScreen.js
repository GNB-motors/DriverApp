import React, { useState } from 'react';
import { View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AppText, Button, bodyFont, colors, spacing, radius } from '../../components/ui';

/**
 * Sign in — email OR mobile + password (all roles: driver / owner / manager).
 * Calls AuthContext.login; on success the role-based navigator swaps to the
 * right stack. Offline (no EXPO_PUBLIC_API_URL) it falls back to the demo map.
 */
export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [hidden, setHidden] = useState(true);
  const [focus, setFocus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const ready = emailOrMobile.trim().length > 0 && password.length >= 1;

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await login(emailOrMobile.trim(), password);
      // success → AppNavigator switches to the role stack; nothing to navigate.
    } catch (e) {
      setError(e?.message || 'Sign in failed. Check your details and try again.');
      setBusy(false);
    }
  };

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
          Use your work email or mobile number and password.
        </AppText>

        {/* Email or mobile */}
        <AppText variant="label" muted style={styles.label}>Email or mobile</AppText>
        <View style={[styles.field, focus === 'id' && styles.fieldFocused]}>
          <Ionicons name="person-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={emailOrMobile}
            onChangeText={setEmailOrMobile}
            placeholder="you@company.com or 98220 41188"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            onFocus={() => setFocus('id')}
            onBlur={() => setFocus(null)}
            style={[styles.input, { fontFamily: bodyFont('en', 'medium') }]}
          />
        </View>

        {/* Password */}
        <AppText variant="label" muted style={styles.label}>Password</AppText>
        <View style={[styles.field, focus === 'pw' && styles.fieldFocused]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={hidden}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocus('pw')}
            onBlur={() => setFocus(null)}
            onSubmitEditing={() => ready && signIn()}
            style={[styles.input, { fontFamily: bodyFont('en', 'medium') }]}
          />
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={15} color={colors.error} />
            <AppText variant="small" color={colors.error} style={{ flex: 1 }}>{error}</AppText>
          </View>
        ) : null}

        <Pressable style={styles.forgot} hitSlop={6} onPress={() => {}}>
          <AppText variant="small" weight="bold" color={colors.primary}>Forgot password?</AppText>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="Sign in" size="lg" iconRight="arrow-forward" loading={busy} disabled={!ready || busy} onPress={signIn} />
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
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  forgot: { alignSelf: 'flex-end', marginTop: 12 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
