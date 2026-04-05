import React from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import styles, { COLORS } from '../styles/ProfileScreen.styles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const driverName = user?.name || 'Alfredo Curtis';
  const driverHandle = user?.phoneNumber ? `+91 ${user.phoneNumber}` : '@alfredo_curtis';

  const navigateToDocs = () => {
    navigation.navigate('DocsScreen');
  };

  const navigateToLanguage = () => {
    navigation.navigate('LanguageScreen');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" />

      {/* Green top section - absolute background */}
      <View style={styles.topSection}>
        <View style={styles.circleOne} />
        <View style={styles.circleTwo} />
        <View style={styles.circleThree} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>



        {/* Avatar & Name */}
        <View style={styles.profileAvatarContainer}>
          <Image
            source={{ uri: 'https://placehold.co/150x150/png' }}
            style={styles.avatar}
          />
          <Text style={styles.nameText}>{driverName}</Text>
          <Text style={styles.usernameText}>{driverHandle}</Text>
        </View>

        {/* White bottom sheet - fills remaining space */}
        <View style={styles.bottomContent}>
          {/* Documents */}
          <TouchableOpacity style={styles.menuItem} onPress={navigateToDocs} activeOpacity={0.7}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.menuTitle}>{t('docs', 'title') || 'Documents'}</Text>
            <Ionicons name="chevron-forward" size={22} color="#333" style={styles.chevron} />
          </TouchableOpacity>

          {/* Change Language */}
          <TouchableOpacity style={styles.menuItem} onPress={navigateToLanguage} activeOpacity={0.7}>
            <View style={styles.iconContainer}>
              <Ionicons name="language-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.menuTitle}>Change Language</Text>
            <Ionicons name="chevron-forward" size={22} color="#333" style={styles.chevron} />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={logout} activeOpacity={0.7}>
            <View style={styles.iconContainer}>
              <Ionicons name="log-out-outline" size={24} color="#E74C3C" />
            </View>
            <Text style={[styles.menuTitle, styles.menuTitleDanger]}>Logout</Text>
            <Ionicons name="chevron-forward" size={22} color="#E74C3C" style={styles.chevron} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
