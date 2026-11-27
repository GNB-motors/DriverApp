import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import SplashScreen from '../../components/ui/SplashScreen';
import { c, r } from '../theme';
import { BackButton, Btn, ErrorLine, Page, TitleBlock, Txt, useDriverCopy } from '../kit';
import { LanguageIcon, MailIcon } from '../icons';

/** 01 Splash — auto-advances once the bar fills, or on tap. */
export function IntroScreen({ navigation }) {
  const { t, lang } = useDriverCopy();
  const progress = useRef(new Animated.Value(0)).current;
  const left = useRef(false);
  const next = () => { if (!left.current) { left.current = true; navigation.replace('Choose language'); } };
  useEffect(() => {
    const run = Animated.timing(progress, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: false });
    run.start(({ finished }) => { if (finished) next(); });
    return () => run.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);
  return <SplashScreen brand={t('brand')} tagline={t('tagline')} footer={t('since')} script={lang} progress={progress} onPress={next} pressLabel={t('continueToLanguage')} />;
}

const LANGS = [
  { code: 'en', native: 'English', english: 'English', glyph: 'Aa' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', glyph: 'अ' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', glyph: 'অ' },
];

/**
 * 02 Choose language. Picking a row switches the app language at once, so the
 * screen itself previews the choice. From More → Language (`settings`) it
 * returns to More instead of continuing to sign in.
 */
