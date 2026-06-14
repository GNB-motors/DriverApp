import React, { useState, useRef } from 'react';
import {
  View,
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

// ── Step indicator ──────────────────────────────────────────────────────
function StepDots({ step }) {
  return (
    <View style={styles.stepRow}>
      {[1, 2].map((s) => (
        <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive]} />
      ))}
    </View>
  );
}

// ── OTP input (6 boxes) ─────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputRef = useRef(null);
  const digits = value.padEnd(6, ' ').split('');

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={{ position: 'relative' }}>
      {/* Hidden real input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        autoFocus
      />
      {/* Visual boxes */}
      <View style={styles.otpRow}>
        {digits.map((d, i) => (
          <View key={i} style={[styles.otpBox, value.length === i && styles.otpBoxActive]}>
            <AppText mono weight="bold" style={styles.otpDigit}>{d.trim()}</AppText>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [step, setStep] = useState(1); // 1 = phone, 2 = OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [normalisedPhone, setNormalisedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const insets = useSafeAreaInsets();
  const { sendOtp, verifyOtp } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const lt = (key) => {
    const val = t('login', key);
    if (val) return val;
    const fallback = {
      brandName: 'HIGHWAY SAHAYAK',
      subtitle: 'Driver Portal Login',
      phoneLabel: 'ENTER PHONE NUMBER',
      phonePlaceholder: '00000 00000',
      sendOtpButton: 'Send OTP',
      otpLabel: 'ENTER OTP',
      otpSubtitle: 'sent to',
      verifyButton: 'Verify & Login',
      resend: 'Resend OTP',
      changeNumber: 'Change Number',
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

  const handleSendOtp = async () => {
    if (phoneNumber.length < 10) return;
    setError('');
    setLoading(true);
    try {
      const normalised = await sendOtp(phoneNumber);
      setNormalisedPhone(normalised);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setError('');
    setLoading(true);
    try {
      await verifyOtp(normalisedPhone, otp);
      // Navigation is handled by AppNavigator watching user state
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setOtp('');
    setLoading(true);
    try {
      await sendOtp(phoneNumber);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
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
        <View style={styles.card}>
          <StepDots step={step} />

          {step === 1 ? (
            /* ── Step 1: Phone Number ── */
            <>
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
                />
              </View>

              {error ? (
                <AppText variant="small" weight="semibold" color={colors.error} center style={styles.error}>
                  {error}
                </AppText>
              ) : null}

              <Button
                label={lt('sendOtpButton')}
                iconRight="arrow-forward"
                onPress={handleSendOtp}
                loading={loading}
                disabled={phoneNumber.length < 10 || loading}
                size="lg"
              />
            </>
          ) : (
            /* ── Step 2: OTP Entry ── */
            <>
              <AppText variant="label" muted style={styles.label}>{lt('otpLabel')}</AppText>
              <AppText variant="small" muted style={styles.otpSubtitle}>
                {lt('otpSubtitle')} {normalisedPhone}
              </AppText>
              <View style={{ marginTop: 12, marginBottom: 18 }}>
                <OtpInput value={otp} onChange={setOtp} />
              </View>

              {error ? (
                <AppText variant="small" weight="semibold" color={colors.error} center style={styles.error}>
                  {error}
                </AppText>
              ) : null}

              <Button
                label={lt('verifyButton')}
                iconRight="checkmark"
                onPress={handleVerifyOtp}
                loading={loading}
                disabled={otp.length < 6 || loading}
                size="lg"
              />

              {/* Resend + Change number */}
              <View style={styles.linkRow}>
                <Pressable onPress={handleResend} disabled={loading} hitSlop={8}>
                  <AppText variant="small" weight="bold" color={colors.primary}>{lt('resend')}</AppText>
                </Pressable>
                <Pressable onPress={() => { setStep(1); setOtp(''); setError(''); }} disabled={loading} hitSlop={8}>
                  <AppText variant="small" weight="bold" color={colors.primary}>{lt('changeNumber')}</AppText>
                </Pressable>
              </View>
            </>
          )}

          {/* Help link */}
          <Pressable hitSlop={8} style={styles.helpWrap}>
            <AppText variant="body" weight="bold" color={colors.primary} center>{lt('help')}</AppText>
          </Pressable>

          <View style={styles.hairline} />

          {/* Info cards: Support + Language */}
          <View style={styles.infoCards}>
            {/* Support */}
            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Ionicons name="headset" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" weight="bold" muted style={styles.infoLabel}>{lt('support')}</AppText>
                <AppText variant="small" weight="bold">{lt('supportValue')}</AppText>
              </View>
            </View>

            {/* Language toggle */}
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

          {/* Footer */}
          <View style={styles.footerSpacer} />
          <AppText weight="extrabold" center style={styles.gnb}>GNB</AppText>
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
  fieldDivider: { width: 1, height: 22, backgroundColor: '#D8E0DD' },
  phoneInput: {
    flex: 1,
    fontFamily: fontFamily.mono.medium,
    fontSize: 16,
    color: colors.text,
    letterSpacing: 1,
    padding: 0,
  },

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

  // Footer
  footerSpacer: { flex: 1, minHeight: 20 },
  gnb: { fontSize: 34, letterSpacing: 4, color: '#E7ECEA', marginBottom: 8 },
});
