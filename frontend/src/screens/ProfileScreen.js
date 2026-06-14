import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppText, colors, spacing, radius } from '../components/ui';

const LANG_LABEL = { en: 'English', hi: 'हिन्दी', bn: 'বাংলা' };

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();

  const isFieldAgent = user?.role === 'FIELD_AGENT';
  const driverName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Driver' : 'Driver';
  const initials = (`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`).toUpperCase() || 'D';
  const rawPhone = user?.mobileNumber || user?.phoneNumber || '';
  const phoneDisplay = rawPhone ? (rawPhone.startsWith('+') ? rawPhone : `+91 ${rawPhone}`) : '';

  const accountRows = isFieldAgent ? [] : [
    { icon: 'car-sport', label: t('home', 'myVehicle') || 'My Vehicle', onPress: () => navigation.navigate('Vehicle') },
    { icon: 'person', label: t('docs', 'personalTitle') || 'Personal Documents', onPress: () => navigation.navigate('DocsScreen', { docType: 'PERSONAL' }) },
    { icon: 'document-text', label: t('docs', 'vehicleTitle') || 'Vehicle Documents', onPress: () => navigation.navigate('DocsScreen', { docType: 'VEHICLE' }) },
  ];

  const prefRows = [
    { icon: 'language', label: t('profile', 'changeLanguage') || 'Language', value: LANG_LABEL[language] || 'English', onPress: () => navigation.navigate('LanguageScreen') },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Centered gradient header */}
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <AppText variant="small" weight="bold" color={colors.white}>{t('profile', 'title')}</AppText>
        <View style={styles.avatar}>
          <AppText weight="extrabold" color={colors.white} style={styles.avatarText}>{initials}</AppText>
        </View>
        <AppText variant="h2" weight="extrabold" color={colors.white} style={{ marginTop: 14 }}>{driverName}</AppText>
        {phoneDisplay ? (
          <AppText mono weight="medium" color={colors.onPrimaryMuted} style={{ marginTop: 2 }}>{phoneDisplay}</AppText>
        ) : null}
      </LinearGradient>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {accountRows.length > 0 && (
          <>
            <AppText variant="label" muted style={styles.groupLabel}>Account</AppText>
            <SettingsGroup rows={accountRows} />
          </>
        )}

        <AppText variant="label" muted style={styles.groupLabel}>Preferences</AppText>
        <SettingsGroup rows={prefRows} />

        {/* Logout */}
        <Pressable style={styles.logout} onPress={logout}>
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
          </View>
          <AppText variant="bodyStrong" weight="bold" color="#C42820" style={{ flex: 1 }}>{t('profile', 'logout')}</AppText>
          <Ionicons name="chevron-forward" size={19} color="#E0978F" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SettingsGroup({ rows }) {
  return (
    <View style={styles.group}>
      {rows.map((r, i) => (
        <Pressable
          key={r.label}
          style={[styles.row, i < rows.length - 1 && styles.rowDivider]}
          onPress={r.onPress}
        >
          <View style={styles.rowIcon}>
            <Ionicons name={r.icon} size={20} color={colors.primary} />
          </View>
          <AppText variant="bodyStrong" weight="bold" style={{ flex: 1 }}>{r.label}</AppText>
          {r.value ? <AppText variant="small" weight="semibold" muted style={{ marginRight: 6 }}>{r.value}</AppText> : null}
          <Ionicons name="chevron-forward" size={19} color="#B7C3BF" />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: { alignItems: 'center', paddingBottom: 36, paddingHorizontal: spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  avatarText: { fontSize: 30 },

  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -18,
    paddingHorizontal: 22,
    paddingTop: 22,
  },

  groupLabel: { marginBottom: 11 },
  group: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#102824',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#F0F3F1' },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.expiredBg,
    borderRadius: 16,
    padding: 15,
  },
  logoutIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
