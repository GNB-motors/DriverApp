import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, AppText, colors, spacing, radius } from '../components/ui';

/**
 * ComingSoonScreen — themed placeholder for routes not yet built in the
 * prototype. Keeps navigation safe (no dead links) until the real screen lands.
 * Pass params: { title, note }.
 */
export default function ComingSoonScreen({ navigation, route }) {
  const { title = 'Coming soon', note = 'This screen is part of a later step of the prototype.' } = route.params || {};
  return (
    <View style={styles.container}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name="construct-outline" size={34} color={colors.primary} />
        </View>
        <AppText variant="h3" weight="bold" center>{title}</AppText>
        <AppText variant="body" muted center style={styles.note}>{note}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  icon: {
    width: 84, height: 84, borderRadius: radius.xl, backgroundColor: colors.tealTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  note: { marginTop: 4, maxWidth: 300 },
});