export function LanguageScreen({ navigation, route }) {
  const settings = route.params?.mode === 'settings';
  const { language, setLanguage, completeOnboarding } = useLanguage();
  const { t } = useDriverCopy();
  const [selected, setSelected] = useState(language || 'en');
  const pick = (code) => { setSelected(code); setLanguage(code); };
  const onContinue = async () => {
    await setLanguage(selected);
    if (settings) { navigation.goBack(); return; }
    await completeOnboarding();
    navigation.navigate('Mobile login');
  };
  return (
    <Page top={settings ? 20 : 56} bottom={32}>
      <StatusBar style="dark" />
      {settings ? <BackButton onPress={() => navigation.goBack()} /> : (
        <View style={st.langBadge}><LanguageIcon color={c.primary} /></View>
      )}
      <TitleBlock title={t('langTitle')} sub={t('langSub')} />
      <View accessibilityRole="radiogroup" accessibilityLabel={t('langLegend')} style={st.langList}>
        {LANGS.map((item) => {
          const on = selected === item.code;
          return (
            <Pressable key={item.code} onPress={() => pick(item.code)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${item.native}, ${item.english}`} style={[st.langRow, on ? st.langRowOn : st.langRowOff]}>
              <View style={st.glyph}><Txt display size={18} weight="extrabold" color={c.primary}>{item.glyph}</Txt></View>
              <View style={{ flex: 1 }}>
                <Txt size={18} weight="bold">{item.native}</Txt>
                <Txt size={14} color={c.muted}>{item.english}</Txt>
              </View>
              <View style={[st.radio, on && st.radioOn]}>{on ? <View style={st.radioDot} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
      {!settings ? <Txt size={14} color={c.muted} style={{ marginTop: 16 }}>{t('langLater')}</Txt> : null}
      <View style={{ flex: 1 }} />
      <Btn label={settings ? t('langSave') : t('continue')} onPress={onContinue} />
    </Page>
  );
}

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
const formatMobile = (digits) => (digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits);
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL;
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;

function PolicyLink({ label, url }) {
  // Shown as a link only when a real URL is configured for this build.
  if (!url) return <Txt size={13} weight="bold" color={c.primary}>{label}</Txt>;
  return <Txt size={13} weight="bold" color={c.primary} accessibilityRole="link" onPress={() => Linking.openURL(url).catch(() => {})} style={{ textDecorationLine: 'underline' }}>{label}</Txt>;
}

/** 03 Login · mobile number. Drivers sign in by SMS code; staff keep password sign-in. */
export function MobileLoginScreen({ navigation, route }) {
  const { t } = useDriverCopy();
  const { sendOtp } = useAuth();
  const [digits, setDigits] = useState(onlyDigits(route.params?.mobile).slice(-10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = /^[6-9]\d{9}$/.test(digits);
  const submit = async () => {
    if (busy) return;
    if (!valid) { setError(t('mobileInvalid')); return; }
    setBusy(true); setError('');
    try {
      await sendOtp(digits);
      navigation.navigate('Otp', { mobile: digits });
    } catch (failure) {
      setError(failure?.message || t('mobileInvalid'));
    } finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page scroll bottom={32}>
        <StatusBar style="dark" />
        {navigation.canGoBack() ? <BackButton onPress={() => navigation.goBack()} /> : null}
        <TitleBlock title={t('loginTitle')} sub={t('loginSub')} top={28} />
        <Txt size={14} weight="semibold" color={c.muted} style={{ marginTop: 32 }} nativeID="mobileLabel">{t('mobileLabel')}</Txt>
        <View style={[st.phoneBox, error ? st.phoneBoxError : null]}>
          <View style={st.prefix}><Txt size={18} weight="bold">+91</Txt></View>
          <TextInput
            value={formatMobile(digits)}
            onChangeText={(text) => { setDigits(onlyDigits(text).replace(/^0+/, '').slice(0, 10)); setError(''); }}
            keyboardType="number-pad"
            inputMode="numeric"
            textContentType="telephoneNumber"
            autoComplete="tel-national"
            maxLength={11}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
            accessibilityLabel={t('mobileLabel')}
            accessibilityLabelledBy="mobileLabel"
            style={st.phoneInput}
          />
        </View>
        {error ? <View style={{ marginTop: 10 }}><ErrorLine>{error}</ErrorLine></View> : <Txt size={14} color={c.muted} style={{ marginTop: 10 }}>{t('mobileHint')}</Txt>}
        <View style={{ flex: 1, minHeight: 32 }} />
        <Btn label={t('getOtp')} onPress={submit} loading={busy} disabled={!valid} />
        <Pressable
          onPress={() => navigation.navigate('Password login')}
          accessibilityRole="button"
          style={{ marginTop: 14, paddingVertical: 10, alignItems: 'center' }}
          hitSlop={8}
        >
          <Txt size={15} weight="bold" color={c.primary} center>
            {t('loginWithPassword')}
          </Txt>
        </Pressable>
        <Txt size={13} color={c.muted} center style={{ marginTop: 14 }}>
          {t('agreePre')}<PolicyLink label={t('terms')} url={TERMS_URL} />{t('and')}<PolicyLink label={t('privacy')} url={PRIVACY_URL} />{t('agreePost')}
        </Txt>
        <Pressable onPress={() => navigation.navigate('Password login')} accessibilityRole="button" style={st.staffLink} hitSlop={6}>
          <Txt size={14} weight="semibold" color={c.primary} center>{t('staffLogin')}</Txt>
        </Pressable>
      </Page>
    </KeyboardAvoidingView>
  );
}

const RESEND_SECONDS = 30;

/** 04 Login · OTP. One hidden field drives the six boxes, so SMS autofill and paste work. */
export function OtpScreen({ navigation, route }) {
  const { t } = useDriverCopy();
  const { sendOtp, verifyOtp } = useAuth();
  const mobile = route.params?.mobile || '';
  const input = useRef(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [left, setLeft] = useState(RESEND_SECONDS);
  const submitted = useRef('');
  useEffect(() => {
    if (left <= 0) return undefined;
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  const verify = async (value = code) => {
    if (busy) return;
    if (value.length !== 6) { setError(t('otpIncomplete')); return; }
    submitted.current = value;
    setBusy(true); setError('');
    try {
      await verifyOtp(`+91${mobile}`, value);
      // Success swaps the whole navigator to the driver app.
    } catch (failure) {
      setError(failure?.message || t('otpIncomplete'));
      setBusy(false);
    }
  };
  const resend = async () => {
    setError(''); setNotice('');
    try { await sendOtp(mobile); setLeft(RESEND_SECONDS); setCode(''); submitted.current = ''; setNotice(t('resent')); }
    catch (failure) { setError(failure?.message || ''); }
  };
  const onChange = (text) => {
    const next = text.replace(/\D/g, '').slice(0, 6);
    setCode(next); setError(''); setNotice('');
    if (next.length === 6 && submitted.current !== next) verify(next);
  };
  const clock = `0:${String(Math.max(left, 0)).padStart(2, '0')}`;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page scroll bottom={32}>
        <StatusBar style="dark" />
        <BackButton onPress={() => navigation.goBack()} />
        <TitleBlock title={t('otpTitle')} top={28} />
        <Txt size={15} color={c.muted} style={{ marginTop: 8 }}>
          {t('otpSentTo', { phone: formatMobile(mobile) })}
          <Txt size={15} weight="bold" color={c.primary} accessibilityRole="link" onPress={() => navigation.navigate('Mobile login', { mobile })}>{t('change')}</Txt>
        </Txt>
        <Txt size={14} weight="semibold" color={c.muted} style={{ marginTop: 32, marginBottom: 8 }}>{t('otpLegend')}</Txt>
        <Pressable onPress={() => input.current?.focus()} accessible={false}>
          <View style={st.otpRow}>
            {Array.from({ length: 6 }).map((_, index) => {
              const focused = index === Math.min(code.length, 5) && code.length < 6;
              return (
                <View key={index} style={[st.otpBox, focused && st.otpBoxFocus, error && st.otpBoxError]} accessible accessibilityLabel={`${t('otpDigit', { n: index + 1 })}: ${code[index] || ''}`}>
                  <Txt size={24} weight="bold">{code[index] || ''}</Txt>
                </View>
              );
            })}
          </View>
          <TextInput
            ref={input}
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            inputMode="numeric"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            autoFocus
            caretHidden
            accessibilityLabel={t('otpLegend')}
            style={st.hiddenInput}
          />
        </Pressable>
        <View style={st.smsNote}>
          <MailIcon color={c.primary} />
          <Txt size={14} weight="semibold" color={c.primary} style={{ flex: 1 }}>{t('otpReading')}</Txt>
        </View>
        <View style={{ marginTop: 16, gap: 8 }}>
          <ErrorLine>{error}</ErrorLine>
          {notice ? <Txt size={14} weight="semibold" color={c.okText}>{notice}</Txt> : null}
          {left > 0 ? (
            <Txt size={15} color={c.muted}>{t('resendIn')}<Txt size={15} weight="bold">{clock}</Txt>{t('resendInPost')}</Txt>
          ) : (
            <Pressable onPress={resend} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
              <Txt size={15} weight="bold" color={c.primary}>{t('resendNow')}</Txt>
            </Pressable>
          )}
        </View>
        <View style={{ flex: 1, minHeight: 32 }} />
        <Btn label={t('verify')} onPress={() => verify()} loading={busy} disabled={code.length !== 6} />
        <Pressable
          onPress={() => navigation.navigate('Password login')}
          accessibilityRole="button"
          hitSlop={8}
          style={{ marginTop: 18, alignSelf: 'center', paddingVertical: 8 }}
        >
          <Txt size={14} weight="semibold" color={c.primary} center>
            {t('loginWithPasswordInstead')}
          </Txt>
        </Pressable>
      </Page>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  langBadge: { width: 52, height: 52, borderRadius: 16, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' },
  langList: { marginTop: 28, gap: 12 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 76, paddingVertical: 12, paddingHorizontal: 16, borderRadius: r.card, backgroundColor: c.surface },
  langRowOn: { borderWidth: 2, borderColor: c.primary, shadowColor: c.primary, shadowOpacity: 0.12, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  langRowOff: { borderWidth: 1, borderColor: c.border },
  glyph: { width: 48, height: 48, borderRadius: r.lg, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.inputBorder, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: c.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.primary },
  phoneBox: { marginTop: 8, flexDirection: 'row', alignItems: 'center', minHeight: 60, borderRadius: r.xl, backgroundColor: c.surface, borderWidth: 2, borderColor: c.primary, overflow: 'hidden' },
  phoneBoxError: { borderColor: c.badDot },
  prefix: { height: 56, justifyContent: 'center', paddingLeft: 16, paddingRight: 14, borderRightWidth: 1, borderRightColor: c.border },
  phoneInput: { flex: 1, minWidth: 0, height: 56, paddingHorizontal: 14, fontSize: 20, fontWeight: '600', letterSpacing: 0.8, color: c.ink },
  staffLink: { marginTop: 18, minHeight: 44, justifyContent: 'center' },
  otpRow: { flexDirection: 'row', gap: 8 },
  otpBox: { flex: 1, height: 60, borderRadius: r.lg, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  otpBoxFocus: { borderWidth: 2, borderColor: c.primary },
  otpBoxError: { borderColor: c.badDot },
  hiddenInput: { position: 'absolute', opacity: 0.01, width: 1, height: 1 },
  smsNote: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: r.lg, backgroundColor: c.tint },
});
