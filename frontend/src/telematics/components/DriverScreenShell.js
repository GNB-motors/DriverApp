import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, colors, elevation, radius, spacing } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';

/** Driver-only Nova shell for active screens, leaving shared navigation untouched. */
export default function DriverScreenShell({
  navigation,
  title,
  subtitle,
  label = 'HIGHWAY SAHAYAK',
  action,
  refreshing,
  onRefresh,
  children,
}) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { t } = useLanguage();
  const showBack = navigation?.getState?.().type === 'stack' && navigation.canGoBack();

  return (
    <View style={styles.screen}>
      {focused && <StatusBar style="light" />}
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          refreshControl={onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
        >
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[
              styles.header,
              {
                paddingTop: insets.top + spacing.sm,
                paddingLeft: spacing.lg + insets.left,
                paddingRight: spacing.lg + insets.right,
              },
            ]}
          >
            <View style={styles.headerRow}>
              {showBack ? (
                <Pressable
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                  accessibilityLabel={t('roleDesign', 'goBack')}
                  hitSlop={8}
                  style={styles.back}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.white} />
                </Pressable>
              ) : null}
              <View style={styles.heading}>
                <AppText variant="label" color={colors.onPrimaryMuted} style={styles.label}>
                  {label}
                </AppText>
                <AppText variant="h1" accessibilityRole="header" color={colors.white} style={styles.title}>
                  {title}
                </AppText>
                {subtitle ? (
                  <AppText variant="small" color={colors.onPrimaryMuted} style={styles.subtitle}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
              {action ? <View style={styles.action}>{action}</View> : null}
            </View>
          </LinearGradient>
          <View
            style={[
              styles.sheet,
              {
                paddingLeft: spacing.lg + insets.left,
                paddingRight: spacing.lg + insets.right,
              },
            ]}
          >
            <View style={styles.sheetContent}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  scrollContent: { width: '100%', alignItems: 'center', flexGrow: 1 },
  header: {
    width: '100%',
    paddingBottom: 34,
  },
  headerRow: { width: '100%', maxWidth: 680, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.onPrimaryFaint, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0 },
  label: { fontSize: 11, lineHeight: 16, letterSpacing: 1, marginBottom: spacing.xs },
  title: { fontSize: 25, lineHeight: 32 },
  subtitle: { marginTop: spacing.xs, lineHeight: 19 },
  action: { flexShrink: 0, alignSelf: 'flex-start', marginTop: spacing.xs },
  sheet: {
    width: '100%',
    maxWidth: 680,
    flex: 1,
    alignSelf: 'center',
    marginTop: -18,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...elevation.sm,
  },
  sheetContent: { gap: spacing.md },
});
