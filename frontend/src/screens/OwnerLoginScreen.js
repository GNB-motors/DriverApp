import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BrandMark from '../Assets/BrandMark';
import { AppText, Button, TextField, colors, spacing, fontFamily } from '../components/ui';

export default function OwnerLoginScreen({ navigation }) {
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const insets = useSafeAreaInsets();
  const { loginWithPassword } = useAuth();
  const { t } = useLanguage();

  const lt = (key) => t('login', key) || '';

  const handleLogin = async () => {
    if (!emailOrMobile.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await loginWithPassword(emailOrMobile.trim(), password);
    } catch (err) {
      setError(err.message || 'Invalid email/mobile or password.');
    } finally {
      setLoading(false);
    }
  };

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
            {lt('ownerSubtitle')}
          </AppText>
        </LinearGradient>

        {/* ── White card overlapping header ── */}
        <View style={[styles.card, { paddingBottom: insets.bottom + 60 }]}>
          <TextField
            label={lt('emailLabel')}
            icon="mail"
            placeholder={lt('emailPlaceholder')}
            value={emailOrMobile}
            onChangeText={setEmailOrMobile}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            style={styles.field}
          />

          <TextField
            label={lt('passwordLabel')}
            icon="lock-closed"
            placeholder={lt('passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            style={styles.field}
          />

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
            disabled={!emailOrMobile.trim() || !password || loading}
            size="lg"
            style={{ marginTop: spacing.sm }}
          />

          <Pressable
            style={styles.backLink}
            onPress={() => navigation.goBack()}
            disabled={loading}
            hitSlop={8}
          >
            <AppText variant="small" weight="bold" color={colors.primary} center>
              {lt('backToDriverLogin')}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1 },

  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  logoTile: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { marginTop: 18, fontSize: 26, letterSpacing: 1 },
  subtitle: { marginTop: 5 },

  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -22,
    paddingHorizontal: 26,
    paddingTop: 32,
  },
  field: { marginBottom: 18 },
  error: { marginBottom: 14 },
  backLink: { paddingVertical: 18 },
});
