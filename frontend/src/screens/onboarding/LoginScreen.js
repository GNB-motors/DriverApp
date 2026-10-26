import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Modal, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Path, Circle, Rect } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { AppText, colors, fontFamily } from '../../components/ui';
import { BRAND, INK, HERO_COLORS, Glow, LineIcon, CtaButton } from './onboardingKit';

const FIELD_ICON = '#5A6078';

/**
 * Sign in — email OR mobile + password (all roles: driver / owner / manager).
 * Calls AuthContext.login; on success the role-based navigator swaps to the
 * right stack. Request failures remain visible; no offline demo login.
 */
export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const passwordRef = useRef(null);
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [hidden, setHidden] = useState(true);
  const [focus, setFocus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);

  const ready = emailOrMobile.trim().length > 0 && password.length > 0;

  const signIn = async () => {
    if (!ready || busy) return;
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
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient
          colors={HERO_COLORS}
          locations={[0, 0.55, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
        >
          <Glow id="signInGlow" size={280} rgb="130,155,245" opacity={0.45} style={styles.glow} />
          {navigation.canGoBack() && (
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
            >
              <LineIcon size={22} color="#FFFFFF" strokeWidth={2}>
                <Path d="m15 18-6-6 6-6" />
              </LineIcon>
            </Pressable>
          )}
          <View style={styles.titleBlock}>
            <AppText variant="display" weight="bold" color="#FFFFFF" style={styles.title}>
              Sign in
            </AppText>
            <AppText color="#DCE3FD" style={styles.subtitle}>
              Use your work email or mobile number and password.
            </AppText>
          </View>
        </LinearGradient>

        <View style={styles.sheet}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.sheetBody, { paddingBottom: Math.max(insets.bottom + 3, 20) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              <Field label="Email or mobile" focused={focus === 'id'} style={styles.fieldId}>
                <LineIcon size={20} color={FIELD_ICON}>
                  <Circle cx="12" cy="8" r="4" />
                  <Path d="M20 21a8 8 0 0 0-16 0" />
                </LineIcon>
                <TextInput
                  value={emailOrMobile}
                  onChangeText={setEmailOrMobile}
                  placeholder="you@company.com or 98220 41188"
                  placeholderTextColor="#8A90A6"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onFocus={() => setFocus('id')}
                  onBlur={() => setFocus(null)}
                  style={[styles.input, styles.inputId]}
                />
              </Field>

              <Field
                label="Password"
                focused={focus === 'pw'}
                style={styles.fieldPw}
                below={error ? <ErrorRow message={error} /> : null}
              >
                <LineIcon size={20} color={FIELD_ICON}>
                  <Rect x="4" y="11" width="16" height="10" rx="2" />
                  <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </LineIcon>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor="#8A90A6"
                  secureTextEntry={hidden}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={signIn}
                  onFocus={() => setFocus('pw')}
                  onBlur={() => setFocus(null)}
                  style={[styles.input, styles.inputPw]}
                />
                <Pressable
                  onPress={() => setHidden((h) => !h)}
                  accessibilityRole="button"
                  accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
                  style={styles.eye}
                >
                  {hidden ? <EyeIcon /> : <EyeOffIcon />}
                </Pressable>
              </Field>

              <View style={styles.forgotRow}>
                <Pressable onPress={() => setResetOpen(true)} accessibilityRole="button" hitSlop={6}>
                  {({ pressed }) => (
                    <AppText weight="semibold" color={pressed ? '#2646BE' : '#4469F0'} style={styles.forgot}>
                      Forgot password?
                    </AppText>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.flex} />
            <CtaButton label="Sign in" onPress={signIn} disabled={!ready} loading={busy} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <ResetPasswordDialog visible={resetOpen} onClose={() => setResetOpen(false)} />
    </View>
  );
}

function Field({ label, focused, style, below, children }) {
  return (
    <View style={styles.fieldGroup}>
      <AppText weight="semibold" color="#30364D" style={styles.fieldLabel}>
        {label}
      </AppText>
      <View style={[styles.field, style, focused && styles.fieldFocused]}>{children}</View>
      {below}
    </View>
  );
}

function ErrorRow({ message }) {
  return (
    <View style={styles.errorRow}>
      <LineIcon size={16} color={colors.error}>
        <Circle cx="12" cy="12" r="10" />
        <Path d="M12 8v4" />
        <Path d="M12 16h.01" />
      </LineIcon>
      <AppText color={colors.error} style={styles.errorText}>
        {message}
      </AppText>
    </View>
  );
}

function ResetPasswordDialog({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.scrim, Platform.OS === 'android' && { paddingBottom: 12 + insets.bottom }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.dialog}>
          <View style={styles.dialogHead}>
            <View style={styles.dialogIcon}>
              <LineIcon size={28} color={BRAND}>
                <Path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
                <Circle cx="16.5" cy="7.5" r=".5" fill={BRAND} />
              </LineIcon>
            </View>
            <View style={styles.dialogText}>
              <AppText variant="h2" weight="bold" color={INK} style={styles.dialogTitle}>
                Reset your password
              </AppText>
              <AppText color="#4A5068" style={styles.dialogBody}>
                Please ask your manager or GNBEdge support to reset your password.
              </AppText>
            </View>
          </View>
          <CtaButton label="OK" onPress={onClose} showArrow={false} raised={false} />
        </View>
      </View>
    </Modal>
  );
}

function EyeIcon() {
  return (
    <LineIcon size={20} color={FIELD_ICON}>
      <Path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <Circle cx="12" cy="12" r="3" />
    </LineIcon>
  );
}

function EyeOffIcon() {
  return (
    <LineIcon size={20} color={FIELD_ICON}>
      <Path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <Path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <Path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <Path d="m2 2 20 20" />
    </LineIcon>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },

  hero: { paddingHorizontal: 24, paddingBottom: 56, gap: 24, overflow: 'hidden' },
  glow: { top: -110, right: -80 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: { backgroundColor: 'rgba(255,255,255,0.2)' },
  titleBlock: { gap: 8 },
  title: { fontSize: 32, lineHeight: 35.2, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22.5, maxWidth: 300 },

  sheet: {
    flex: 1,
    marginTop: -28,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    boxShadow: '0 -12px 32px rgba(14,27,77,0.18)',
  },
  sheetBody: { flexGrow: 1, paddingTop: 32, paddingHorizontal: 24 },
  form: { gap: 20 },

  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 13, lineHeight: 16 },
  field: {
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F3F3F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldId: { gap: 10, paddingHorizontal: 14 },
  fieldPw: { gap: 12, paddingLeft: 16, paddingRight: 6 },
  fieldFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#4469F0',
    boxShadow: '0 0 0 3px rgba(47,88,238,0.20)',
  },
  input: { flex: 1, minWidth: 0, padding: 0, color: INK, fontFamily: fontFamily.display.regular },
  inputId: { fontSize: 15 },
  inputPw: { fontSize: 16 },
  eye: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },

  forgotRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  forgot: { fontSize: 14, lineHeight: 17, paddingVertical: 8 },

  scrim: { flex: 1, justifyContent: 'flex-end', padding: 12, backgroundColor: 'rgba(5,8,22,0.45)' },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 24,
    boxShadow: '0 24px 48px rgba(5,8,22,0.3)',
  },
  dialogHead: { gap: 16, alignItems: 'flex-start' },
  dialogIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(47,88,238,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogText: { gap: 8 },
  dialogTitle: { fontSize: 24, lineHeight: 28.8 },
  dialogBody: { fontSize: 16, lineHeight: 24 },
});
