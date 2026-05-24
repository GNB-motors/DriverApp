import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const { height } = Dimensions.get('window');

const COLORS = {
  primary: '#429690',
  primaryDark: '#2F7E79',
  white: '#FFFFFF',
  background: '#F8FAFA',
  textDark: '#222222',
  textMuted: '#888888',
  border: '#E8EEEE',
  surface: '#F1F5F5',
  cardBg: 'rgba(66, 150, 144, 0.08)',
};

export default function RepairsMenuScreen({ navigation }) {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Green Top Section */}
      <View style={styles.topSection} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>{t('repairs', 'title')}</Text>
            <Text style={styles.headerStep}>{t('repairs', 'subtitle')}</Text>
          </View>
        </View>

        {/* Menu Card */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>{t('repairs', 'whatToDo')}</Text>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('RepairLogs')}
            activeOpacity={0.8}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="list" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuButtonTitle}>{t('repairs', 'repairLogs')}</Text>
              <Text style={styles.menuButtonSub}>{t('repairs', 'repairLogsSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('AddRepair')}
            activeOpacity={0.8}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuButtonTitle}>{t('repairs', 'addRepair')}</Text>
              <Text style={styles.menuButtonSub}>{t('repairs', 'addRepairSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
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
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.28,
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerStep: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  formCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 8,
    paddingHorizontal: 22,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 20,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  menuButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  menuButtonSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
