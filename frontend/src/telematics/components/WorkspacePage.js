import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { AppText, colors, spacing, radius } from '../../components/ui';

export default function WorkspacePage({ navigation, title, subtitle, label, action, filters, refreshing, onRefresh, children }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  // A tab's parent stack may have history; only stack screens show a back button.
  const showBack = navigation.getState().type === 'stack' && navigation.canGoBack();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {focused && <StatusBar style="dark" />}
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={[styles.page, { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right, paddingBottom: spacing.lg + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          <View style={styles.header}>
            {showBack && (
              <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.back}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
            )}
            <View style={styles.heading}>
              <AppText variant="label" color={colors.primary} style={styles.label}>{label}</AppText>
              <AppText variant="h1" accessibilityRole="header" style={styles.title}>{title}</AppText>
              {subtitle ? <AppText variant="small" muted style={styles.subtitle}>{subtitle}</AppText> : null}
            </View>
            {action ? <View style={styles.action}>{action}</View> : null}
          </View>
          {filters}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: { flex: 1, minWidth: 0 },
  label: { fontSize: 11, lineHeight: 16, letterSpacing: 1, marginBottom: spacing.xs },
  title: { fontSize: 24, lineHeight: 30 },
  subtitle: { marginTop: spacing.xs },
  back: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  action: { flexShrink: 0, alignSelf: 'flex-start', marginTop: spacing.xs },
  page: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingTop: spacing.md, gap: spacing.md },
});
