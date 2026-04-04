import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useLanguage } from '../context/LanguageContext';

export default function SOSEmergencyActiveScreen({ navigation, route }) {
  const { t } = useLanguage();
  const isBreakdown = route.params?.type === 'breakdown';
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isBreakdown ? theme.colors.warning : theme.colors.error }]}>
      <Animated.View style={[styles.circle, { transform: [{ scale: pulseAnim }], borderColor: isBreakdown ? '#fff' : 'rgba(255,255,255,0.6)' }]}>
        <Ionicons name={isBreakdown ? 'build' : 'warning'} size={64} color="#fff" />
      </Animated.View>
      <Text style={styles.title}>{t('sos', 'activeTitle')}</Text>
      
      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.navigate('Main')}>
        <Text style={styles.cancelText}>{t('sos', 'cancelRequest')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  circle: { width: 150, height: 150, borderRadius: 75, borderWidth: 8, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.xl },
  title: { ...theme.typography.large, color: '#fff', textAlign: 'center' },
  cancelBtn: { marginTop: 60, padding: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: theme.components.borderRadius, width: '100%', alignItems: 'center' },
  cancelText: { color: '#fff', ...theme.typography.normal, fontWeight: 'bold' },
});
