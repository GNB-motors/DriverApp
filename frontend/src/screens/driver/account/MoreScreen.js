import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppText, Card, ListRow, Badge, Button, WalletHeroCard, colors, spacing } from '../../../components/ui';
import * as mock from '../../../demo/mock';

/**
 * 16 · More — index for everything else. UI-only demo.
 */
export default function MoreScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { wallet } = mock;

  const group1 = [
    { icon: 'wallet-outline', title: 'Khata & bills', right: <Badge tone="pending" label={`${wallet.pendingCount} pending`} />, onPress: () => navigation.navigate('Wallet') },
    { icon: 'cash-outline', title: 'My advances', right: <AppText mono variant="bodyStrong" weight="semibold">₹5,000</AppText>, onPress: () => navigation.navigate('Advances') },
    { icon: 'water-outline', title: 'Fuel log', onPress: () => navigation.navigate('FuelLog') },
    { icon: 'build-outline', title: 'Repairs', onPress: () => navigation.navigate('Repairs') },
    { icon: 'document-text-outline', title: 'Documents', right: <Badge tone="pending" label="1 expiring" />, onPress: () => navigation.navigate('MyDocuments') },
  ];
  const group2 = [
    { icon: 'person-outline', title: 'Profile', onPress: () => navigation.navigate('Profile') },
    { icon: 'language-outline', title: 'Language', right: <AppText variant="body" muted>English</AppText>, onPress: () => navigation.navigate('LanguageScreen') },
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
        <AppText variant="h2" weight="extrabold">More</AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <WalletHeroCard
          balance={wallet.balance}
          caption={`${wallet.pendingCount} bill pending · ${wallet.confirmedCount} confirmed`}
          onPress={() => navigation.navigate('Wallet')}
        />
        {renderGroup(group1)}
        {renderGroup(group2)}

        <Button variant="danger" size="lg" icon="alert" label="Emergency SOS" onPress={() => navigation.navigate('SOSOptions')} style={styles.sos} />

        <AppText variant="caption" mono muted center style={styles.version}>Sahayak v4.2.0 · build 812</AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 22, paddingBottom: 10 },
  scroll: { paddingHorizontal: 22, paddingTop: 6, gap: 14 },
  group: { overflow: 'hidden' },
  rowFlat: { borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent' },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 68 },
  sos: { marginTop: 4 },
  version: { marginTop: 8 },
});
