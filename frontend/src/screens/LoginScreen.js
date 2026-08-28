import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BrandMark from '../Assets/BrandMark';
import { AppText, Button, colors, spacing, radius, fontFamily } from '../components/ui';

// ── Main screen ─────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const lt = (key) => {
    const val = t('login', key);
    if (val) return val;
    const fallback = {
      brandName: 'HIGHWAY SAHAYAK',
      subtitle: 'Driver Portal Login',
      phoneLabel: 'ENTER PHONE NUMBER',
      phonePlaceholder: '00000 00000',
      passwordLabel: 'ENTER PASSWORD',
      passwordPlaceholder: 'Your password',
      loginButton: 'Login',
      help: 'Help / Login Issues?',
      secureAccess: 'SECURE DRIVER ACCESS',
      support: 'SUPPORT',
      supportValue: '24/7 Active',
      language: 'LANGUAGE',
    };
    return fallback[key] || '';
  };

  const formatPhone = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 5) return cleaned;
    return cleaned.slice(0, 5) + ' ' + cleaned.slice(5, 10);
  };

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 10) setPhoneNumber(cleaned);
  };

  const canSubmit = phoneNumber.length === 10 && password.length >= 1;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      // Backend matches on email OR mobileNumber; the OTP flow stores numbers as
      // +91XXXXXXXXXX, so normalise the same way for password login.
      const emailOrMobile = `+91${phoneNumber}`;
      await login(emailOrMobile, password);
    } catch (err) {
      setError(err.message || 'Incorrect phone or password. Please try again.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const currentLang = language || 'en';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* ── Gradient branding header ── */}
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + spacing.md }]}
        >
          <View style={styles.logoTile}>
            <BrandMark size={38} color={colors.white} />
          </View>
          <AppText
            weight="extrabold"
            color={colors.white}
            style={[styles.brand, { fontFamily: fontFamily.display.extrabold }]}
          >
            {lt('brandName')}
          </AppText>
          <AppText variant="small" weight="medium" color={colors.onPrimaryMuted} style={styles.subtitle}>
            {lt('subtitle')}
          </AppText>
        </LinearGradient>

        {/* ── White card overlapping header ── */}
        <View style={[styles.card, { paddingBottom: insets.bottom + 60 }]}>
          {/* Phone number */}
          <AppText variant="label" muted style={styles.label}>{lt('phoneLabel')}</AppText>
          <View style={styles.phoneField}>
            <AppText mono weight="bold" color={colors.primary} style={styles.countryCode}>+91</AppText>
            <View style={styles.fieldDivider} />
            <TextInput
              style={styles.phoneInput}
              placeholder={lt('phonePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={formatPhone(phoneNumber)}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={11}
              editable={!loading}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <AppText variant="label" muted style={styles.label}>{lt('passwordLabel')}</AppText>
          <View style={styles.phoneField}>
            <TextInput
              style={styles.passwordInput}
              placeholder={lt('passwordPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
            <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {error ? (
            <AppText variant="small" weight="semibold" color={colors.error} center style={styles.error}>
              {error}
            </AppText>
          ) : null}

          <Button
            label={lt('loginButton')}
            iconRight="arrow-forward"
            onPress={handleLogin}
            loading={loading}
            disabled={!canSubmit || loading}
            size="lg"
          />

          {/* Help link */}
          <Pressable hitSlop={8} style={styles.helpWrap}>
            <AppText variant="body" weight="bold" color={colors.primary} center>{lt('help')}</AppText>
          </Pressable>

          <View style={styles.hairline} />

          {/* Info cards: Support + Language */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Ionicons name="headset" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" weight="bold" muted style={styles.infoLabel}>{lt('support')}</AppText>
                <AppText variant="small" weight="bold">{lt('supportValue')}</AppText>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Ionicons name="language" size={18} color={colors.primary} />
              </View>
              <View style={styles.langToggle}>
                <Pressable
                  onPress={() => setLanguage('hi')}
                  style={[styles.langPill, currentLang === 'hi' && styles.langPillActive]}
                  hitSlop={6}
                >
                  <AppText variant="small" weight={currentLang === 'hi' ? 'bold' : 'semibold'} color={currentLang === 'hi' ? colors.white : colors.textMuted}>
                    हिन्दी
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => setLanguage('en')}
                  style={[styles.langPill, currentLang === 'en' && styles.langPillActive]}
                  hitSlop={6}
                >
                  <AppText variant="small" weight={currentLang === 'en' ? 'bold' : 'semibold'} color={currentLang === 'en' ? colors.white : colors.textMuted}>
                    EN
                  </AppText>
                </Pressable>
              </View>
            </View>
          </View>

          {/* GNB watermark */}
          <Text style={styles.gnb}>GNB</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1 },

  // Header
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  logoTile: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { marginTop: 18, fontSize: 26, letterSpacing: 1 },
  subtitle: { marginTop: 5 },

  // Card
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -22,
    paddingHorizontal: 26,
    paddingTop: 28,
  },

  // Step dots
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  stepDotActive: { width: 24, backgroundColor: colors.primary },

  // Phone field
  label: { marginBottom: 9 },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 18,
  },
  countryCode: { fontSize: 16 },
  fieldDivider: { width: 1, height: 22, backgroundColor: '#D8D8DE' },
  phoneInput: {
    flex: 1,
    fontFamily: fontFamily.mono.medium,
    fontSize: 16,
    color: colors.text,
    letterSpacing: 1,
    padding: 0,
  },
  passwordInput: {
    flex: 1,
    fontFamily: fontFamily.display.medium,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  eyeBtn: { padding: 2 },

  // OTP
  otpSubtitle: { marginTop: 2 },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: { borderColor: colors.primary },
  otpDigit: { fontSize: 22 },

  error: { marginBottom: 14 },

  linkRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },

  // Help
  helpWrap: { paddingVertical: 18 },
  hairline: { height: 1, backgroundColor: colors.border, marginBottom: 18 },

  // Info cards
  infoCards: { flexDirection: 'row', gap: 12 },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 13,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { marginBottom: 2, textTransform: 'uppercase' },
  langToggle: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  langPill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 9 },
  langPillActive: { backgroundColor: colors.primary },

  // GNB watermark
  gnb: {
    marginTop: 280,
    fontSize: 34,
    letterSpacing: 4,
    color: '#ECECEE',
    textAlign: 'center',
    fontWeight: '800',
  },
});
