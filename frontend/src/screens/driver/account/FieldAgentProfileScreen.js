import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { AppText, Card, ListRow, colors, spacing, radius } from '../../../components/ui';

export default function FieldAgentProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout, user, organization } = useAuth();

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.name ||
    '';
  const agent = {
    name: fullName || '—',
    phone: user?.mobileNumber || '—',
    role: 'Field Agent',
    initials: (fullName.trim()[0] || '?').toUpperCase(),
    company: organization?.companyName || organization?.name || 'No org selected',
  };

  const settingsRows = [
    {
      icon: 'language-outline',
      title: 'Language',
      right: <AppText variant="body" muted>English</AppText>,
      onPress: () => navigation.navigate('LanguageScreen'),
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      onPress: () => navigation.navigate('Alerts'),
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & support',
      onPress: () => {},
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient header — Nova SpiceKit */}
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerContent}>
          {/* Avatar — white ring + infoBg fill */}
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <AppText weight="extrabold" color={colors.primary} style={styles.avatarText}>
                {agent.initials}
              </AppText>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="h3" weight="extrabold" color={colors.white}>{agent.name}</AppText>
            <AppText variant="small" color={colors.onPrimaryMuted}>
              {agent.phone} · {agent.role}
            </AppText>
            <AppText variant="small" color={colors.onPrimaryMuted} numberOfLines={1}>
              {agent.company}
            </AppText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Settings group */}
        <Card style={styles.group}>
          {settingsRows.map((r, i) => (
            <View key={r.title}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <ListRow
                icon={r.icon}
                title={r.title}
                right={r.right}
                onPress={r.onPress}
                showChevron={!r.right}
                style={styles.rowFlat}
              />
            </View>
          ))}
        </Card>

        {/* Log out */}
        <Pressable
          style={styles.logout}
          onPress={confirmLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Ionicons name="log-out-outline" size={19} color={colors.error} />
          <AppText variant="bodyStrong" weight="bold" color={colors.error}>Log out</AppText>
        </Pressable>

        <AppText variant="caption" muted style={styles.version}>
          Sahayak · Highway Sahayak Drive
        </AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20 },

  scroll: { paddingHorizontal: 22, paddingTop: 16, gap: 14 },

  group: { overflow: 'hidden', padding: 0 },
  rowFlat: { borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent' },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 68 },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.expiredBg,
    backgroundColor: colors.surface,
  },

  version: { textAlign: 'center', marginTop: 4 },
});
