import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { AppText, Button, RadioCard, colors, spacing } from '../../components/ui';

/**
 * E2 · Language — asked before anything else. UI-only.
 */
const LANGS = [
  { value: 'en', glyph: 'A', title: 'English', subtitle: 'English' },
  { value: 'hi', glyph: 'अ', title: 'हिन्दी', subtitle: 'Hindi' },
  { value: 'bn', glyph: 'অ', title: 'বাংলা', subtitle: 'Bengali' },
];

export default function OnboardingLanguageScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguage();
  const [selected, setSelected] = useState(language || 'en');

  const onContinue = () => {
    setLanguage(selected);
    navigation.navigate('PhoneNumber');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="h1" weight="extrabold">
          Choose your language
        </AppText>
        <AppText variant="body" muted style={styles.subtitle}>
          आपकी भाषा चुनें · আপনার ভাষা বেছে নিন
        </AppText>

        <View style={styles.list}>
          {LANGS.map((l) => (
            <RadioCard
              key={l.value}
              glyph={l.glyph}
              title={l.title}
              subtitle={l.subtitle}
              selected={selected === l.value}
              onPress={() => setSelected(l.value)}
            />
          ))}
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <AppText variant="small" muted style={styles.infoText}>
            You can change this later from More → Language. Numbers and dates change with it.
          </AppText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="Continue" size="lg" iconRight="arrow-forward" onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  subtitle: { marginTop: 6 },
  list: { gap: spacing.sm, marginTop: spacing.xl },
  infoRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg, alignItems: 'flex-start' },
  infoText: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
