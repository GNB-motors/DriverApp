import React from 'react';
import { View, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { AppText, BackHeader, Card, colors } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import { useExperience } from './ExperienceContext';
import { experienceCopy } from './copy';
export function useExperienceCopy() { const { language } = useLanguage(); return (key) => experienceCopy[language]?.[key] || experienceCopy.en[key] || key; }
export function ActionButton({ label, onPress, disabled = false, tone = 'primary', selected = false, style }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={[styles.button, tone !== 'primary' && styles.secondary, selected && styles.selected, disabled && { opacity: 0.45 }, style]}><AppText weight="semibold" center color={tone === 'primary' ? colors.white : colors.primaryDeep}>{label}</AppText></Pressable>;
}
export function PreviewNotice() {
  const { preview, setPreview } = useExperience(); const c = useExperienceCopy();
  return <Card style={styles.notice}><AppText weight="bold" color={colors.primaryDeep}>{c(preview ? 'previewTitle' : 'notConnected')}</AppText><AppText variant="small" muted>{c(preview ? 'previewBody' : 'disconnectedBody')}</AppText><ActionButton label={c(preview ? 'exitPreview' : 'enterPreview')} tone="secondary" onPress={() => setPreview(!preview)} /></Card>;
}
export function ExperiencePage({ title, subtitle, children, navigation, notice = true }) {
  const inset = useSafeAreaInsets(); const focused = useIsFocused();
  return <View style={styles.fill}><BackHeader active={focused} title={title} subtitle={subtitle} onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined} /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingLeft: 18 + inset.left, paddingRight: 18 + inset.right, paddingBottom: inset.bottom + 30, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' }}>{notice && <PreviewNotice />}{children}</ScrollView></KeyboardAvoidingView></View>;
}
export function ChoiceRow({ label, value, onValueChange, options }) { return <View style={{ gap: 10 }}><AppText weight="semibold">{label}</AppText><View style={styles.choices}>{options.map(option => <ActionButton key={String(option.value)} label={option.label} tone="secondary" selected={option.value === value} onPress={() => onValueChange(option.value)} />)}</View></View>; }
const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: colors.background }, button: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center' }, secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, selected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.blueTint }, notice: { gap: 10, backgroundColor: colors.blueTint }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
