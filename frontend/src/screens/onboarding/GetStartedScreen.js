import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, colors, spacing, radius } from '../../components/ui';

/**
 * E1 · Splash / Get started — the one brand moment.
 * UI-only: buttons just navigate the onboarding flow.
 */
const FEATURES = [
  { icon: 'receipt-outline', label: 'Photograph a bill, get it confirmed' },
  { icon: 'wallet-outline', label: 'See exactly what the company owes you' },
  { icon: 'alert-circle-outline', label: 'One tap for help in an emergency' },
];

export default function GetStartedScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={colors.gradient} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.fill}>
      <StatusBar style="light" />
      <View style={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.top}>
          <LinearGradient colors={colors.avatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
            <Ionicons name="bus" size={44} color={colors.white} />
          </LinearGradient>
          <AppText variant="display" weight="extrabold" color={colors.white} center style={styles.title}>
            Highway Sahayak
          </AppText>
          <AppText variant="body" color={colors.onPrimaryMuted} center>
            The driver's companion for bills, wallet and trips.
          </AppText>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.icon} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={20} color={colors.white} />
              </View>
              <AppText variant="bodyStrong" weight="semibold" color={colors.white} style={styles.featureText}>
                {f.label}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            label="Get started"
            size="lg"
            onPress={() => navigation.navigate('OnboardingLanguage')}
            style={styles.cta}
          >
            <AppText variant="h3" weight="bold" color={colors.primary}>
              Get started
            </AppText>
          </Button>
          <Pressable onPress={() => navigation.navigate('Login')} hitSlop={10} style={styles.signin}>
            <AppText variant="body" color={colors.onPrimaryMuted}>
              Already registered?{' '}
              <AppText variant="body" weight="bold" color={colors.white}>
                Sign in
              </AppText>
            </AppText>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
  top: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { marginTop: spacing.sm },
  features: { gap: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.onPrimaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  actions: { gap: spacing.md },
  cta: { backgroundColor: colors.white },
  signin: { alignSelf: 'center', paddingVertical: spacing.sm },
});
