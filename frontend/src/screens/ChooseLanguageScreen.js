import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const COLORS = {
  primary: '#429690',
  primaryDark: '#2A7C76',
  white: '#FFFFFF',
  bg: '#F5F5F5',
  textDark: '#222222',
  textMuted: '#888888',
  cardBg: 'rgba(67, 136, 131, 0.10)',
  activeBorder: '#429690',
};

export default function ChooseLanguageScreen({ navigation }) {
  const { language, setLanguage } = useLanguage();

  const currentLang = language || 'en';

  const selectLang = (lang) => {
    setLanguage(lang);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Language</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>Select your preferred language</Text>
        <Text style={styles.subtitleHindi}>अपनी पसंदीदा भाषा चुनें</Text>

        {/* Language Cards */}
        <View style={styles.cardsContainer}>
          {/* English */}
          <TouchableOpacity
            style={[
              styles.langCard,
              currentLang === 'en' && styles.langCardActive,
            ]}
            onPress={() => selectLang('en')}
          >
            <View style={styles.langIconContainer}>
              <Text style={styles.langFlag}>🇬🇧</Text>
            </View>
            <View style={styles.langInfo}>
              <Text style={styles.langName}>English</Text>
              <Text style={styles.langNative}>English</Text>
            </View>
            <View style={[
              styles.radio,
              currentLang === 'en' && styles.radioActive,
            ]}>
              {currentLang === 'en' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Hindi */}
          <TouchableOpacity
            style={[
              styles.langCard,
              currentLang === 'hi' && styles.langCardActive,
            ]}
            onPress={() => selectLang('hi')}
          >
            <View style={styles.langIconContainer}>
              <Text style={styles.langFlag}>🇮🇳</Text>
            </View>
            <View style={styles.langInfo}>
              <Text style={styles.langName}>Hindi</Text>
              <Text style={styles.langNative}>हिन्दी</Text>
            </View>
            <View style={[
              styles.radio,
              currentLang === 'hi' && styles.radioActive,
            ]}>
              {currentLang === 'hi' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
  subtitleHindi: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 32,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  langCardActive: {
    borderColor: COLORS.activeBorder,
    backgroundColor: COLORS.cardBg,
  },
  langIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  langFlag: {
    fontSize: 24,
  },
  langInfo: {
    flex: 1,
    marginLeft: 16,
  },
  langName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  langNative: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
});
