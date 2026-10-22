/**
 * LoginScreen.js  — Phase 1 redesign
 *
 * Design:
 *   • Full-screen fleet hero image (blurred) as background — dark teal overlay
 *   • Animated SVG truck (Lottie) drives across the screen from left to right
 *     in a looping road section at the bottom of the hero area
 *   • Logo + brand name centered on the hero
 *   • Cosmetic role strip: Driver · Manager/Ops · Owner  (purely visual)
 *   • OTP card slides up with Animated.spring from below
 *   • Step progress pill (teal bar grows from 50% → 100%)
 *   • Language selector: EN · हिन्दी · বাং  (3 pills, top-right floating)
 *   • Existing OTP logic is fully preserved — zero breaking changes
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BrandMark from '../Assets/BrandMark';
import { AppText, Button, colors, spacing, radius, fontFamily } from '../components/ui';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TruckAnimation = require('../Assets/truck-animation.json');

// ── Cosmetic role pills (purely visual — role comes from OTP result) ────────
const ROLE_PILLS = [
  { label: 'Driver',      icon: 'car-sport-outline' },
  { label: 'Manager/Ops', icon: 'briefcase-outline'  },
  { label: 'Owner',       icon: 'business-outline'   },
];

function RolePills() {
  return (
    <View style={hero.pillRow}>
      {ROLE_PILLS.map(({ label, icon }) => (
        <View key={label} style={hero.pill}>
          <Ionicons name={icon} size={12} color="rgba(255,255,255,0.75)" />
          <Text style={hero.pillText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Step progress pill ───────────────────────────────────────────────────────
function StepPill({ step }) {
  const anim = useRef(new Animated.Value(step === 1 ? 0.5 : 1)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: step === 1 ? 0.5 : 1,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  }, [step]);

  const pillWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={pill.track}>
      <Animated.View style={[pill.fill, { width: pillWidth }]} />
    </View>
  );
}

// ── OTP input (6 boxes) ──────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputRef = useRef(null);
  const digits = value.padEnd(6, ' ').split('');

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={{ position: 'relative' }}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        autoFocus
      />
      <View style={otp.row}>
        {digits.map((d, i) => (
          <View key={i} style={[otp.box, value.length === i && otp.boxActive]}>
            <AppText mono weight="bold" style={otp.digit}>{d.trim()}</AppText>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

// ── Language selector (3 pills) ──────────────────────────────────────────────
function LangSelector({ current, onSet, insets }) {
  const langs = [
    { code: 'en', label: 'EN'  },
    { code: 'hi', label: 'हि'  },
    { code: 'bn', label: 'বাং' },
  ];
  return (
    <View style={[langStyle.wrap, { top: insets.top + 12 }]}>
      {langs.map(({ code, label }) => (
        <Pressable
          key={code}
          onPress={() => onSet(code)}
          hitSlop={6}
          style={[langStyle.pill, current === code && langStyle.pillActive]}
        >
          <Text style={[langStyle.label, current === code && langStyle.labelActive]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [step, setStep]                   = useState(1);
  const [phoneNumber, setPhoneNumber]     = useState('');
  const [normalisedPhone, setNormalisedPhone] = useState('');
  const [otp, setOtp]                     = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  // Card slide-up animation
  const cardY = useRef(new Animated.Value(200)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
      speed: 10,
    }).start();
    Animated.timing(cardOpacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  const insets                      = useSafeAreaInsets();
  const { sendOtp, verifyOtp }      = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const lt = (key) => {
    const val = t('login', key);
    if (val) return val;
    const fallback = {
      brandName:      'HIGHWAY SAHAYAK',
      subtitle:       'Fleet Management Portal',
      phoneLabel:     'ENTER PHONE NUMBER',
      phonePlaceholder: '00000 00000',
      sendOtpButton:  'Send OTP',
      otpLabel:       'ENTER OTP',
      otpSubtitle:    'sent to',
      verifyButton:   'Verify & Login',
      resend:         'Resend OTP',
      changeNumber:   'Change Number',
      help:           'Help / Login Issues?',
      secureAccess:   'SECURE ACCESS',
      support:        'SUPPORT',
      supportValue:   '24/7 Active',
      language:       'LANGUAGE',
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

      {/* ── Floating language selector ── */}
      <LangSelector current={currentLang} onSet={setLanguage} insets={insets} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* ════════════════════════════════════════════════
            HERO SECTION — dark teal overlay + truck animation
            ════════════════════════════════════════════════ */}
        <View style={[hero.container, { paddingTop: insets.top + 12, height: SCREEN_H * 0.48 }]}>
          {/* Dark teal gradient overlay (replaces image for now — image dropped in later) */}
          <LinearGradient
            colors={['#052E27', '#0A4038', '#0F6E60']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Subtle diagonal grid lines for depth */}
          <View style={hero.gridOverlay} pointerEvents="none">
            {[...Array(8)].map((_, i) => (
              <View
                key={i}
                style={[hero.gridLine, { left: (SCREEN_W / 8) * i - 20 }]}
              />
            ))}
          </View>

          {/* Logo + Brand */}
          <View style={hero.brandArea}>
            <View style={hero.logoTile}>
              <BrandMark size={36} color={colors.white} />
            </View>
            <AppText
              weight="extrabold"
              color={colors.white}
              style={[hero.brand, { fontFamily: fontFamily.display.extrabold }]}
            >
              {lt('brandName')}
            </AppText>
            <AppText variant="small" weight="medium" color="rgba(255,255,255,0.60)" style={hero.subtitle}>
              {lt('subtitle')}
            </AppText>

            {/* Cosmetic role pills */}
            <RolePills />
          </View>

          {/* Truck animation driving on road at the bottom of the hero */}
          <View style={hero.roadSection}>
            {/* Road */}
            <LinearGradient
              colors={['#112920', '#1A3D35']}
              style={hero.road}
            >
              {/* Dashed centre line */}
              <View style={hero.dashRow}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={hero.dash} />
                ))}
              </View>
            </LinearGradient>
            {/* Truck drives across the road */}
            <LottieView
              source={TruckAnimation}
              autoPlay
              loop
              style={hero.truck}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* ════════════════════════════════════════════════
            OTP CARD — slides up with spring animation
            ════════════════════════════════════════════════ */}
        <Animated.View
          style={[
            card.container,
            { paddingBottom: insets.bottom + 48 },
            { transform: [{ translateY: cardY }], opacity: cardOpacity },
          ]}
        >
          {/* Step progress pill */}
          <StepPill step={step} />

          {step === 1 ? (
            <>
              <AppText variant="label" muted style={card.label}>{lt('phoneLabel')}</AppText>
              <View style={card.phoneField}>
                <AppText mono weight="bold" color={colors.primary} style={card.countryCode}>+91</AppText>
                <View style={card.divider} />
                <TextInput
                  style={card.phoneInput}
                  placeholder={lt('phonePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={formatPhone(phoneNumber)}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={11}
                  editable={!loading}
                />
              </View>

              {!!error && (
                <AppText variant="small" weight="semibold" color={colors.error} center style={card.error}>
                  {error}
                </AppText>
              )}

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
            <>
              <AppText variant="label" muted style={card.label}>{lt('otpLabel')}</AppText>
              <AppText variant="small" muted style={card.otpSubtitle}>
                {lt('otpSubtitle')} {normalisedPhone}
              </AppText>
              <View style={{ marginTop: 12, marginBottom: 18 }}>
                <OtpInput value={otp} onChange={setOtp} />
              </View>

              {!!error && (
                <AppText variant="small" weight="semibold" color={colors.error} center style={card.error}>
                  {error}
                </AppText>
              )}

              <Button
                label={lt('verifyButton')}
                iconRight="checkmark"
                onPress={handleVerifyOtp}
                loading={loading}
                disabled={otp.length < 6 || loading}
                size="lg"
              />

              <View style={card.linkRow}>
                <Pressable onPress={handleResend} disabled={loading} hitSlop={8}>
                  <AppText variant="small" weight="bold" color={colors.primary}>{lt('resend')}</AppText>
                </Pressable>
                <Pressable
                  onPress={() => { setStep(1); setOtp(''); setError(''); }}
                  disabled={loading}
                  hitSlop={8}
                >
                  <AppText variant="small" weight="bold" color={colors.primary}>{lt('changeNumber')}</AppText>
                </Pressable>
              </View>
            </>
          )}

          {/* Help */}
          <Pressable hitSlop={8} style={card.helpWrap}>
            <AppText variant="body" weight="bold" color={colors.primary} center>{lt('help')}</AppText>
          </Pressable>

          <View style={card.hairline} />

          {/* Info row: Support + Language display */}
          <View style={card.infoCards}>
            <View style={card.infoCard}>
              <View style={card.infoIcon}>
                <Ionicons name="headset" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" weight="bold" muted style={card.infoLabel}>{lt('support')}</AppText>
                <AppText variant="small" weight="bold">{lt('supportValue')}</AppText>
              </View>
            </View>

            <View style={card.infoCard}>
              <View style={card.infoIcon}>
                <Ionicons name="language" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" weight="bold" muted style={card.infoLabel}>{lt('language')}</AppText>
                <AppText variant="small" weight="bold" color={colors.primary}>
                  {currentLang === 'en' ? 'English' : currentLang === 'hi' ? 'हिन्दी' : 'বাংলা'}
                </AppText>
              </View>
            </View>
          </View>

          {/* GNB watermark */}
          <Text style={card.gnb}>GNB</Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── StyleSheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#052E27' },
  scroll: { flexGrow: 1 },
});

