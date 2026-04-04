import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useLanguage } from '../context/LanguageContext';

export default function SOSOptionsScreen({ navigation }) {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => navigation.goBack()} />
      <View style={styles.sheet}>
        <View style={styles.dragHandle} />
        <Text style={styles.title}>{t('sos', 'title')}</Text>
        
        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: theme.colors.error, marginTop: theme.spacing.xl }]}
          onPress={() => navigation.replace('SOSEmergencyActive')}
        >
          <Ionicons name="warning" size={24} color="#fff" />
          <Text style={styles.btnText}>{t('sos', 'emergency')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: theme.colors.warning }]}
          onPress={() => navigation.replace('SOSEmergencyActive', { type: 'breakdown' })}
        >
          <Ionicons name="build" size={24} color="#fff" />
          <Text style={styles.btnText}>{t('sos', 'breakdown')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>{t('sos', 'cancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.xl, alignItems: 'center' },
  dragHandle: { width: 40, height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginBottom: theme.spacing.lg },
  title: { ...theme.typography.large, color: theme.colors.textPrimary },
  btn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: theme.components.borderRadius, marginBottom: theme.spacing.md },
  btnText: { color: '#fff', ...theme.typography.medium, marginLeft: 12 },
  cancelBtn: { marginTop: theme.spacing.md, padding: theme.spacing.sm },
  cancelText: { color: theme.colors.textSecondary, ...theme.typography.normal },
});
