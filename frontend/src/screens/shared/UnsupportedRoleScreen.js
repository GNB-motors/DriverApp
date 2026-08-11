/**
 * UnsupportedRoleScreen.js
 *
 * Shown to roles that exist on the backend but have no mobile experience yet —
 * currently KAM (whose call-planning screens are still to be built).
 *
 * These roles used to fall through to the driver tab set, which handed a Key
 * Account Manager a refuel FAB, a repairs tab and a vehicle picker. Saying
 * plainly that the app has nothing for them yet is more useful than a set of
 * controls that do not apply.
 */

import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AppText, Card, Button, colors, radius, spacing } from '../../components/ui';

const ROLE_LABELS = {
  KAM: 'Key Account Manager',
  ACCOUNTS: 'Accounts',
  APPROVER: 'Approver',
  OPS_EXECUTIVE: 'Ops Executive',
};

export default function UnsupportedRoleScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const role = ROLE_LABELS[user?.role] || user?.role || 'your role';

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.lg }]}>
      <StatusBar style="dark" />
      <View style={styles.centre}>
        <View style={styles.icon}>
          <Ionicons name="phone-portrait-outline" size={38} color={colors.primary} />
        </View>

        <AppText variant="h2" weight="extrabold" style={styles.title}>
          Not on mobile yet
        </AppText>
        <AppText variant="body" muted style={styles.body}>
          The app does not cover the {role} workflows yet. Everything for your role
          is available on the web portal in the meantime.
        </AppText>

        <Card variant="tinted" padding={16} style={styles.card}>
          <AppText variant="caption" weight="medium">
            You are signed in, so nothing is wrong with your account — these screens
            simply have not shipped to mobile.
          </AppText>
        </Card>

        <Button
          variant="secondary"
          icon="globe-outline"
          label="Open the web portal"
          onPress={() => Linking.openURL('https://app.gnbmotors.in').catch(() => {})}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  icon: {
    width: 76, height: 76, borderRadius: radius.full, backgroundColor: colors.tealTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
  },
  title: { textAlign: 'center', marginBottom: 10 },
  body: { textAlign: 'center', marginBottom: 22 },
  card: { marginBottom: 22 },
  button: { alignSelf: 'stretch' },
});