const hero = StyleSheet.create({
  container: { width: '100%', overflow: 'hidden', justifyContent: 'space-between' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  gridLine: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    transform: [{ rotate: '15deg' }],
  },
  brandArea: { alignItems: 'center', paddingHorizontal: spacing.xl, flex: 1, justifyContent: 'center' },
  logoTile: {
    width: 68,
    height: 68,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { marginTop: 14, fontSize: 24, letterSpacing: 1.5, color: colors.white },
  subtitle: { marginTop: 4 },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  pillText: {
    fontFamily: fontFamily.display.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
  },
  roadSection: { height: 64, width: '100%', position: 'relative', justifyContent: 'flex-end' },
  road: { height: 28, width: '100%', justifyContent: 'center' },
  dashRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  dash: { width: 22, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,209,102,0.70)' },
  truck: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    height: 72,
    width: SCREEN_W,
  },
});

const pill = StyleSheet.create({
  track: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 22,
  },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
});

const otp = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  box: {
    width: 48,
    height: 58,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxActive: { borderColor: colors.primary },
  digit: { fontSize: 22 },
});

const card = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 26,
    paddingTop: 48,
  },
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
  divider: { width: 1, height: 22, backgroundColor: '#D8E0DD' },
  phoneInput: {
    flex: 1,
    fontFamily: fontFamily.mono.medium,
    fontSize: 16,
    color: colors.text,
    letterSpacing: 1,
    padding: 0,
  },
  otpSubtitle: { marginTop: 2 },
  error: { marginBottom: 14 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  helpWrap: { paddingVertical: 18 },
  hairline: { height: 1, backgroundColor: colors.border, marginBottom: 18 },
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
  gnb: {
    marginTop: 180,
    fontSize: 34,
    letterSpacing: 4,
    color: '#E7ECEA',
    textAlign: 'center',
    fontWeight: '800',
  },
});

const langStyle = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: {
    fontFamily: fontFamily.display.semibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.70)',
  },
  labelActive: { color: colors.white },
});
