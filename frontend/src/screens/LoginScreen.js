import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import Truck from '../Assets/Truck';
import styles, { COLORS } from '../styles/LoginScreen.styles';

// ── Step indicator ──────────────────────────────────────────────────────
function StepDots({ step }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
      {[1, 2].map((s) => (
        <View
          key={s}
          style={{
            width: step === s ? 24 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: step === s ? COLORS.primary : COLORS.border,
          }}
        />
      ))}
    </View>
  );
}

// ── OTP input (6 boxes) ─────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputRef = useRef(null);
  const digits = value.padEnd(6, ' ').split('');

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      style={{ position: 'relative' }}
    >
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
      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
        {digits.map((d, i) => (
          <View
            key={i}
            style={{
              width: 48,
              height: 58,
              borderRadius: 14,
              backgroundColor: COLORS.inputBg,
              borderWidth: 1.5,
              borderColor: value.length === i ? COLORS.primary : COLORS.border,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.textDark }}>
              {d.trim()}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
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
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      {/* Green Top Section */}
      <View style={styles.topSection}>
        <View style={styles.circleOne} />
        <View style={styles.circleTwo} />
        <View style={styles.circleThree} />
        <View style={styles.circleFour} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Header / Branding */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Truck width={40} height={30} color={COLORS.white} />
          </View>
          <Text style={styles.brandName}>{lt('brandName')}</Text>
          <Text style={styles.subtitle}>{lt('subtitle')}</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <StepDots step={step} />

          <View style={styles.inputSection}>
            {step === 1 ? (
              /* ── Step 1: Phone Number ── */
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{lt('phoneLabel')}</Text>
                  <View style={styles.phoneInputContainer}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+91</Text>
                      <View style={styles.countryCodeDivider} />
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder={lt('phonePlaceholder')}
                      placeholderTextColor={COLORS.placeholder}
                      value={formatPhone(phoneNumber)}
                      onChangeText={handlePhoneChange}
                      keyboardType="phone-pad"
                      maxLength={11}
                      editable={!loading}
                    />
                  </View>
                </View>

                {error ? (
                  <Text style={errorStyle}>{error}</Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (phoneNumber.length < 10 || loading) && styles.loginButtonDisabled,
                  ]}
                  onPress={handleSendOtp}
                  activeOpacity={0.8}
                  disabled={phoneNumber.length < 10 || loading}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>{lt('sendOtpButton')}</Text>
                      <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              /* ── Step 2: OTP Entry ── */
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{lt('otpLabel')}</Text>
                  <Text style={otpSubtitleStyle}>
                    {lt('otpSubtitle')} {normalisedPhone}
                  </Text>
                  <View style={{ marginTop: 12 }}>
                    <OtpInput value={otp} onChange={setOtp} />
                  </View>
                </View>

                {error ? (
                  <Text style={errorStyle}>{error}</Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (otp.length < 6 || loading) && styles.loginButtonDisabled,
                  ]}
                  onPress={handleVerifyOtp}
                  activeOpacity={0.8}
                  disabled={otp.length < 6 || loading}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>{lt('verifyButton')}</Text>
                      <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    </>
                  )}
                </TouchableOpacity>

                {/* Resend + Change number */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <TouchableOpacity onPress={handleResend} disabled={loading}>
                    <Text style={linkStyle}>{lt('resend')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setStep(1); setOtp(''); setError(''); }} disabled={loading}>
                    <Text style={linkStyle}>{lt('changeNumber')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Help Section */}
          <View style={styles.helpSection}>
            <TouchableOpacity>
              <Text style={styles.helpText}>{lt('help')}</Text>
            </TouchableOpacity>
            <View style={styles.secureRow}>
              <Ionicons name="lock-closed" size={12} color={COLORS.textDisabled} />
              <Text style={styles.secureText}>{lt('secureAccess')}</Text>
            </View>
          </View>

          {/* Info Cards */}
          <View style={styles.infoCards}>
            {/* Support */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="headset" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoLabel}>{lt('support')}</Text>
                <Text style={styles.infoValue}>{lt('supportValue')}</Text>
              </View>
            </View>

            {/* Language Toggle */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="language" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.langCardContent}>
                <Text style={styles.infoLabel}>{lt('language')}</Text>
                <View style={styles.langToggle}>
                  <TouchableOpacity
                    style={[styles.langOption, currentLang === 'hi' && styles.langOptionActive]}
                    onPress={() => setLanguage('hi')}
                  >
                    <Text style={[styles.langOptionText, currentLang === 'hi' && styles.langOptionTextActive]}>
                      हिन्दी
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.langOption, currentLang === 'en' && styles.langOptionActive]}
                    onPress={() => setLanguage('en')}
                  >
                    <Text style={[styles.langOptionText, currentLang === 'en' && styles.langOptionTextActive]}>
                      English
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>GNB</Text>
            <Text style={styles.footerSub}>FLEET TECHNOLOGY GROUP</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const errorStyle = {
  fontSize: 13,
  fontWeight: '600',
  color: '#D32F2F',
  textAlign: 'center',
  paddingHorizontal: 8,
};

const otpSubtitleStyle = {
  fontSize: 13,
  color: COLORS.textMuted,
  fontWeight: '500',
  marginTop: 2,
};

const linkStyle = {
  fontSize: 13,
  fontWeight: '600',
  color: COLORS.primary,
  paddingVertical: 4,
};
