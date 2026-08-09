import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { colors } from './index';

export default function EmptyState({ icon = 'folder-open-outline', title = 'No Data Found', message, style }) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={42} color={colors.border} />
      </View>
      <AppText variant="h3" weight="bold" style={styles.title}>{title}</AppText>
      {message && <AppText variant="body" muted style={styles.message}>{message}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  iconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { textAlign: 'center', marginBottom: 8 },
  message: { textAlign: 'center' },
});
