import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { AppText, Card, ListRow, Badge, WalletHeroCard, colors, spacing, radius } from '../components/ui';
import * as mock from '../demo/mock';

/**
 * 12 · Profile — wallet card and row groups. UI-only demo.
 */
export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { driver, wallet } = mock;

  const group1 = [
    { icon: 'navigate-outline', title: 'My trips', right: <AppText mono variant="bodyStrong" weight="semibold">{driver.tripsThisMonth}</AppText>, onPress: () => navigation.navigate('Trips') },
    { icon: 'cash-outline', title: 'My advances', right: <AppText mono variant="bodyStrong" weight="semibold">₹5,000</AppText>, onPress: () => navigation.navigate('Advances') },
    { icon: 'wallet-outline', title: 'Khata & bills', right: <Badge tone="pending" label={`${wallet.pendingCount} pending`} />, onPress: () => navigation.navigate('Wallet') },
    { icon: 'document-text-outline', title: 'Documents', right: <Badge tone="pending" label="1 expiring" />, onPress: () => navigation.navigate('MyDocuments') },
  ];
  const group2 = [
    { icon: 'language-outline', title: 'Language', right: <AppText variant="body" muted>English</AppText>, onPress: () => navigation.navigate('LanguageScreen') },
    { icon: 'notifications-outline', title: 'Notifications', onPress: () => navigation.navigate('Alerts') },
    { icon: 'help-circle-outline', title: 'Help & support', onPress: () => {} },
  ];

  const renderGroup = (rows) => (
    <Card padding={0} elevated="sm" style={styles.group}>
      {rows.map((r, i) => (
        <View key={r.title}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <ListRow icon={r.icon} title={r.title} right={r.right} onPress={r.onPress} showChevron={!r.right} style={styles.rowFlat} />
        </View>
      ))}
    </Card>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <LinearGradient colors={colors.avatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          <AppText weight="extrabold" color={colors.white} style={styles.avatarText}>{driver.initials}</AppText>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" weight="extrabold">{driver.name}</AppText>
          <AppText variant="caption" mono muted>{driver.phone} · {driver.role}</AppText>
        </View>
        <Pressable style={styles.editBtn} hitSlop={8}>
          <AppText variant="small" weight="bold" color={colors.primary}>Edit</AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <WalletHeroCard balance={wallet.balance} caption={`${wallet.pendingCount} bill pending · ${wallet.confirmedCount} confirmed`} onPress={() => navigation.navigate('Wallet')} />
        {renderGroup(group1)}
        {renderGroup(group2)}

        <Pressable style={styles.logout} onPress={logout}>
          <Ionicons name="log-out-outline" size={19} color={colors.error} />
          <AppText variant="bodyStrong" weight="bold" color={colors.error}>Log out</AppText>
        </Pressable>

        <AppText variant="caption" mono muted center style={styles.version}>Sahayak v4.2.0 · build 812</AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 22, paddingBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  editBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5, borderColor: '#C7D0F7' },
  scroll: { paddingHorizontal: 22, paddingTop: 6, gap: 14 },
  group: { overflow: 'hidden' },
  rowFlat: { borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent' },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 68 },
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54,
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#F0CFCB', backgroundColor: colors.surface,
  },
  version: { marginTop: 4 },
});
