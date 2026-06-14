import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { AppText, Button, colors, spacing, radius } from '../components/ui';

const LANGUAGES = [
  { code: 'en', glyph: 'A', name: 'English', native: 'English' },
  { code: 'hi', glyph: 'अ', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', glyph: 'অ', name: 'Bangla', native: 'বাংলা' },
];

export default function ChooseLanguageScreen({ navigation }) {
  const { language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(language || 'en');

  const save = () => {
    setLanguage(selected);
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" weight="extrabold">Choose Language</AppText>
      </View>

      <View style={styles.intro}>
        <AppText variant="body" weight="medium" color="#566661" center>Select your preferred language</AppText>
        <AppText variant="body" weight="medium" muted center>अपनी पसंदीदा भाषा चुनें</AppText>
      </View>

      <View style={styles.list}>
        {LANGUAGES.map((lang) => {
          const active = selected === lang.code;
          return (
            <Pressable
              key={lang.code}
              style={[styles.langCard, active ? styles.langCardActive : styles.langCardIdle]}
              onPress={() => setSelected(lang.code)}
            >
              <View style={styles.glyphTile}>
                <AppText weight="semibold" color={colors.primaryDeep} style={styles.glyph}>{lang.glyph}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="h3" weight="bold">{lang.name}</AppText>
                <AppText variant="small" muted>{lang.native}</AppText>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <View style={styles.radioInner} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button label="Save" onPress={save} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingTop: 8 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  intro: { paddingHorizontal: 22, paddingTop: 26, gap: 2 },

  list: { paddingHorizontal: 22, paddingTop: 28, gap: 14 },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    padding: 17,
    borderWidth: 1.5,
  },
  langCardIdle: { backgroundColor: colors.background, borderColor: colors.border },
  langCardActive: { backgroundColor: colors.tealTint, borderColor: colors.primary },
  glyphTile: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  glyph: { fontSize: 22 },

  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CDD7D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioInner: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.primary },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 22, paddingTop: 16 },
});
