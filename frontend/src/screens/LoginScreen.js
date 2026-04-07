import React, { useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import Truck from '../Assets/Truck';
import styles, { COLORS } from '../styles/LoginScreen.styles';

export default function LoginScreen() {
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const currentLang = language || 'en';

  const handleLogin = async () => {
    if (!emailOrMobile.trim() || !password) {
      setError('Please enter your email/mobile and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(emailOrMobile.trim(), password);
      // Navigation handled by AppNavigator watching user state
    } catch (err) {
      const msg =
        err?.message ||
        'Login failed. Please check your credentials and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.brandName}>HIGHWAY SAHAYAK</Text>
          <Text style={styles.subtitle}>Driver Portal Login</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>

          {/* Email / Mobile Input */}
          <View style={styles.inputSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL OR MOBILE NUMBER</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter email or mobile number"
                  placeholderTextColor={COLORS.placeholder}
                  value={emailOrMobile}
                  onChangeText={setEmailOrMobile}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={[styles.inputGroup, { marginTop: 16 }]}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error ? <Text style={errorStyle}>{error}</Text> : null}

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (!emailOrMobile.trim() || !password || loading) && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={!emailOrMobile.trim() || !password || loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Help Section */}
          <View style={styles.helpSection}>
            <View style={styles.secureRow}>
              <Ionicons name="lock-closed" size={12} color={COLORS.textDisabled} />
              <Text style={styles.secureText}>SECURE DRIVER ACCESS</Text>
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
                <Text style={styles.infoLabel}>SUPPORT</Text>
                <Text style={styles.infoValue}>24/7 Active</Text>
              </View>
            </View>

            {/* Language Toggle */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="language" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.langCardContent}>
                <Text style={styles.infoLabel}>LANGUAGE</Text>
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
  marginTop: 8,
};
