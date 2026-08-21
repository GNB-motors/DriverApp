import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../../context/LanguageContext';
import { AppText, Button, RadioCard, BottomSheet, colors, spacing } from '../../../components/ui';

/**
 * 13 · Language — bottom sheet, each script in its own script. UI-only demo.
 * Registered as a transparentModal so it slides up over the prior screen.
 */
const LANGS = [
  { value: 'en', glyph: 'A', title: 'English', subtitle: 'English' },
  { value: 'hi', glyph: 'अ', title: 'हिन्दी', subtitle: 'Hindi' },
  { value: 'bn', glyph: 'অ', title: 'বাংলা', subtitle: 'Bengali' },
];

export default function ChooseLanguageScreen({ navigation }) {
  const { language, setLanguage } = useLanguage();
  const [selected, setSelected] = useState(language || 'en');

  const save = () => {
    setLanguage(selected);
    navigation.goBack();
  };

  return (
    <>
      <StatusBar style="light" />
      <BottomSheet visible onClose={() => navigation.goBack()}>
        <View style={styles.titleBlock}>
          <AppText variant="h2" weight="extrabold">Choose your language</AppText>
          <AppText variant="small" muted style={styles.helper}>The whole app changes, including numbers and dates.</AppText>
        </View>
        <View style={styles.list}>
          {LANGS.map((l) => (
            <RadioCard key={l.value} glyph={l.glyph} title={l.title} subtitle={l.subtitle} selected={selected === l.value} onPress={() => setSelected(l.value)} />
          ))}
        </View>
        <Button size="lg" label="Save language" onPress={save} />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  titleBlock: { gap: 4 },
  helper: {},
  list: { gap: spacing.sm },
});
