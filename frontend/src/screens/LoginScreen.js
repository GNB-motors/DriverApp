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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import Truck from '../Assets/Truck';
import styles, { COLORS } from '../styles/LoginScreen.styles';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      passwordPlaceholder: 'Enter your password',
      loginButton: 'Login (लॉगिन करें)',
      help: 'Help / Login Issues?',
      secureAccess: 'SECURE DRIVER ACCESS',
      support: 'SUPPORT',
      supportValue: '24/7 Active',
      language: 'LANGUAGE',
    };
    return fallback[key] || '';
  };

  const handleLogin = async () => {
    if (phoneNumber.length >= 10 && password.length > 0) {
      await login(phoneNumber, password);
    }
  };

  const formatPhone = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 5) return cleaned;
    return cleaned.slice(0, 5) + ' ' + cleaned.slice(5, 10);
  };

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 10) {
      setPhoneNumber(cleaned);
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
          <View style={styles.inputSection}>
            {/* Phone Number */}
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
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{lt('passwordLabel')}</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={lt('passwordPlaceholder')}
                  placeholderTextColor={COLORS.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (phoneNumber.length < 10 || password.length === 0) &&
                  styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={phoneNumber.length < 10 || password.length === 0}
            >
              <Text style={styles.loginButtonText}>{lt('loginButton')}</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
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
                    style={[
                      styles.langOption,
                      currentLang === 'hi' && styles.langOptionActive,
                    ]}
                    onPress={() => setLanguage('hi')}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        currentLang === 'hi' && styles.langOptionTextActive,
                      ]}
                    >
                      हिन्दी
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.langOption,
                      currentLang === 'en' && styles.langOptionActive,
                    ]}
                    onPress={() => setLanguage('en')}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        currentLang === 'en' && styles.langOptionTextActive,
                      ]}
                    >
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
