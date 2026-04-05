import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import SOSButton from '../components/SOSButton';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { t, setLanguage } = useLanguage();
  const { logout } = useAuth();
  const [vehicleAssigned, setVehicleAssigned] = useState(false); 

  const startRefuel = () => {
    navigation.navigate('RefuelDetails', { vehicleAssigned });
  };

  const handleLanguageChange = () => {
    setLanguage(null); // Resets language to prompt selection screen
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingTitle}>{t('home', 'greeting')}</Text>
            <Text style={styles.greetingSub}>{t('home', 'subGreeting')}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleLanguageChange} style={styles.langBtn}>
              <Text style={styles.langBtnText}>🌐</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={[styles.langBtn, { marginLeft: 8 }]}>
              <Text style={styles.langBtnText}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.ctaButton} onPress={startRefuel}>
          <Text style={styles.ctaText}>{t('home', 'startRefuel')}</Text>
        </TouchableOpacity>
      </View>
      <SOSButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.lg, backgroundColor: theme.colors.primary, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greetingTitle: { ...theme.typography.large, color: '#fff' },
  greetingSub: { ...theme.typography.normal, color: '#e8f0fe', marginTop: 4 },
  langBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  langBtnText: { fontSize: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  content: { flex: 1, padding: theme.spacing.lg, paddingTop: 32 },
  ctaButton: { backgroundColor: theme.colors.primary, height: 60, borderRadius: theme.components.borderRadius, justifyContent: 'center', alignItems: 'center' },
  ctaText: { color: '#fff', ...theme.typography.medium },
});
