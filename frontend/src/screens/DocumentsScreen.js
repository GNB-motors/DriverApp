import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import SOSButton from '../components/SOSButton';
import { useLanguage } from '../context/LanguageContext';

export default function DocumentsScreen() {
  const { t } = useLanguage();

  const docs = [
    { id: 1, name: t('docs', 'license'), statusKey: 'valid', valid: true },
    { id: 2, name: t('docs', 'aadhaar'), statusKey: 'valid', valid: true },
    { id: 3, name: t('docs', 'rc'), statusKey: 'expired', valid: false },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('docs', 'title')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {docs.map(doc => (
          <View key={doc.id} style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.docName}>{doc.name}</Text>
              <Text style={[styles.status, { color: doc.valid ? theme.colors.success : theme.colors.error }]}>
                {t('docs', doc.statusKey)}
              </Text>
            </View>
            <TouchableOpacity style={styles.viewBtn}>
              <Ionicons name="eye-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <SOSButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: theme.colors.border },
  title: { ...theme.typography.large, color: theme.colors.textPrimary },
  list: { padding: theme.spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.components.borderRadius, padding: theme.spacing.md, marginBottom: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardContent: { flex: 1 },
  docName: { ...theme.typography.normal, fontWeight: 'bold', color: theme.colors.textPrimary },
  status: { ...theme.typography.small, marginTop: 8, fontWeight: 'bold' },
  viewBtn: { padding: theme.spacing.sm, backgroundColor: '#e8f0fe', borderRadius: 20 },
});
