import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { theme } from '../theme/theme';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelectionScreen({ navigation }) {
  const { setLanguage } = useLanguage();

  const selectLang = (lang) => {
    setLanguage(lang);
    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {navigation && navigation.canGoBack() && (
          <TouchableOpacity
            style={{ position: 'absolute', top: 20, left: 20 }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: '#fff', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Choose your language</Text>
        <Text style={styles.subtitleHindi}>(अपनी भाषा चुनें)</Text>

        <TouchableOpacity style={styles.btn} onPress={() => selectLang('en')}>
          <Text style={styles.btnText}>English</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => selectLang('hi')}>
          <Text style={styles.btnText}>हिंदी</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  title: { ...theme.typography.large, color: '#fff', fontSize: 32, marginBottom: 8 },
  subtitle: { ...theme.typography.medium, color: '#e8f0fe', marginBottom: 4 },
  subtitleHindi: { ...theme.typography.medium, color: '#e8f0fe', marginBottom: 40 },
  btn: { backgroundColor: '#fff', width: '100%', height: 64, borderRadius: theme.components.borderRadius, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.md },
  btnText: { color: theme.colors.primary, ...theme.typography.large },
});
