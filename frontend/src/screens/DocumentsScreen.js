import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import styles, { COLORS } from '../styles/DocumentsScreen.styles';

export default function DocumentsScreen({ navigation }) {
  const { t } = useLanguage();

  const docs = [
    { id: 1, name: t('docs', 'license'), statusKey: 'valid', valid: true },
    { id: 2, name: t('docs', 'aadhaar'), statusKey: 'valid', valid: true },
    { id: 3, name: t('docs', 'rc'), statusKey: 'expired', valid: false },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Decorative Green Top Section */}
      <View style={styles.topSection}>
        <View style={styles.circleOne} />
        <View style={styles.circleTwo} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header Controls */}
        <View style={styles.headerContainer}>
          {navigation.canGoBack() && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{t('docs', 'title') || 'Documents'}</Text>
        </View>

        <Text style={styles.headerSubtitle}>Manage and view all your required legal vehicle documents.</Text>

        {/* Bottom Content Sheet */}
        <View style={styles.bottomContent}>
          <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
            {docs.map(doc => (
              <TouchableOpacity key={doc.id} style={styles.docCard} activeOpacity={0.7}>
                
                {/* Document Icon */}
                <View style={styles.docIconContainer}>
                  <Ionicons name="document-text" size={24} color={COLORS.primary} />
                </View>

                {/* Info & Status */}
                <View style={styles.docInfo}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <View style={[
                    styles.statusBadge,
                    doc.valid ? styles.statusValidBg : styles.statusExpiredBg
                  ]}>
                    <Text style={[
                      styles.statusText,
                      doc.valid ? styles.statusValidText : styles.statusExpiredText
                    ]}>
                      {t('docs', doc.statusKey) || (doc.valid ? 'Valid' : 'Expired')}
                    </Text>
                  </View>
                </View>

                {/* View Action */}
                <View style={styles.viewBtn}>
                  <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
                </View>
                
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}
